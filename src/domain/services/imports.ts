import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { automatedManualLinks, requirements, testCases, testCaseSteps } from "../../db/schema";
import { AppError } from "../errors";
import { normalizeLabel } from "./labels";
import { resolveProject } from "./projects";
import { appendTestCaseVersionSync } from "./versioning";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

const CANON_REQ_TYPES = new Set(["functional", "non_functional", "regression", "integration", "other"]);
const CANON_STATUS = new Set(["draft", "ready", "accepted", "rejected", "deprecated"]);
const CANON_PRIORITY = new Set(["low", "medium", "high", "critical"]);

function normalizeRequirementEnums(raw: {
  requirementType?: string;
  status?: string;
  priority?: string;
}): { requirementType: string; status: string; priority: string; warnings: string[] } {
  const warnings: string[] = [];
  const norm = (rawVal: string | undefined, canon: Set<string>, def: string, label: string) => {
    if (!rawVal) return def;
    const k = rawVal.trim().toLowerCase().replace(/\s+/g, "_");
    if (canon.has(k)) return k;
    warnings.push(`Normalized unknown ${label} "${rawVal}" to default.`);
    return def;
  };
  return {
    requirementType: norm(raw.requirementType, CANON_REQ_TYPES, "functional", "requirement type"),
    status: norm(raw.status, CANON_STATUS, "draft", "status"),
    priority: norm(raw.priority, CANON_PRIORITY, "medium", "priority"),
    warnings
  };
}

function resolveParentRequirementIdSync(
  tx: Db,
  projectId: string,
  parentExternalKey: string | undefined
): string | null {
  if (!parentExternalKey) return null;
  const rows = tx
    .select({ id: requirements.id })
    .from(requirements)
    .where(and(eq(requirements.projectId, projectId), eq(requirements.externalKey, parentExternalKey)))
    .all();
  if (rows.length === 0) {
    throw new AppError(
      "PARENT_REQUIREMENT_INVALID",
      "parentExternalKey does not match a requirement in this project.",
      "Import the parent requirement first or fix parentExternalKey.",
      { parentExternalKey }
    );
  }
  return rows[0].id;
}

type ProjectCaseRow = {
  id: string;
  type: "manual" | "automated";
  projectId: string;
  externalId: string | null;
  isDeleted: boolean;
};

export async function importRequirements(
  db: Db,
  input: {
    projectId?: string;
    projectKey?: string;
    releaseLabel?: string;
    sprintLabel?: string;
    requirements: Array<{
      externalKey?: string;
      title?: string;
      description?: string;
      releaseLabel?: string;
      sprintLabel?: string;
      requirementType?: string;
      status?: string;
      priority?: string;
      tags?: string[];
      parentExternalKey?: string;
    }>;
  }
) {
  const project = await resolveProject(db, { projectId: input.projectId, projectKey: input.projectKey });
  const projectId = project.id;

  return db.transaction((tx) => {
    const t = tx as unknown as Db;
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

      let parentId: string | null;
      try {
        parentId = resolveParentRequirementIdSync(t, projectId, item.parentExternalKey);
      } catch (e) {
        skippedCount += 1;
        if (e instanceof AppError) {
          errors.push({ index: i, code: e.code, message: e.message, fixHint: e.fixHint });
        } else {
          errors.push({
            index: i,
            code: "VALIDATION_ERROR",
            message: "Invalid parent reference.",
            fixHint: "Check parentExternalKey."
          });
        }
        continue;
      }

      const enums = normalizeRequirementEnums(item);
      for (const w of enums.warnings) warnings.push({ index: i, message: w });

      const tagsJson = item.tags && item.tags.length > 0 ? JSON.stringify(item.tags) : null;

      const existing = t
        .select({ id: requirements.id })
        .from(requirements)
        .where(and(eq(requirements.projectId, projectId), eq(requirements.externalKey, item.externalKey)))
        .all();

      if (existing.length === 0) {
        t.insert(requirements)
          .values({
            id: randomUUID(),
            projectId,
            externalKey: item.externalKey,
            title: item.title,
            description: item.description ?? null,
            releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
            sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
            requirementType: enums.requirementType,
            status: enums.status,
            priority: enums.priority,
            tagsJson,
            parentRequirementId: parentId,
            createdAt: now(),
            updatedAt: now()
          })
          .run();
        createdCount += 1;
      } else {
        t.update(requirements)
          .set({
            title: item.title,
            description: item.description ?? null,
            releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
            sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
            requirementType: enums.requirementType,
            status: enums.status,
            priority: enums.priority,
            tagsJson,
            parentRequirementId: parentId,
            updatedAt: now()
          })
          .where(eq(requirements.id, existing[0].id))
          .run();
        updatedCount += 1;
      }
      if (!item.description) warnings.push({ index: i, message: "No description provided." });
    }

    return { createdCount, updatedCount, skippedCount, errors, warnings };
  });
}

