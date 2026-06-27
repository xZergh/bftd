/**
 * Resets and seeds the plan-automation sandbox DB (not tcms.sqlite).
 * Playwright specs run against this database via dev:automation-api / dev:automation-web.
 *
 * Usage: npm run seed:plan-automation-db
 */
import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { resolveDatabasePath } from "../src/db/registry";
import { PLAN_AUTOMATION_PROFILE_ID } from "../src/domain/automation/constants";
import { TcmsService } from "../src/domain/service";
import { seedTcmsProject } from "../src/seed/tcms-project-seed";
import { seedTcmsR1Automation } from "../src/seed/tcms-r1-automation";
import { seedTcmsR1ManualTestCases } from "../src/seed/tcms-r1-test-cases";

export const PLAN_AUTOMATION_DB_PATH = resolveDatabasePath(PLAN_AUTOMATION_PROFILE_ID);

export async function resetAndSeedPlanAutomationDatabase(
  dbPath: string = PLAN_AUTOMATION_DB_PATH
): Promise<{ dbPath: string; projectId: string }> {
  mkdirSync(dirname(dbPath), { recursive: true });
  for (const suffix of ["", "-wal", "-shm"]) {
    const p = `${dbPath}${suffix}`;
    if (existsSync(p)) {
      unlinkSync(p);
    }
  }
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);

  const manifest = await seedTcmsProject(service, { skipIfExists: false });
  if (manifest === null) {
    throw new Error("TCMS project seed failed on plan-automation database.");
  }
  await seedTcmsR1ManualTestCases(service);
  const auto = await seedTcmsR1Automation(service);
  if (auto === null) {
    throw new Error("R1 automation seed failed on plan-automation database.");
  }

  return { dbPath, projectId: manifest.projectId };
}

async function main() {
  const dbPath = process.env.DB_PATH ?? PLAN_AUTOMATION_DB_PATH;
  const result = await resetAndSeedPlanAutomationDatabase(dbPath);
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
