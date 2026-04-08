import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import { automatedManualLinks, requirementTestCaseLinks, requirements, testCases } from "../../db/schema";
import { normalizeLabel } from "./labels";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

export async function listTestCases(
  db: Db,
  input: {
    projectId: string;
    type?: "manual" | "automated";
    releaseLabel?: string;
    sprintLabel?: string;
  }
) {
  const releaseLabel = normalizeLabel(input.releaseLabel);
  const sprintLabel = normalizeLabel(input.sprintLabel);
  return db
    .select()
    .from(testCases)
    .where(
      and(
        eq(testCases.projectId, input.projectId),
        input.type ? eq(testCases.type, input.type) : undefined,
        releaseLabel ? eq(testCases.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(testCases.sprintLabel, sprintLabel) : undefined
      )
    )
    .orderBy(asc(testCases.title));
}

export async function createManualTestCase(
  db: Db,
  input: { projectId: string; title: string; requirementIds: string[]; releaseLabel?: string; sprintLabel?: string }
) {
  if (input.requirementIds.length === 0) {
    throw new AppError(
      "REQUIREMENT_PARENT_REQUIRED",
      "Manual testcase requires at least one linked requirement.",
      "Provide at least one valid requirement id in requirementIds.",
      { requirementIds: input.requirementIds }
    );
  }

  const linkedReqs = await db.select({ id: requirements.id }).from(requirements).where(eq(requirements.projectId, input.projectId));
  const set = new Set(linkedReqs.map((r) => r.id));
  const missing = input.requirementIds.filter((id) => !set.has(id));
  if (missing.length > 0) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "One or more requirements were not found for this project.",
      "Ensure all requirementIds belong to the target project.",
      { missingRequirementIds: missing }
    );
  }

  const tc = {
    id: randomUUID(),
    projectId: input.projectId,
    externalId: null,
    type: "manual" as const,
    title: input.title,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(testCases).values(tc);
  await db.insert(requirementTestCaseLinks).values(
    input.requirementIds.map((rid) => ({ id: randomUUID(), requirementId: rid, manualTestCaseId: tc.id }))
  );
  return tc;
}

export async function createAutomatedTestCase(
  db: Db,
  input: { projectId: string; title: string; manualTestCaseIds: string[]; releaseLabel?: string; sprintLabel?: string }
) {
  if (input.manualTestCaseIds.length === 0) {
    throw new AppError(
      "MANUAL_LINK_REQUIRED",
      "Automated testcase requires at least one linked manual testcase.",
      "Provide at least one valid manual test id in manualTestCaseIds.",
      { manualTestCaseIds: input.manualTestCaseIds }
    );
  }

  const manuals = await db.select({ id: testCases.id, type: testCases.type }).from(testCases).where(eq(testCases.projectId, input.projectId));
  const manualIds = new Set(manuals.filter((m) => m.type === "manual").map((m) => m.id));
  const missing = input.manualTestCaseIds.filter((id) => !manualIds.has(id));
  if (missing.length > 0) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "One or more manual testcases were not found for this project.",
      "Ensure all manualTestCaseIds point to manual tests in the same project.",
      { missingManualTestCaseIds: missing }
    );
  }

  const tc = {
    id: randomUUID(),
    projectId: input.projectId,
    externalId: null,
    type: "automated" as const,
    title: input.title,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(testCases).values(tc);
  await db.insert(automatedManualLinks).values(
    input.manualTestCaseIds.map((mid) => ({ id: randomUUID(), automatedTestCaseId: tc.id, manualTestCaseId: mid }))
  );
  return tc;
}
