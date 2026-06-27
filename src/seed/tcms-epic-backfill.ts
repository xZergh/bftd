import type { TcmsService } from "../domain/service";
import { slugifyProjectKey } from "../domain/services/projects";
import { TCMS_PROJECT_KEY } from "./tcms-project-constants";
import {
  TCMS_EPIC_SEEDS,
  TCMS_REQUIREMENT_EPIC_BY_EXTERNAL_KEY,
  type TcmsEpicCatalogKey
} from "./tcms-epic-catalog";

export type TcmsEpicBackfillResult = {
  projectId: string;
  epicIds: Record<TcmsEpicCatalogKey, string>;
  epicsCreated: number;
  epicsExisting: number;
  requirementsAssigned: number;
  requirementsSkipped: number;
  requirementsMissing: string[];
};

export async function ensureTcmsEpics(
  service: TcmsService,
  projectId: string
): Promise<{ epicIds: Record<TcmsEpicCatalogKey, string>; created: number; existing: number }> {
  const existingEpics = await service.listEpics({ projectId });
  const byExternalKey = new Map(existingEpics.map((e) => [e.externalKey, e.id]));
  const epicIds = {} as Record<TcmsEpicCatalogKey, string>;
  let created = 0;
  let existing = 0;

  for (const seed of TCMS_EPIC_SEEDS) {
    const found = byExternalKey.get(seed.externalKey);
    if (found !== undefined) {
      epicIds[seed.key] = found;
      existing += 1;
      continue;
    }
    const epic = await service.createEpic({
      projectId,
      externalKey: seed.externalKey,
      title: seed.title,
      description: seed.description
    });
    epicIds[seed.key] = epic.id;
    byExternalKey.set(seed.externalKey, epic.id);
    created += 1;
  }

  return { epicIds, created, existing };
}

export async function assignTcmsRequirementEpics(
  service: TcmsService,
  projectId: string,
  epicIds: Record<TcmsEpicCatalogKey, string>
): Promise<{ assigned: number; skipped: number; missing: string[] }> {
  const requirements = await service.listRequirements({ projectId });
  const byExternalKey = new Map(requirements.map((r) => [r.externalKey, r]));
  let assigned = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const [reqExternalKey, epicCatalogKey] of Object.entries(TCMS_REQUIREMENT_EPIC_BY_EXTERNAL_KEY)) {
    const requirement = byExternalKey.get(reqExternalKey);
    if (requirement === undefined) {
      missing.push(reqExternalKey);
      continue;
    }
    const epicId = epicIds[epicCatalogKey as TcmsEpicCatalogKey];
    if (requirement.epicId === epicId) {
      skipped += 1;
      continue;
    }
    await service.updateRequirement({ id: requirement.id, epicId });
    assigned += 1;
  }

  return { assigned, skipped, missing };
}

/** Idempotent: creates missing epics and links catalog requirements to epics. */
export async function backfillTcmsEpics(service: TcmsService): Promise<TcmsEpicBackfillResult | null> {
  const tcmsKey = slugifyProjectKey(TCMS_PROJECT_KEY);
  const project = await service.getProject({ key: tcmsKey });
  if (project === null) {
    return null;
  }

  const { epicIds, created, existing } = await ensureTcmsEpics(service, project.id);
  const { assigned, skipped, missing } = await assignTcmsRequirementEpics(service, project.id, epicIds);

  return {
    projectId: project.id,
    epicIds,
    epicsCreated: created,
    epicsExisting: existing,
    requirementsAssigned: assigned,
    requirementsSkipped: skipped,
    requirementsMissing: missing
  };
}
