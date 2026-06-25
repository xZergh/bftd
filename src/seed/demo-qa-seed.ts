import { readFileSync } from "node:fs";
import type { TcmsService } from "../domain/service";
import { slugifyProjectKey } from "../domain/services/projects";
import {
  DEMO_QA_EMPTY_PROJECT_KEY,
  DEMO_QA_EMPTY_PROJECT_NAME,
  DEMO_QA_PROJECT_KEY,
  type DemoQaEmptySeedManifest,
  type DemoQaSeedManifest,
  type DemoQaWorkspaceManifest
} from "./demo-qa-constants";
import type { DemoQaSeedData } from "./demo-qa-seed-data";
import { DEMO_QA_SEED_DATA_PATH } from "./demo-workspace-paths";
import { replayDemoQaSeedData } from "./demo-qa-replay";

export type SeedDemoQaOptions = {
  /** When true, skip if DEMO-QA already exists. When false, caller must ensure a clean DB or no duplicate key. */
  skipIfExists?: boolean;
};

function loadDemoQaSeedData(): DemoQaSeedData {
  const raw = readFileSync(DEMO_QA_SEED_DATA_PATH, "utf8");
  return JSON.parse(raw) as DemoQaSeedData;
}

export async function seedDemoQaProject(
  service: TcmsService,
  options: SeedDemoQaOptions = {}
): Promise<DemoQaSeedManifest | null> {
  const skipIfExists = options.skipIfExists ?? true;
  const canonicalKey = slugifyProjectKey(DEMO_QA_PROJECT_KEY);
  const projects = await service.listProjects({ includeArchived: true });
  const existing = projects.find((p) => p.key === canonicalKey);
  if (existing) {
    if (skipIfExists) {
      return null;
    }
    throw new Error(`Project key "${canonicalKey}" already exists; reset the database before re-seeding.`);
  }

  const data = loadDemoQaSeedData();
  return replayDemoQaSeedData(service, data);
}

export type SeedDemoQaEmptyOptions = {
  skipIfExists?: boolean;
};

/** Creates DEMO-QA-EMPTY: project shell only (no requirements, test cases, plans, or runs). */
export async function seedDemoQaEmptyProject(
  service: TcmsService,
  options: SeedDemoQaEmptyOptions = {}
): Promise<DemoQaEmptySeedManifest | null> {
  const skipIfExists = options.skipIfExists ?? true;
  const canonicalKey = slugifyProjectKey(DEMO_QA_EMPTY_PROJECT_KEY);
  const projects = await service.listProjects({ includeArchived: true });
  const existing = projects.find((p) => p.key === canonicalKey);
  if (existing) {
    if (skipIfExists) {
      return null;
    }
    throw new Error(`Project key "${canonicalKey}" already exists; reset the database before re-seeding.`);
  }

  const project = await service.createProject(
    DEMO_QA_EMPTY_PROJECT_NAME,
    DEMO_QA_EMPTY_PROJECT_KEY,
    "Blank demo workspace for create/import/run E2E and manual what-if flows."
  );

  return {
    projectId: project.id,
    projectKey: DEMO_QA_EMPTY_PROJECT_KEY
  };
}

export type SeedDemoQaWorkspaceOptions = SeedDemoQaOptions & SeedDemoQaEmptyOptions;

/** Seed DEMO-QA from fixtures JSON plus empty DEMO-QA-EMPTY (fallback when file copy unavailable). */
export async function seedDemoQaWorkspace(
  service: TcmsService,
  options: SeedDemoQaWorkspaceOptions = {}
): Promise<DemoQaWorkspaceManifest> {
  const demoQa = await seedDemoQaProject(service, { skipIfExists: options.skipIfExists });
  if (demoQa === null) {
    throw new Error(`Project key "${slugifyProjectKey(DEMO_QA_PROJECT_KEY)}" already exists; reset the database before re-seeding.`);
  }
  const demoQaEmpty = await seedDemoQaEmptyProject(service, { skipIfExists: options.skipIfExists });
  if (demoQaEmpty === null) {
    throw new Error(`Project key "${slugifyProjectKey(DEMO_QA_EMPTY_PROJECT_KEY)}" already exists; reset the database before re-seeding.`);
  }
  return { demoQa, demoQaEmpty };
}
