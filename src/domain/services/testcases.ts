import { and, asc, count, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import {
  automatedManualLinks,
  requirementTestCaseLinks,
  requirements,
  testCases,
  testCaseSteps,
  testResults
} from "../../db/schema";
import { normalizeLabel } from "./labels";
import { assertEpicInProject, getEpic, getEpicsByIds } from "./epics";
import { appendTestCaseVersion } from "./versioning";
import {
  defaultAutomationStatusForType,
  isTestCaseAutomationStatus,
  type TestCaseAutomationStatus
} from "../automationStatus";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

type TestCaseContentInput = {
  externalKey?: string | null;
  description?: string | null;
  preconditions?: string | null;
  notes?: string | null;
  automationNotes?: string | null;
  automationStatus?: string | null;
};

function normalizeAutomationStatusField(
  value: string | null | undefined,
  type: "manual" | "automated",
  explicitDefault?: TestCaseAutomationStatus
): TestCaseAutomationStatus {
  if (value === undefined || value === null || value.trim() === "") {
    return explicitDefault ?? defaultAutomationStatusForType(type);
  }
  const trimmed = value.trim();
  if (!isTestCaseAutomationStatus(trimmed)) {
    throw new AppError(
      "INVALID_AUTOMATION_STATUS",
      "Automation status is not valid.",
      `Use one of: not_automated, automation_required, in_progress, automated, not_automatable.`,
      { automationStatus: trimmed }
    );
  }
  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function assertTestCaseExternalKeyAvailable(
  db: Db,
  projectId: string,
  externalKey: string | null | undefined,
  excludeId?: string
) {
  const normalized = normalizeOptionalText(externalKey);
  if (normalized === undefined || normalized === null) {
    return;
  }
  const rows = await db
    .select({ id: testCases.id })
    .from(testCases)
    .where(and(eq(testCases.projectId, projectId), eq(testCases.externalKey, normalized)));
  if (rows.some((r) => r.id !== excludeId)) {
    throw new AppError(
      "TEST_CASE_KEY_CONFLICT",
      "Test case key already exists in this project.",
      "Choose a different externalKey for the test case.",
      { externalKey: normalized, projectId }
    );
  }
}

function applyContentPatch(patch: Record<string, unknown>, input: TestCaseContentInput) {
  if (input.externalKey !== undefined) {
    patch.externalKey = normalizeOptionalText(input.externalKey) ?? null;
  }
  if (input.description !== undefined) {
    patch.description = normalizeOptionalText(input.description) ?? null;
  }
  if (input.preconditions !== undefined) {
    patch.preconditions = normalizeOptionalText(input.preconditions) ?? null;
  }
  if (input.notes !== undefined) {
    patch.notes = normalizeOptionalText(input.notes) ?? null;
  }
  if (input.automationNotes !== undefined) {
    patch.automationNotes = normalizeOptionalText(input.automationNotes) ?? null;
  }
}

async function requirementLinkCountsByManualCase(db: Db, manualIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (manualIds.length === 0) {
    return out;
  }
  for (const id of manualIds) {
    out.set(id, 0);
  }
  const rows = await db
    .select({ manualTestCaseId: requirementTestCaseLinks.manualTestCaseId, c: count() })
    .from(requirementTestCaseLinks)
    .where(inArray(requirementTestCaseLinks.manualTestCaseId, manualIds))
    .groupBy(requirementTestCaseLinks.manualTestCaseId);
  for (const row of rows) {
    out.set(row.manualTestCaseId, Number(row.c));
  }
  return out;
}

async function manualLinkCountsByAutomatedCase(db: Db, automatedIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (automatedIds.length === 0) {
    return out;
  }
  for (const id of automatedIds) {
    out.set(id, 0);
  }
  const rows = await db
    .select({ automatedTestCaseId: automatedManualLinks.automatedTestCaseId, c: count() })
    .from(automatedManualLinks)
    .where(inArray(automatedManualLinks.automatedTestCaseId, automatedIds))
    .groupBy(automatedManualLinks.automatedTestCaseId);
  for (const row of rows) {
    out.set(row.automatedTestCaseId, Number(row.c));
  }
  return out;
}

export async function createManualTestCase(
  db: Db,
  input: {
    projectId: string;
    title: string;
    requirementIds: string[];
    steps: Array<{ name: string; expectedResult?: string }>;
    releaseLabel?: string;
    sprintLabel?: string;
    epicId?: string;
  } & TestCaseContentInput
) {
  if (!input.steps || input.steps.length === 0) {
    throw new AppError(
      "STEPS_REQUIRED",
      "Manual testcase requires at least one step.",
      "Provide at least one step with a name (and optional expectedResult).",
      {}
    );
  }
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

  await assertEpicInProject(db, input.projectId, input.epicId);
  await assertTestCaseExternalKeyAvailable(db, input.projectId, input.externalKey);

  const tc = {
    id: randomUUID(),
    projectId: input.projectId,
    externalId: null as string | null,
    externalKey: normalizeOptionalText(input.externalKey) ?? null,
    description: normalizeOptionalText(input.description) ?? null,
    preconditions: normalizeOptionalText(input.preconditions) ?? null,
    notes: normalizeOptionalText(input.notes) ?? null,
    automationNotes: normalizeOptionalText(input.automationNotes) ?? null,
    automationStatus: normalizeAutomationStatusField(input.automationStatus, "manual"),
    type: "manual" as const,
    title: input.title,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    epicId: input.epicId ?? null,
    isDeleted: false,
    deletedAt: null as Date | null,
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(testCases).values(tc);
  await db.insert(requirementTestCaseLinks).values(
    input.requirementIds.map((rid) => ({ id: randomUUID(), requirementId: rid, manualTestCaseId: tc.id }))
  );
  await db.insert(testCaseSteps).values(
    input.steps.map((s, idx) => ({
      id: randomUUID(),
      testCaseId: tc.id,
      stepOrder: idx + 1,
      name: s.name,
      expectedResult: s.expectedResult ?? null,
      sourceStepId: null as string | null,
      parentStepId: null as string | null,
      metaJson: null as string | null
    }))
  );
  await appendTestCaseVersion(db, tc.id);
  return tc;
}

export async function createAutomatedTestCase(
  db: Db,
  input: {
    projectId: string;
    title: string;
    manualTestCaseIds: string[];
    releaseLabel?: string;
    sprintLabel?: string;
    epicId?: string;
  } & TestCaseContentInput
) {
  if (input.manualTestCaseIds.length === 0) {
    throw new AppError(
      "MANUAL_LINK_REQUIRED",
      "Automated testcase requires at least one linked manual testcase.",
      "Provide at least one valid manual test id in manualTestCaseIds.",
      { manualTestCaseIds: input.manualTestCaseIds }
    );
  }

  const manuals = await db
    .select({ id: testCases.id, type: testCases.type, isDeleted: testCases.isDeleted })
    .from(testCases)
    .where(eq(testCases.projectId, input.projectId));
  const manualIds = new Set(
    manuals.filter((m) => m.type === "manual" && !m.isDeleted).map((m) => m.id)
  );
  const missing = input.manualTestCaseIds.filter((id) => !manualIds.has(id));
  if (missing.length > 0) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "One or more manual testcases were not found for this project.",
      "Ensure all manualTestCaseIds point to active manual tests in the same project.",
      { missingManualTestCaseIds: missing }
    );
  }

  await assertEpicInProject(db, input.projectId, input.epicId);
  await assertTestCaseExternalKeyAvailable(db, input.projectId, input.externalKey);

  const tc = {
    id: randomUUID(),
    projectId: input.projectId,
    externalId: null as string | null,
    externalKey: normalizeOptionalText(input.externalKey) ?? null,
    description: normalizeOptionalText(input.description) ?? null,
    preconditions: normalizeOptionalText(input.preconditions) ?? null,
    notes: normalizeOptionalText(input.notes) ?? null,
    automationNotes: normalizeOptionalText(input.automationNotes) ?? null,
    automationStatus: normalizeAutomationStatusField(input.automationStatus, "automated"),
    type: "automated" as const,
    title: input.title,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    epicId: input.epicId ?? null,
    isDeleted: false,
    deletedAt: null as Date | null,
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(testCases).values(tc);
  await db.insert(automatedManualLinks).values(
    input.manualTestCaseIds.map((mid) => ({ id: randomUUID(), automatedTestCaseId: tc.id, manualTestCaseId: mid }))
  );
  await appendTestCaseVersion(db, tc.id);
  return tc;
}

export async function listTestCases(
  db: Db,
  input: { projectId: string; type?: "manual" | "automated"; includeDeleted?: boolean; requirementId?: string }
) {
  let linkedManualIds: Set<string> | null = null;
  if (input.requirementId) {
    const links = await db
      .select({ manualTestCaseId: requirementTestCaseLinks.manualTestCaseId })
      .from(requirementTestCaseLinks)
      .where(eq(requirementTestCaseLinks.requirementId, input.requirementId));
    linkedManualIds = new Set(links.map((l) => l.manualTestCaseId));
  }

  const rows = await db
    .select()
    .from(testCases)
    .where(
      and(
        eq(testCases.projectId, input.projectId),
        input.type ? eq(testCases.type, input.type) : undefined,
        input.includeDeleted ? undefined : eq(testCases.isDeleted, false)
      )
    );
  let sorted = rows.sort((a, b) => a.title.localeCompare(b.title));
  if (linkedManualIds !== null) {
    sorted = sorted.filter((r) => r.type === "manual" && linkedManualIds!.has(r.id));
  }
  const manualIds = sorted.filter((r) => r.type === "manual").map((r) => r.id);
  const automatedIds = sorted.filter((r) => r.type === "automated").map((r) => r.id);
  const reqCounts = await requirementLinkCountsByManualCase(db, manualIds);
  const manCounts = await manualLinkCountsByAutomatedCase(db, automatedIds);
  const epicIds = [...new Set(sorted.map((r) => r.epicId).filter((id): id is string => id != null && id !== ""))];
  const epicMap = await getEpicsByIds(db, epicIds);
  return sorted.map((r) => ({
    ...r,
    linkedRequirementCount: r.type === "manual" ? (reqCounts.get(r.id) ?? 0) : 0,
    linkedManualTestCaseCount: r.type === "automated" ? (manCounts.get(r.id) ?? 0) : 0,
    epic: r.epicId ? (epicMap.get(r.epicId) ?? null) : null
  }));
}

export async function getTestCase(db: Db, input: { id: string; projectId?: string; includeDeleted?: boolean }) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, input.id));
  if (rows.length === 0) return null;
  const tc = rows[0];
  if (input.projectId && tc.projectId !== input.projectId) return null;
  if (!input.includeDeleted && tc.isDeleted) return null;
  const steps = await db
    .select()
    .from(testCaseSteps)
    .where(eq(testCaseSteps.testCaseId, tc.id))
    .orderBy(asc(testCaseSteps.stepOrder));
  const epic = tc.epicId ? await getEpic(db, { id: tc.epicId, projectId: tc.projectId }) : null;
  return { ...tc, steps, epic };
}

