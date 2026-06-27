import { and, count, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import {
  assertRequirementPriority,
  assertRequirementStatus,
  assertRequirementType
} from "../projectSettings";
import { requirementTestCaseLinks, requirements } from "../../db/schema";
import { assertEpicInProject, getEpic, getEpicsByIds, mapEpicRow } from "./epics";
import { normalizeLabel } from "./labels";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

function tagsToJson(tags?: string[]) {
  if (!tags || tags.length === 0) return null;
  return JSON.stringify(tags);
}

function parseTags(json: string | null): string[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function mapRequirementRow(row: typeof requirements.$inferSelect) {
  return {
    ...row,
    tags: parseTags(row.tagsJson)
  };
}

export type RequirementWithEpic = ReturnType<typeof mapRequirementRow> & {
  linkedManualTestCaseCount: number;
  epic: ReturnType<typeof mapEpicRow> | null;
};

async function attachEpicSummaries(
  db: Db,
  rows: ReturnType<typeof mapRequirementRow>[]
): Promise<Map<string, ReturnType<typeof mapEpicRow>>> {
  const epicIds = [...new Set(rows.map((r) => r.epicId).filter((id): id is string => id != null && id !== ""))];
  return getEpicsByIds(db, epicIds);
}

async function assertParentInProject(db: Db, projectId: string, parentId: string | null | undefined) {
  if (!parentId) return;
  const rows = await db
    .select({ id: requirements.id })
    .from(requirements)
    .where(and(eq(requirements.id, parentId), eq(requirements.projectId, projectId)));
  if (rows.length === 0) {
    throw new AppError(
      "PARENT_REQUIREMENT_INVALID",
      "Parent requirement is not in this project.",
      "Set parentRequirementId to a requirement in the same project, or omit it.",
      { parentRequirementId: parentId }
    );
  }
}

async function manualLinkCountsByRequirement(db: Db, requirementIds: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (requirementIds.length === 0) {
    return out;
  }
  for (const id of requirementIds) {
    out.set(id, 0);
  }
  const rows = await db
    .select({ requirementId: requirementTestCaseLinks.requirementId, c: count() })
    .from(requirementTestCaseLinks)
    .where(inArray(requirementTestCaseLinks.requirementId, requirementIds))
    .groupBy(requirementTestCaseLinks.requirementId);
  for (const row of rows) {
    out.set(row.requirementId, Number(row.c));
  }
  return out;
}

export async function createRequirement(
  db: Db,
  input: {
    projectId: string;
    externalKey: string;
    title: string;
    description?: string;
    releaseLabel?: string;
    sprintLabel?: string;
    requirementType?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    parentRequirementId?: string;
    epicId?: string;
  }
) {
  await assertParentInProject(db, input.projectId, input.parentRequirementId);
  await assertEpicInProject(db, input.projectId, input.epicId);
  const requirementType = input.requirementType ?? "functional";
  const status = input.status ?? "draft";
  const priority = input.priority ?? "medium";
  assertRequirementType(requirementType);
  assertRequirementStatus(status);
  assertRequirementPriority(priority);
  const req = {
    id: randomUUID(),
    projectId: input.projectId,
    externalKey: input.externalKey,
    title: input.title,
    description: input.description ?? null,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    requirementType,
    status,
    priority,
    tagsJson: tagsToJson(input.tags),
    parentRequirementId: input.parentRequirementId ?? null,
    epicId: input.epicId ?? null,
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(requirements).values(req);
  const epic = req.epicId ? await getEpic(db, { id: req.epicId, projectId: input.projectId }) : null;
  return { ...mapRequirementRow(req), linkedManualTestCaseCount: 0, epic };
}

export async function listRequirements(db: Db, input: { projectId: string }) {
  const rows = await db.select().from(requirements).where(eq(requirements.projectId, input.projectId));
  const mapped = rows.map(mapRequirementRow).sort((a, b) => a.externalKey.localeCompare(b.externalKey));
  const linkCounts = await manualLinkCountsByRequirement(
    db,
    mapped.map((r) => r.id)
  );
  const epicMap = await attachEpicSummaries(db, mapped);
  return mapped.map((r) => ({
    ...r,
    linkedManualTestCaseCount: linkCounts.get(r.id) ?? 0,
    epic: r.epicId ? (epicMap.get(r.epicId) ?? null) : null
  }));
}

export async function getRequirement(db: Db, input: { id: string; projectId?: string }) {
  const rows = await db.select().from(requirements).where(eq(requirements.id, input.id));
  if (rows.length === 0) return null;
  const r = rows[0];
  if (input.projectId && r.projectId !== input.projectId) return null;
  const mapped = mapRequirementRow(r);
  const counts = await manualLinkCountsByRequirement(db, [mapped.id]);
  const epic = mapped.epicId ? await getEpic(db, { id: mapped.epicId, projectId: r.projectId }) : null;
  return { ...mapped, linkedManualTestCaseCount: counts.get(mapped.id) ?? 0, epic };
}

export async function updateRequirement(
  db: Db,
  input: {
    id: string;
    title?: string;
    description?: string | null;
    releaseLabel?: string | null;
    sprintLabel?: string | null;
    requirementType?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    parentRequirementId?: string | null;
    epicId?: string | null;
  }
) {
  const existing = await db.select().from(requirements).where(eq(requirements.id, input.id));
  if (existing.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Requirement not found.", "Use a valid requirement id.", { id: input.id });
  }
  const row = existing[0];
  const nextParent = input.parentRequirementId !== undefined ? input.parentRequirementId : row.parentRequirementId;
  if (nextParent === input.id) {
    throw new AppError("PARENT_REQUIREMENT_INVALID", "Requirement cannot be its own parent.", "Clear parent or choose another requirement.", {});
  }
  await assertParentInProject(db, row.projectId, nextParent ?? undefined);
  const nextEpic = input.epicId !== undefined ? input.epicId : row.epicId;
  await assertEpicInProject(db, row.projectId, nextEpic ?? undefined);

  const patch: Partial<typeof row> = { updatedAt: now() };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.releaseLabel !== undefined) patch.releaseLabel = normalizeLabel(input.releaseLabel ?? undefined);
  if (input.sprintLabel !== undefined) patch.sprintLabel = normalizeLabel(input.sprintLabel ?? undefined);
  if (input.requirementType !== undefined) {
    assertRequirementType(input.requirementType);
    patch.requirementType = input.requirementType;
  }
  if (input.status !== undefined) {
    assertRequirementStatus(input.status);
    patch.status = input.status;
  }
  if (input.priority !== undefined) {
    assertRequirementPriority(input.priority);
    patch.priority = input.priority;
  }
  if (input.tags !== undefined) patch.tagsJson = tagsToJson(input.tags);
  if (input.parentRequirementId !== undefined) patch.parentRequirementId = input.parentRequirementId;
  if (input.epicId !== undefined) patch.epicId = input.epicId;

  await db.update(requirements).set(patch).where(eq(requirements.id, input.id));
  return getRequirement(db, { id: input.id });
}

export async function deleteRequirement(db: Db, input: { id: string }) {
  const existing = await db.select().from(requirements).where(eq(requirements.id, input.id));
  if (existing.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Requirement not found.", "Use a valid requirement id.", { id: input.id });
  }
  const links = await db
    .select({ id: requirementTestCaseLinks.id })
    .from(requirementTestCaseLinks)
    .where(eq(requirementTestCaseLinks.requirementId, input.id));
  if (links.length > 0) {
    throw new AppError(
      "DELETE_BLOCKED_REQUIREMENT_MANUAL",
      "Cannot delete requirement while manual testcases are linked.",
      "Unlink manual testcases using unlinkRequirementManualTestCase, then retry.",
      { requirementId: input.id, linkCount: links.length }
    );
  }
  await db.delete(requirements).where(eq(requirements.id, input.id));
  return { success: true as const };
}
