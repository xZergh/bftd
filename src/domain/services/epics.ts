import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { epics, requirements, testCases } from "../../db/schema";
import { AppError } from "../errors";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

export function mapEpicRow(row: typeof epics.$inferSelect) {
  return row;
}

export async function assertEpicInProject(db: Db, projectId: string, epicId: string | null | undefined) {
  if (!epicId) {
    return;
  }
  const rows = await db
    .select({ id: epics.id })
    .from(epics)
    .where(and(eq(epics.id, epicId), eq(epics.projectId, projectId)));
  if (rows.length === 0) {
    throw new AppError(
      "EPIC_NOT_IN_PROJECT",
      "Epic is not in this project.",
      "Set epicId to an epic in the same project, or omit it.",
      { epicId, projectId }
    );
  }
}

export async function createEpic(
  db: Db,
  input: { projectId: string; externalKey: string; title: string; description?: string }
) {
  const taken = await db
    .select({ id: epics.id })
    .from(epics)
    .where(and(eq(epics.projectId, input.projectId), eq(epics.externalKey, input.externalKey)));
  if (taken.length > 0) {
    throw new AppError(
      "EPIC_KEY_CONFLICT",
      "Epic key already exists in this project.",
      "Choose a different externalKey for the epic.",
      { externalKey: input.externalKey, projectId: input.projectId }
    );
  }
  const row = {
    id: randomUUID(),
    projectId: input.projectId,
    externalKey: input.externalKey,
    title: input.title,
    description: input.description ?? null,
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(epics).values(row);
  return mapEpicRow(row);
}

export async function listEpics(db: Db, input: { projectId: string }) {
  const rows = await db.select().from(epics).where(eq(epics.projectId, input.projectId));
  return rows.map(mapEpicRow).sort((a, b) => a.externalKey.localeCompare(b.externalKey));
}

export async function getEpicUsageCounts(db: Db, projectId: string) {
  const reqRows = await db
    .select({ epicId: requirements.epicId, count: sql<number>`count(*)` })
    .from(requirements)
    .where(and(eq(requirements.projectId, projectId), isNotNull(requirements.epicId)))
    .groupBy(requirements.epicId);

  const tcRows = await db
    .select({ epicId: testCases.epicId, count: sql<number>`count(*)` })
    .from(testCases)
    .where(and(eq(testCases.projectId, projectId), isNotNull(testCases.epicId)))
    .groupBy(testCases.epicId);

  const out = new Map<string, { requirementCount: number; testCaseCount: number }>();
  for (const row of reqRows) {
    if (!row.epicId) {
      continue;
    }
    const cur = out.get(row.epicId) ?? { requirementCount: 0, testCaseCount: 0 };
    cur.requirementCount = Number(row.count);
    out.set(row.epicId, cur);
  }
  for (const row of tcRows) {
    if (!row.epicId) {
      continue;
    }
    const cur = out.get(row.epicId) ?? { requirementCount: 0, testCaseCount: 0 };
    cur.testCaseCount = Number(row.count);
    out.set(row.epicId, cur);
  }
  return out;
}

export async function getEpic(db: Db, input: { id: string; projectId?: string }) {
  const rows = await db.select().from(epics).where(eq(epics.id, input.id));
  if (rows.length === 0) {
    return null;
  }
  const row = rows[0];
  if (input.projectId !== undefined && row.projectId !== input.projectId) {
    return null;
  }
  return mapEpicRow(row);
}

export async function getEpicsByIds(db: Db, ids: string[]): Promise<Map<string, ReturnType<typeof mapEpicRow>>> {
  const out = new Map<string, ReturnType<typeof mapEpicRow>>();
  if (ids.length === 0) {
    return out;
  }
  const rows = await db.select().from(epics).where(inArray(epics.id, ids));
  for (const row of rows) {
    out.set(row.id, mapEpicRow(row));
  }
  return out;
}

export async function updateEpic(
  db: Db,
  input: { id: string; title?: string; description?: string | null; externalKey?: string }
) {
  const existing = await db.select().from(epics).where(eq(epics.id, input.id));
  if (existing.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Epic not found.", "Use a valid epic id.", { id: input.id });
  }
  const row = existing[0];
  if (input.externalKey !== undefined && input.externalKey !== row.externalKey) {
    const taken = await db
      .select({ id: epics.id })
      .from(epics)
      .where(and(eq(epics.projectId, row.projectId), eq(epics.externalKey, input.externalKey)));
    if (taken.length > 0) {
      throw new AppError(
        "EPIC_KEY_CONFLICT",
        "Epic key already exists in this project.",
        "Choose a different externalKey for the epic.",
        { externalKey: input.externalKey, projectId: row.projectId }
      );
    }
  }
  const patch: Partial<typeof row> = { updatedAt: now() };
  if (input.title !== undefined) {
    patch.title = input.title;
  }
  if (input.description !== undefined) {
    patch.description = input.description;
  }
  if (input.externalKey !== undefined) {
    patch.externalKey = input.externalKey;
  }
  await db.update(epics).set(patch).where(eq(epics.id, input.id));
  return getEpic(db, { id: input.id });
}

export async function deleteEpic(db: Db, input: { id: string }) {
  const existing = await db.select().from(epics).where(eq(epics.id, input.id));
  if (existing.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Epic not found.", "Use a valid epic id.", { id: input.id });
  }
  await db.update(requirements).set({ epicId: null }).where(eq(requirements.epicId, input.id));
  await db.update(testCases).set({ epicId: null }).where(eq(testCases.epicId, input.id));
  await db.delete(epics).where(eq(epics.id, input.id));
  return { success: true as const };
}
