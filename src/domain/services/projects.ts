import { and, eq } from "drizzle-orm";
import { randomBytes, randomUUID } from "node:crypto";
import { projects, requirements, testCases } from "../../db/schema";
import { AppError } from "../errors";
import { normalizeLabel } from "./labels";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

export function slugifyProjectKey(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : "project";
}

async function allocateUniqueKeyFromBase(db: Db, base: string): Promise<string> {
  const rows = await db.select({ key: projects.key }).from(projects);
  const used = new Set(rows.map((r) => r.key));
  const b = base.length > 0 ? base : "project";
  let candidate = b;
  let n = 0;
  while (used.has(candidate)) {
    n += 1;
    candidate = `${b}-${n}`;
  }
  if (candidate.length === 0) {
    candidate = `p-${randomBytes(4).toString("hex")}`;
  }
  return candidate;
}

export async function resolveProject(db: Db, input: { projectId?: string; projectKey?: string }) {
  if (input.projectId) {
    const rows = await db.select().from(projects).where(eq(projects.id, input.projectId));
    if (rows.length === 0) {
      throw new AppError("ENTITY_NOT_FOUND", "Project not found.", "Use a valid project id or projectKey.", {
        projectId: input.projectId
      });
    }
    return rows[0];
  }
  if (input.projectKey) {
    const rows = await db.select().from(projects).where(eq(projects.key, input.projectKey));
    if (rows.length === 0) {
      throw new AppError("ENTITY_NOT_FOUND", "Project not found.", "Use a valid projectKey.", {
        projectKey: input.projectKey
      });
    }
    return rows[0];
  }
  throw new AppError("VALIDATION_ERROR", "Project identifier required.", "Provide projectId or projectKey.", {});
}

export async function createProject(db: Db, input: { name: string; key?: string }) {
  let key: string;
  if (input.key) {
    key = slugifyProjectKey(input.key);
    const taken = await db.select({ id: projects.id }).from(projects).where(eq(projects.key, key));
    if (taken.length > 0) {
      throw new AppError(
        "PROJECT_KEY_CONFLICT",
        "Project key already exists.",
        "Choose a different key or omit key to auto-generate from the name.",
        { key }
      );
    }
  } else {
    key = await allocateUniqueKeyFromBase(db, slugifyProjectKey(input.name));
  }
  const project = {
    id: randomUUID(),
    key,
    name: input.name,
    isArchived: false,
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(projects).values(project);
  return project;
}

export async function listProjects(db: Db, input?: { includeArchived?: boolean }) {
  const rows = await db.select().from(projects);
  const filtered = input?.includeArchived ? rows : rows.filter((p) => !p.isArchived);
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProject(db: Db, input: { id?: string; key?: string }) {
  if (input.id) {
    const rows = await db.select().from(projects).where(eq(projects.id, input.id));
    return rows[0] ?? null;
  }
  if (input.key) {
    const rows = await db.select().from(projects).where(eq(projects.key, input.key));
    return rows[0] ?? null;
  }
  return null;
}

export async function updateProject(
  db: Db,
  input: { id?: string; key?: string; name?: string; keyNew?: string }
) {
  const existing = await getProject(db, { id: input.id, key: input.key });
  if (!existing) {
    throw new AppError("ENTITY_NOT_FOUND", "Project not found.", "Provide id or key of an existing project.", {});
  }
  let nextKey = existing.key;
  if (input.keyNew !== undefined) {
    const nk = slugifyProjectKey(input.keyNew);
    if (nk !== existing.key) {
      const clash = await db.select({ id: projects.id }).from(projects).where(eq(projects.key, nk));
      if (clash.length > 0 && clash[0].id !== existing.id) {
        throw new AppError("PROJECT_KEY_CONFLICT", "Project key already exists.", "Pick a unique project key.", {
          key: nk
        });
      }
      nextKey = nk;
    }
  }
  const nextName = input.name ?? existing.name;
  await db
    .update(projects)
    .set({ name: nextName, key: nextKey, updatedAt: now() })
    .where(eq(projects.id, existing.id));
  const updated = await getProject(db, { id: existing.id });
  return updated!;
}

export async function archiveProject(db: Db, input: { id?: string; key?: string; archived: boolean }) {
  const existing = await getProject(db, { id: input.id, key: input.key });
  if (!existing) {
    throw new AppError("ENTITY_NOT_FOUND", "Project not found.", "Provide id or key of an existing project.", {});
  }
  await db
    .update(projects)
    .set({ isArchived: input.archived, updatedAt: now() })
    .where(eq(projects.id, existing.id));
  return getProject(db, { id: existing.id });
}

export async function getProjectSummary(
  db: Db,
  input: { projectId: string; releaseLabel?: string; sprintLabel?: string }
) {
  const releaseLabel = normalizeLabel(input.releaseLabel);
  const sprintLabel = normalizeLabel(input.sprintLabel);
  const reqCount = await db
    .select({ id: requirements.id })
    .from(requirements)
    .where(
      and(
        eq(requirements.projectId, input.projectId),
        releaseLabel ? eq(requirements.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(requirements.sprintLabel, sprintLabel) : undefined
      )
    );
  const caseRows = await db
    .select({ id: testCases.id, type: testCases.type })
    .from(testCases)
    .where(
      and(
        eq(testCases.projectId, input.projectId),
        eq(testCases.isDeleted, false),
        releaseLabel ? eq(testCases.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(testCases.sprintLabel, sprintLabel) : undefined
      )
    );
  return {
    totalRequirements: reqCount.length,
    totalManualCases: caseRows.filter((c) => c.type === "manual").length,
    totalAutomatedCases: caseRows.filter((c) => c.type === "automated").length
  };
}
