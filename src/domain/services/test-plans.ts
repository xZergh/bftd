import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import { automatedManualLinks, testCases, testPlanPlanLinks, testPlanTestCaseLinks, testPlans } from "../../db/schema";
import { normalizeLabel } from "./labels";
import {
  computeTestPlanMemberStats,
  listChildTestPlans,
  wouldCreatePlanCycle,
  type TestPlanMemberStats
} from "./test-plan-flatten";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

async function getPlanRowOrThrow(db: Db, planId: string) {
  const rows = await db.select().from(testPlans).where(eq(testPlans.id, planId));
  if (rows.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Test plan not found.", "Use a valid testPlanId.", { testPlanId: planId });
  }
  return rows[0];
}

async function assertTestCaseInProject(db: Db, testCaseId: string, projectId: string) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, testCaseId));
  if (rows.length === 0 || rows[0].projectId !== projectId || rows[0].isDeleted) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Test case not found in plan project scope.",
      "Use an active test case from the same project as the test plan.",
      { testCaseId, projectId }
    );
  }
}

export async function createTestPlan(
  db: Db,
  input: {
    projectId: string;
    name: string;
    description?: string;
    releaseLabel?: string;
    sprintLabel?: string;
  }
) {
  const row = {
    id: randomUUID(),
    projectId: input.projectId,
    name: input.name,
    description: input.description ?? null,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(testPlans).values(row);
  return row;
}

export async function listTestPlans(db: Db, input: { projectId: string }) {
  const rows = await db.select().from(testPlans).where(eq(testPlans.projectId, input.projectId));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getTestPlan(db: Db, input: { id: string; projectId?: string }) {
  const rows = await db.select().from(testPlans).where(eq(testPlans.id, input.id));
  if (rows.length === 0) return null;
  const row = rows[0];
  if (input.projectId && row.projectId !== input.projectId) return null;
  const linkedCases = await db
    .select({ testCase: testCases })
    .from(testPlanTestCaseLinks)
    .innerJoin(testCases, eq(testPlanTestCaseLinks.testCaseId, testCases.id))
    .where(eq(testPlanTestCaseLinks.testPlanId, row.id));
  const childPlansRaw = await listChildTestPlans(db, row.id);
  const childPlans = await Promise.all(
    childPlansRaw.map(async (child) => ({
      ...child,
      memberStats: await computeTestPlanMemberStats(db, child.id)
    }))
  );
  const memberStats = await computeTestPlanMemberStats(db, row.id);
  return {
    ...row,
    testCases: linkedCases.map((r) => r.testCase),
    childPlans,
    memberStats
  };
}

export async function updateTestPlan(
  db: Db,
  input: {
    id: string;
    name?: string;
    description?: string | null;
    releaseLabel?: string | null;
    sprintLabel?: string | null;
  }
) {
  const existing = await getPlanRowOrThrow(db, input.id);
  const patch: Partial<typeof existing> = { updatedAt: now() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) patch.description = input.description;
  if (input.releaseLabel !== undefined) patch.releaseLabel = normalizeLabel(input.releaseLabel ?? undefined);
  if (input.sprintLabel !== undefined) patch.sprintLabel = normalizeLabel(input.sprintLabel ?? undefined);
  await db.update(testPlans).set(patch).where(eq(testPlans.id, input.id));
  return getTestPlan(db, { id: input.id });
}

export async function deleteTestPlan(db: Db, input: { id: string }) {
  await getPlanRowOrThrow(db, input.id);
  await db.delete(testPlanPlanLinks).where(eq(testPlanPlanLinks.parentTestPlanId, input.id));
  await db.delete(testPlanPlanLinks).where(eq(testPlanPlanLinks.childTestPlanId, input.id));
  await db.delete(testPlanTestCaseLinks).where(eq(testPlanTestCaseLinks.testPlanId, input.id));
  await db.delete(testPlans).where(eq(testPlans.id, input.id));
  return { success: true as const };
}

async function automatedIdsForManual(db: Db, manualTestCaseId: string): Promise<string[]> {
  const rows = await db
    .select({ id: automatedManualLinks.automatedTestCaseId })
    .from(automatedManualLinks)
    .where(eq(automatedManualLinks.manualTestCaseId, manualTestCaseId));
  return rows.map((r) => r.id);
}

async function insertPlanTestCaseLink(db: Db, testPlanId: string, testCaseId: string): Promise<boolean> {
  const existing = await db
    .select({ id: testPlanTestCaseLinks.id })
    .from(testPlanTestCaseLinks)
    .where(and(eq(testPlanTestCaseLinks.testPlanId, testPlanId), eq(testPlanTestCaseLinks.testCaseId, testCaseId)));
  if (existing.length > 0) {
    return false;
  }
  await db.insert(testPlanTestCaseLinks).values({
    id: randomUUID(),
    testPlanId,
    testCaseId
  });
  return true;
}

export async function linkTestPlanTestCase(db: Db, input: { testPlanId: string; testCaseId: string }) {
  const plan = await getPlanRowOrThrow(db, input.testPlanId);
  await assertTestCaseInProject(db, input.testCaseId, plan.projectId);
  const tcRows = await db.select().from(testCases).where(eq(testCases.id, input.testCaseId));
  const tc = tcRows[0];
  const linked = await insertPlanTestCaseLink(db, input.testPlanId, input.testCaseId);
  if (tc?.type === "manual") {
    for (const autoId of await automatedIdsForManual(db, input.testCaseId)) {
      await insertPlanTestCaseLink(db, input.testPlanId, autoId);
    }
  }
  return { linked };
}

export async function unlinkTestPlanTestCase(db: Db, input: { testPlanId: string; testCaseId: string }) {
  const tcRows = await db.select().from(testCases).where(eq(testCases.id, input.testCaseId));
  const tc = tcRows[0];
  if (tc?.type === "manual") {
    for (const autoId of await automatedIdsForManual(db, input.testCaseId)) {
      await db
        .delete(testPlanTestCaseLinks)
        .where(
          and(eq(testPlanTestCaseLinks.testPlanId, input.testPlanId), eq(testPlanTestCaseLinks.testCaseId, autoId))
        );
    }
  }
  await db
    .delete(testPlanTestCaseLinks)
    .where(
      and(eq(testPlanTestCaseLinks.testPlanId, input.testPlanId), eq(testPlanTestCaseLinks.testCaseId, input.testCaseId))
    );
  return { success: true as const };
}

export async function linkTestPlanPlan(db: Db, input: { parentTestPlanId: string; childTestPlanId: string }) {
  const parent = await getPlanRowOrThrow(db, input.parentTestPlanId);
  const child = await getPlanRowOrThrow(db, input.childTestPlanId);
  if (parent.projectId !== child.projectId) {
    throw new AppError(
      "PLAN_PROJECT_MISMATCH",
      "Sub-plans must belong to the same project.",
      "Link test plans from the same project only.",
      { parentTestPlanId: input.parentTestPlanId, childTestPlanId: input.childTestPlanId }
    );
  }
  if (await wouldCreatePlanCycle(db, input.parentTestPlanId, input.childTestPlanId)) {
    throw new AppError(
      "PLAN_CYCLE",
      "Linking this sub-plan would create a cycle.",
      "Choose a different sub-plan or remove an existing link in the chain.",
      { parentTestPlanId: input.parentTestPlanId, childTestPlanId: input.childTestPlanId }
    );
  }
  const existing = await db
    .select({ id: testPlanPlanLinks.id })
    .from(testPlanPlanLinks)
    .where(
      and(
        eq(testPlanPlanLinks.parentTestPlanId, input.parentTestPlanId),
        eq(testPlanPlanLinks.childTestPlanId, input.childTestPlanId)
      )
    );
  if (existing.length > 0) {
    return { linked: false as const };
  }
  const siblings = await db
    .select({ sortOrder: testPlanPlanLinks.sortOrder })
    .from(testPlanPlanLinks)
    .where(eq(testPlanPlanLinks.parentTestPlanId, input.parentTestPlanId));
  const maxSort = siblings.reduce((max, row) => Math.max(max, row.sortOrder ?? 0), -1);
  await db.insert(testPlanPlanLinks).values({
    id: randomUUID(),
    parentTestPlanId: input.parentTestPlanId,
    childTestPlanId: input.childTestPlanId,
    sortOrder: maxSort + 1
  });
  await db.update(testPlans).set({ updatedAt: now() }).where(eq(testPlans.id, input.parentTestPlanId));
  return { linked: true as const };
}

export async function unlinkTestPlanPlan(db: Db, input: { parentTestPlanId: string; childTestPlanId: string }) {
  await db
    .delete(testPlanPlanLinks)
    .where(
      and(
        eq(testPlanPlanLinks.parentTestPlanId, input.parentTestPlanId),
        eq(testPlanPlanLinks.childTestPlanId, input.childTestPlanId)
      )
    );
  await db.update(testPlans).set({ updatedAt: now() }).where(eq(testPlans.id, input.parentTestPlanId));
  return { success: true as const };
}

export type { TestPlanMemberStats };
export { flattenTestPlanMembers, computeTestPlanMemberStats, listChildTestPlans };