export async function updateManualTestCase(
  db: Db,
  input: {
    id: string;
    title?: string;
    releaseLabel?: string | null;
    sprintLabel?: string | null;
    steps?: Array<{ name: string; expectedResult?: string }>;
    epicId?: string | null;
  } & TestCaseContentInput
) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, input.id));
  if (rows.length === 0 || rows[0].type !== "manual") {
    throw new AppError("ENTITY_NOT_FOUND", "Manual testcase not found.", "Use a valid manual testcase id.", { id: input.id });
  }
  if (rows[0].isDeleted) {
    throw new AppError("ENTITY_NOT_FOUND", "Test case is deleted.", "Restore the testcase before updating.", { id: input.id });
  }
  if (input.steps !== undefined && input.steps.length === 0) {
    throw new AppError("STEPS_REQUIRED", "Manual testcase must keep at least one step.", "Provide one or more steps.", {});
  }
  if (input.epicId !== undefined) {
    await assertEpicInProject(db, rows[0].projectId, input.epicId ?? undefined);
  }
  if (input.externalKey !== undefined) {
    await assertTestCaseExternalKeyAvailable(db, rows[0].projectId, input.externalKey, input.id);
  }
  const patch: Record<string, unknown> = { updatedAt: now() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.releaseLabel !== undefined) patch.releaseLabel = normalizeLabel(input.releaseLabel ?? undefined);
  if (input.sprintLabel !== undefined) patch.sprintLabel = normalizeLabel(input.sprintLabel ?? undefined);
  if (input.epicId !== undefined) patch.epicId = input.epicId;
  applyContentPatch(patch, input);
  if (input.automationStatus !== undefined) {
    patch.automationStatus = normalizeAutomationStatusField(input.automationStatus, "manual");
  }
  await db.update(testCases).set(patch).where(eq(testCases.id, input.id));
  if (input.steps) {
    await db.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, input.id));
    await db.insert(testCaseSteps).values(
      input.steps.map((s, idx) => ({
        id: randomUUID(),
        testCaseId: input.id,
        stepOrder: idx + 1,
        name: s.name,
        expectedResult: s.expectedResult ?? null,
        sourceStepId: null as string | null,
        parentStepId: null as string | null,
        metaJson: null as string | null
      }))
    );
  }
  await appendTestCaseVersion(db, input.id);
  return getTestCase(db, { id: input.id, includeDeleted: true });
}

