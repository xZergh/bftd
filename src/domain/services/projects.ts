import { and, asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { requirements, testCases, projects } from "../../db/schema";
import { normalizeLabel } from "./labels";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

export async function createProject(db: Db, name: string) {
  const project = {
    id: randomUUID(),
    name,
    isArchived: false,
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(projects).values(project);
  return project;
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
  }
) {
  const req = {
    id: randomUUID(),
    projectId: input.projectId,
    externalKey: input.externalKey,
    title: input.title,
    description: input.description ?? null,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    createdAt: now(),
    updatedAt: now()
  };
  await db.insert(requirements).values(req);
  return req;
}

export async function listRequirements(
  db: Db,
  input: { projectId: string; releaseLabel?: string; sprintLabel?: string }
) {
  const releaseLabel = normalizeLabel(input.releaseLabel);
  const sprintLabel = normalizeLabel(input.sprintLabel);
  return db
    .select()
    .from(requirements)
    .where(
      and(
        eq(requirements.projectId, input.projectId),
        releaseLabel ? eq(requirements.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(requirements.sprintLabel, sprintLabel) : undefined
      )
    )
    .orderBy(asc(requirements.externalKey));
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
