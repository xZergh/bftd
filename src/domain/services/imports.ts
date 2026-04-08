import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { automatedManualLinks, requirements, testCases, testCaseSteps } from "../../db/schema";
import { normalizeLabel } from "./labels";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

export async function importRequirements(
  db: Db,
  input: {
    projectId: string;
    releaseLabel?: string;
    sprintLabel?: string;
    requirements: Array<{
      externalKey?: string;
      title?: string;
      description?: string;
      releaseLabel?: string;
      sprintLabel?: string;
    }>;
  }
) {
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: Array<{ index: number; code: string; message: string; fixHint: string }> = [];
  const warnings: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < input.requirements.length; i += 1) {
    const item = input.requirements[i];
    if (!item.externalKey || !item.title) {
      skippedCount += 1;
      errors.push({
        index: i,
        code: "INVALID_IMPORT_SCHEMA",
        message: "Requirement item missing externalKey or title.",
        fixHint: "Provide both externalKey and title for each requirement item."
      });
      continue;
    }

    const existing = await db
      .select({ id: requirements.id })
      .from(requirements)
      .where(and(eq(requirements.projectId, input.projectId), eq(requirements.externalKey, item.externalKey)));

    if (existing.length === 0) {
      await db.insert(requirements).values({
        id: randomUUID(),
        projectId: input.projectId,
        externalKey: item.externalKey,
        title: item.title,
        description: item.description ?? null,
        releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
        sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
        createdAt: now(),
        updatedAt: now()
      });
      createdCount += 1;
    } else {
      await db
        .update(requirements)
        .set({
          title: item.title,
          description: item.description ?? null,
          releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
          sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
          updatedAt: now()
        })
        .where(eq(requirements.id, existing[0].id));
      updatedCount += 1;
    }
    if (!item.description) warnings.push({ index: i, message: "No description provided." });
  }

  return { createdCount, updatedCount, skippedCount, errors, warnings };
}

export async function importAutomatedFromTrr(
  db: Db,
  input: {
    projectId: string;
    releaseLabel?: string;
    sprintLabel?: string;
    automatedTests: Array<{
      internalTestCaseId?: string;
      externalId?: string;
      title?: string;
      releaseLabel?: string;
      sprintLabel?: string;
      linkedManualCaseIds?: string[];
      steps?: Array<{ order: number; name: string; expectedResult?: string; sourceStepId?: string }>;
    }>;
  }
) {
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: Array<{ index: number; code: string; message: string; fixHint: string }> = [];

  const projectCases = await db
    .select({ id: testCases.id, type: testCases.type, projectId: testCases.projectId, externalId: testCases.externalId })
    .from(testCases)
    .where(eq(testCases.projectId, input.projectId));
  const manualSet = new Set(projectCases.filter((c) => c.type === "manual").map((c) => c.id));

  for (let i = 0; i < input.automatedTests.length; i += 1) {
    const item = input.automatedTests[i];
    if (!item.internalTestCaseId && !item.externalId) {
      skippedCount += 1;
      errors.push({ index: i, code: "TRR_IMPORT_INVALID", message: "Missing automated testcase identity.", fixHint: "Provide internalTestCaseId or externalId." });
      continue;
    }
    if (!item.title) {
      skippedCount += 1;
      errors.push({ index: i, code: "TRR_IMPORT_INVALID", message: "Missing automated testcase title.", fixHint: "Provide title in TRR item." });
      continue;
    }
    if (!item.linkedManualCaseIds || item.linkedManualCaseIds.length === 0) {
      skippedCount += 1;
      errors.push({ index: i, code: "MANUAL_LINK_REQUIRED", message: "Automated testcase requires at least one manual link.", fixHint: "Provide linkedManualCaseIds with at least one valid manual testcase id." });
      continue;
    }
    const badManual = item.linkedManualCaseIds.filter((id) => !manualSet.has(id));
    if (badManual.length > 0) {
      skippedCount += 1;
      errors.push({ index: i, code: "ENTITY_NOT_FOUND", message: "One or more linked manual testcases were not found.", fixHint: "Ensure linkedManualCaseIds belong to manual testcases in the same project." });
      continue;
    }

    let automatedId: string | null = null;
    if (item.internalTestCaseId) {
      const existingByInternal = projectCases.find((c) => c.id === item.internalTestCaseId && c.type === "automated");
      if (existingByInternal) automatedId = existingByInternal.id;
    } else if (item.externalId) {
      const existingByExternal = projectCases.find((c) => c.externalId === item.externalId && c.type === "automated");
      if (existingByExternal) automatedId = existingByExternal.id;
    }

    if (!automatedId) {
      automatedId = randomUUID();
      await db.insert(testCases).values({
        id: automatedId,
        projectId: input.projectId,
        externalId: item.externalId ?? null,
        type: "automated",
        title: item.title,
        releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
        sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
        createdAt: now(),
        updatedAt: now()
      });
      createdCount += 1;
    } else {
      await db
        .update(testCases)
        .set({
          title: item.title,
          externalId: item.externalId ?? null,
          releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
          sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
          updatedAt: now()
        })
        .where(eq(testCases.id, automatedId));
      await db.delete(automatedManualLinks).where(eq(automatedManualLinks.automatedTestCaseId, automatedId));
      await db.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, automatedId));
      updatedCount += 1;
    }

    await db.insert(automatedManualLinks).values(
      item.linkedManualCaseIds.map((mid) => ({
        id: randomUUID(),
        automatedTestCaseId: automatedId!,
        manualTestCaseId: mid
      }))
    );

    const steps = (item.steps ?? [])
      .sort((a, b) => a.order - b.order)
      .map((s, idx) => ({
        id: randomUUID(),
        testCaseId: automatedId!,
        stepOrder: idx + 1,
        name: s.name,
        expectedResult: s.expectedResult ?? null,
        sourceStepId: s.sourceStepId ?? null
      }));
    if (steps.length > 0) await db.insert(testCaseSteps).values(steps);
  }

  return { createdCount, updatedCount, skippedCount, errors };
}
