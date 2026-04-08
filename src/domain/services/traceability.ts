import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import { automatedManualLinks, requirementTestCaseLinks, requirements, testCases } from "../../db/schema";
import { appendTestCaseVersionSync } from "./versioning";

type Db = ReturnType<typeof import("../../db/client").createDb>;

async function assertRequirementProject(db: Db, requirementId: string, projectId: string) {
  const rows = await db.select().from(requirements).where(eq(requirements.id, requirementId));
  if (rows.length === 0 || rows[0].projectId !== projectId) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Requirement not found in project.",
      "Use requirement and manual testcase ids from the same project.",
      { requirementId, projectId }
    );
  }
}

async function assertManualInProject(db: Db, manualTestCaseId: string, projectId: string) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, manualTestCaseId));
  if (rows.length === 0 || rows[0].projectId !== projectId || rows[0].type !== "manual" || rows[0].isDeleted) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Manual testcase not found in project.",
      "Use an active manual testcase id in the target project.",
      { manualTestCaseId, projectId }
    );
  }
}

async function assertAutomatedInProject(db: Db, automatedTestCaseId: string, projectId: string) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, automatedTestCaseId));
  if (rows.length === 0 || rows[0].projectId !== projectId || rows[0].type !== "automated" || rows[0].isDeleted) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Automated testcase not found in project.",
      "Use an active automated testcase id in the target project.",
      { automatedTestCaseId, projectId }
    );
  }
}

export async function linkRequirementManualTestCase(
  db: Db,
  input: { projectId: string; requirementId: string; manualTestCaseId: string }
) {
  await assertRequirementProject(db, input.requirementId, input.projectId);
  await assertManualInProject(db, input.manualTestCaseId, input.projectId);
  const existing = await db
    .select({ id: requirementTestCaseLinks.id })
    .from(requirementTestCaseLinks)
    .where(
      and(
        eq(requirementTestCaseLinks.requirementId, input.requirementId),
        eq(requirementTestCaseLinks.manualTestCaseId, input.manualTestCaseId)
      )
    );
  if (existing.length > 0) {
    return { linked: false as const };
  }
  await db.insert(requirementTestCaseLinks).values({
    id: randomUUID(),
    requirementId: input.requirementId,
    manualTestCaseId: input.manualTestCaseId
  });
  appendTestCaseVersionSync(db, input.manualTestCaseId);
  return { linked: true as const };
}

export async function unlinkRequirementManualTestCase(
  db: Db,
  input: { requirementId: string; manualTestCaseId: string }
) {
  await db
    .delete(requirementTestCaseLinks)
    .where(
      and(
        eq(requirementTestCaseLinks.requirementId, input.requirementId),
        eq(requirementTestCaseLinks.manualTestCaseId, input.manualTestCaseId)
      )
    );
  appendTestCaseVersionSync(db, input.manualTestCaseId);
  return { success: true as const };
}

export async function linkAutomatedManualTestCase(
  db: Db,
  input: { projectId: string; automatedTestCaseId: string; manualTestCaseId: string }
) {
  await assertAutomatedInProject(db, input.automatedTestCaseId, input.projectId);
  await assertManualInProject(db, input.manualTestCaseId, input.projectId);
  const existing = await db
    .select({ id: automatedManualLinks.id })
    .from(automatedManualLinks)
    .where(
      and(
        eq(automatedManualLinks.automatedTestCaseId, input.automatedTestCaseId),
        eq(automatedManualLinks.manualTestCaseId, input.manualTestCaseId)
      )
    );
  if (existing.length > 0) {
    return { linked: false as const };
  }
  await db.insert(automatedManualLinks).values({
    id: randomUUID(),
    automatedTestCaseId: input.automatedTestCaseId,
    manualTestCaseId: input.manualTestCaseId
  });
  appendTestCaseVersionSync(db, input.automatedTestCaseId);
  return { linked: true as const };
}

export async function unlinkAutomatedManualTestCase(
  db: Db,
  input: { automatedTestCaseId: string; manualTestCaseId: string }
) {
  await db
    .delete(automatedManualLinks)
    .where(
      and(
        eq(automatedManualLinks.automatedTestCaseId, input.automatedTestCaseId),
        eq(automatedManualLinks.manualTestCaseId, input.manualTestCaseId)
      )
    );
  appendTestCaseVersionSync(db, input.automatedTestCaseId);
  return { success: true as const };
}