export async function updateAutomatedTestCase(
  db: Db,
  input: {
    id: string;
    title?: string;
    externalId?: string | null;
    releaseLabel?: string | null;
    sprintLabel?: string | null;
    manualTestCaseIds?: string[];
    epicId?: string | null;
  } & TestCaseContentInput
) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, input.id));
  if (rows.length === 0 || rows[0].type !== "automated") {
    throw new AppError("ENTITY_NOT_FOUND", "Automated testcase not found.", "Use a valid automated testcase id.", { id: input.id });
  }
  if (rows[0].isDeleted) {
    throw new AppError("ENTITY_NOT_FOUND", "Test case is deleted.", "Restore the testcase before updating.", { id: input.id });
  }
  if (input.epicId !== undefined) {
    await assertEpicInProject(db, rows[0].projectId, input.epicId ?? undefined);
  }
  if (input.externalKey !== undefined) {
    await assertTestCaseExternalKeyAvailable(db, rows[0].projectId, input.externalKey, input.id);
  }
  const patch: Record<string, unknown> = { updatedAt: now() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.externalId !== undefined) patch.externalId = input.externalId;
  if (input.releaseLabel !== undefined) patch.releaseLabel = normalizeLabel(input.releaseLabel ?? undefined);
  if (input.sprintLabel !== undefined) patch.sprintLabel = normalizeLabel(input.sprintLabel ?? undefined);
  if (input.epicId !== undefined) patch.epicId = input.epicId;
  applyContentPatch(patch, input);
  if (input.automationStatus !== undefined) {
    patch.automationStatus = normalizeAutomationStatusField(input.automationStatus, "automated");
  }
  await db.update(testCases).set(patch).where(eq(testCases.id, input.id));

  if (input.manualTestCaseIds) {
    if (input.manualTestCaseIds.length === 0) {
      throw new AppError("MANUAL_LINK_REQUIRED", "Automated testcase requires at least one manual link.", "Provide manualTestCaseIds.", {});
    }
    const manuals = await db
      .select({ id: testCases.id, type: testCases.type, isDeleted: testCases.isDeleted })
      .from(testCases)
      .where(eq(testCases.projectId, rows[0].projectId));
    const manualIds = new Set(
      manuals.filter((m) => m.type === "manual" && !m.isDeleted).map((m) => m.id)
    );
    const missing = input.manualTestCaseIds.filter((id) => !manualIds.has(id));
    if (missing.length > 0) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "One or more manual testcases were not found for this project.",
        "Ensure manualTestCaseIds reference active manual tests in the same project.",
        { missingManualTestCaseIds: missing }
      );
    }
    await db.delete(automatedManualLinks).where(eq(automatedManualLinks.automatedTestCaseId, input.id));
    await db.insert(automatedManualLinks).values(
      input.manualTestCaseIds.map((mid) => ({
        id: randomUUID(),
        automatedTestCaseId: input.id,
        manualTestCaseId: mid
      }))
    );
  }
  await appendTestCaseVersion(db, input.id);
  return getTestCase(db, { id: input.id, includeDeleted: true });
}