export async function importAutomatedFromTrr(
  db: Db,
  input: {
    projectId?: string;
    projectKey?: string;
    releaseLabel?: string;
    sprintLabel?: string;
    automatedTests: Array<{
      internalTestCaseId?: string;
      externalId?: string;
      title?: string;
      releaseLabel?: string;
      sprintLabel?: string;
      linkedManualCaseIds?: string[];
      steps?: Array<{
        order: number;
        name: string;
        expectedResult?: string;
        sourceStepId?: string;
        parentStepId?: string;
        metaJson?: string;
      }>;
    }>;
  }
) {
  const project = await resolveProject(db, { projectId: input.projectId, projectKey: input.projectKey });
  const projectId = project.id;

  const projectCaseRows = await db
    .select({
      id: testCases.id,
      type: testCases.type,
      projectId: testCases.projectId,
      externalId: testCases.externalId,
      isDeleted: testCases.isDeleted
    })
    .from(testCases)
    .where(eq(testCases.projectId, projectId));

  const initialCases: ProjectCaseRow[] = projectCaseRows.map((c) => ({
    id: c.id,
    type: c.type as "manual" | "automated",
    projectId: c.projectId,
    externalId: c.externalId,
    isDeleted: c.isDeleted
  }));

  const preCounts = { createdCount: 0, updatedCount: 0, skippedCount: 0, errors: [] as Array<{ index: number; code: string; message: string; fixHint: string }> };
  const manualSet = new Set(initialCases.filter((c) => c.type === "manual" && !c.isDeleted).map((c) => c.id));

  for (let i = 0; i < input.automatedTests.length; i += 1) {
    const item = input.automatedTests[i];
    if (!item.internalTestCaseId && !item.externalId) {
      preCounts.skippedCount += 1;
      preCounts.errors.push({
        index: i,
        code: "TRR_IMPORT_INVALID",
        message: "Missing automated testcase identity.",
        fixHint: "Provide internalTestCaseId or externalId."
      });
      continue;
    }
    if (!item.title) {
      preCounts.skippedCount += 1;
      preCounts.errors.push({ index: i, code: "TRR_IMPORT_INVALID", message: "Missing automated testcase title.", fixHint: "Provide title in TRR item." });
      continue;
    }
    if (!item.linkedManualCaseIds || item.linkedManualCaseIds.length === 0) {
      preCounts.skippedCount += 1;
      preCounts.errors.push({
        index: i,
        code: "MANUAL_LINK_REQUIRED",
        message: "Automated testcase requires at least one manual link.",
        fixHint: "Provide linkedManualCaseIds with at least one valid manual testcase id."
      });
      continue;
    }
    const badManual = item.linkedManualCaseIds.filter((id) => !manualSet.has(id));
    if (badManual.length > 0) {
      preCounts.skippedCount += 1;
      preCounts.errors.push({
        index: i,
        code: "ENTITY_NOT_FOUND",
        message: "One or more linked manual testcases were not found.",
        fixHint: "Ensure linkedManualCaseIds belong to manual testcases in the same project."
      });
      continue;
    }
  }

  if (preCounts.errors.length === input.automatedTests.length && input.automatedTests.length > 0) {
    return {
      createdCount: 0,
      updatedCount: 0,
      skippedCount: preCounts.skippedCount,
      errors: preCounts.errors
    };
  }

  const workIndices = input.automatedTests
    .map((_, i) => i)
    .filter((i) => !preCounts.errors.some((e) => e.index === i));

  const batchResult = db.transaction((tx) => {
    const t = tx as unknown as Db;
    let createdCount = 0;
    let updatedCount = 0;
    const localCases: ProjectCaseRow[] = [...initialCases];

    for (const i of workIndices) {
      const item = input.automatedTests[i];

      let automatedId: string | null = null;
      if (item.internalTestCaseId) {
        const hit = localCases.find((c) => c.id === item.internalTestCaseId && c.type === "automated");
        if (hit) automatedId = hit.id;
      } else if (item.externalId) {
        const hit = localCases.find((c) => c.externalId === item.externalId && c.type === "automated");
        if (hit) automatedId = hit.id;
      }

      if (!automatedId) {
        automatedId = randomUUID();
        t.insert(testCases)
          .values({
            id: automatedId,
            projectId,
            externalId: item.externalId ?? null,
            type: "automated",
            title: item.title!,
            releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
            sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
            isDeleted: false,
            deletedAt: null,
            createdAt: now(),
            updatedAt: now()
          })
          .run();
        localCases.push({
          id: automatedId,
          type: "automated",
          projectId,
          externalId: item.externalId ?? null,
          isDeleted: false
        });
        createdCount += 1;
      } else {
        t.update(testCases)
          .set({
            title: item.title!,
            externalId: item.externalId ?? null,
            releaseLabel: normalizeLabel(item.releaseLabel ?? input.releaseLabel),
            sprintLabel: normalizeLabel(item.sprintLabel ?? input.sprintLabel),
            updatedAt: now()
          })
          .where(eq(testCases.id, automatedId))
          .run();
        t.delete(automatedManualLinks).where(eq(automatedManualLinks.automatedTestCaseId, automatedId)).run();
        t.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, automatedId)).run();
        updatedCount += 1;
      }

      t.insert(automatedManualLinks)
        .values(
          item.linkedManualCaseIds!.map((mid) => ({
            id: randomUUID(),
            automatedTestCaseId: automatedId!,
            manualTestCaseId: mid
          }))
        )
        .run();

      const steps = (item.steps ?? [])
        .sort((a, b) => a.order - b.order)
        .map((s, idx) => ({
          id: randomUUID(),
          testCaseId: automatedId!,
          stepOrder: idx + 1,
          name: s.name,
          expectedResult: s.expectedResult ?? null,
          sourceStepId: s.sourceStepId ?? null,
          parentStepId: s.parentStepId ?? null,
          metaJson: s.metaJson ?? null
        }));
      if (steps.length > 0) {
        t.insert(testCaseSteps).values(steps).run();
      }
      appendTestCaseVersionSync(t, automatedId!);
    }

    return { createdCount, updatedCount };
  });

  return {
    createdCount: batchResult.createdCount,
    updatedCount: batchResult.updatedCount,
    skippedCount: preCounts.skippedCount,
    errors: preCounts.errors
  };
}
