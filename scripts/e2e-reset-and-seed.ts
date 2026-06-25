import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";

import { dirname, join } from "node:path";

import { createDb } from "../src/db/client";

import { initSqlite } from "../src/db/init";

import { TcmsService } from "../src/domain/service";

import { seedDemoQaEmptyProject, seedDemoQaWorkspace } from "../src/seed/demo-qa-seed";

import type { DemoQaWorkspaceManifest } from "../src/seed/demo-qa-constants";

import { DEMO_WORKSPACE_PATH } from "../src/seed/demo-workspace-paths";



export const E2E_DB_PATH = join(process.cwd(), "data", "e2e-playwright.sqlite");



function wipeSqlite(dbPath: string) {

  mkdirSync(dirname(dbPath), { recursive: true });

  for (const suffix of ["", "-wal", "-shm"]) {

    const p = `${dbPath}${suffix}`;

    if (existsSync(p)) {

      unlinkSync(p);

    }

  }

}



/** E2E DB: copy committed demo workspace, migrate, add DEMO-QA-EMPTY. Falls back to JSON seed if fixture missing. */

export async function resetAndSeedE2eDatabase(dbPath: string = E2E_DB_PATH): Promise<DemoQaWorkspaceManifest> {

  wipeSqlite(dbPath);



  if (!existsSync(DEMO_WORKSPACE_PATH)) {

    initSqlite(dbPath);

    const db = createDb(dbPath);

    const service = new TcmsService(db);

    return seedDemoQaWorkspace(service, { skipIfExists: false });

  }



  copyFileSync(DEMO_WORKSPACE_PATH, dbPath);

  initSqlite(dbPath);

  const db = createDb(dbPath);

  const service = new TcmsService(db);

  const demoQaEmpty = await seedDemoQaEmptyProject(service, { skipIfExists: false });

  if (demoQaEmpty === null) {

    throw new Error("Failed to seed DEMO-QA-EMPTY on E2E database.");

  }



  const projects = await service.listProjects({ includeArchived: true });

  const demoQa = projects.find((p) => p.key === "demo-qa");

  if (!demoQa) {

    throw new Error("E2E database missing DEMO-QA project after copying demo workspace fixture.");

  }



  return {

    demoQa: {

      projectId: demoQa.id,

      projectKey: demoQa.key,

      requirementIds: { R1: "", R2: "", R3: "" },

      manualTestCaseIds: { login: "", idleTimeout: "", passwordReset: "" },

      automatedTestCaseId: "",

      testPlanId: "",

      runId: ""

    },

    demoQaEmpty

  };

}



async function main() {

  const dbPath = process.env.DB_PATH ?? E2E_DB_PATH;

  const manifest = await resetAndSeedE2eDatabase(dbPath);

  console.log(JSON.stringify({ ok: true, dbPath, manifest }, null, 2));

}



main().catch((err) => {

  console.error(err);

  process.exitCode = 1;

});


