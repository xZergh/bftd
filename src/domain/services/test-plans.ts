import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import { testCases, testPlanTestCaseLinks, testPlans } from "../../db/schema";
import { normalizeLabel } from "./labels";

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
  return {
    ...row,
    testCases: linkedCases.map((r) => r.testCase)
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
  await db.delete(testPlanTestCaseLinks).where(eq(testPlanTestCaseLinks.testPlanId, input.id));
  await db.delete(testPlans).where(eq(testPlans.id, input.id));
  return { success: true as const };
}

export async function linkTestPlanTestCase(db: Db, input: { testPlanId: string; testCaseId: string }) {
  const plan = await getPlanRowOrThrow(db, input.testPlanId);
  await assertTestCaseInProject(db, input.testCaseId, plan.projectId);
  const existing = await db
    .select({ id: testPlanTestCaseLinks.id })
    .from(testPlanTestCaseLinks)
    .where(
      and(eq(testPlanTestCaseLinks.testPlanId, input.testPlanId), eq(testPlanTestCaseLinks.testCaseId, input.testCaseId))
    );
  if (existing.length > 0) {
    return { linked: false as const };
  }
  await db.insert(testPlanTestCaseLinks).values({
    id: randomUUID(),
    testPlanId: input.testPlanId,
    testCaseId: input.testCaseId
  });
  return { linked: true as const };
}

export async function unlinkTestPlanTestCase(db: Db, input: { testPlanId: string; testCaseId: string }) {
  await db
    .delete(testPlanTestCaseLinks)
    .where(
      and(eq(testPlanTestCaseLinks.testPlanId, input.testPlanId), eq(testPlanTestCaseLinks.testCaseId, input.testCaseId))
    );
  return { success: true as const };
}