export async function deleteManualTestCase(db: Db, input: { id: string }) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, input.id));
  if (rows.length === 0 || rows[0].type !== "manual") {
    throw new AppError("ENTITY_NOT_FOUND", "Manual testcase not found.", "Use a valid manual testcase id.", { id: input.id });
  }
  const autoLinks = await db
    .select({ id: automatedManualLinks.id })
    .from(automatedManualLinks)
    .where(eq(automatedManualLinks.manualTestCaseId, input.id));
  if (autoLinks.length > 0) {
    throw new AppError(
      "DELETE_BLOCKED_LINKED_AUTOMATED",
      "Cannot delete manual testcase while automated tests are linked.",
      "Unlink automated tests using unlinkAutomatedManualTestCase, then retry.",
      { manualTestCaseId: input.id, linkCount: autoLinks.length }
    );
  }
  await db.delete(requirementTestCaseLinks).where(eq(requirementTestCaseLinks.manualTestCaseId, input.id));
  await db.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, input.id));
  await db.delete(testCases).where(eq(testCases.id, input.id));
  return { success: true as const };
}

export async function deleteAutomatedTestCase(db: Db, input: { id: string }) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, input.id));
  if (rows.length === 0 || rows[0].type !== "automated") {
    throw new AppError("ENTITY_NOT_FOUND", "Automated testcase not found.", "Use a valid automated testcase id.", { id: input.id });
  }
  const res = await db.select({ id: testResults.id }).from(testResults).where(eq(testResults.testCaseId, input.id));
  if (res.length > 0) {
    await db.delete(automatedManualLinks).where(eq(automatedManualLinks.automatedTestCaseId, input.id));
    await db
      .update(testCases)
      .set({ isDeleted: true, deletedAt: now(), updatedAt: now() })
      .where(eq(testCases.id, input.id));
    await appendTestCaseVersion(db, input.id);
    return { tombstoned: true as const };
  }
  await db.delete(automatedManualLinks).where(eq(automatedManualLinks.automatedTestCaseId, input.id));
  await db.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, input.id));
  await db.delete(testCases).where(eq(testCases.id, input.id));
  return { tombstoned: false as const };
}
