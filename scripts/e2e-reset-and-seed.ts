import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { TcmsService } from "../src/domain/service";
import { seedDemoQaProject } from "../src/seed/demo-qa-seed";
import type { DemoQaSeedManifest } from "../src/seed/demo-qa-constants";

export const E2E_DB_PATH = join(process.cwd(), "data", "e2e-playwright.sqlite");

/** Delete E2E SQLite (incl. WAL/SHM), init schema, seed DEMO-QA. Used by Playwright globalSetup. */
export async function resetAndSeedE2eDatabase(dbPath: string = E2E_DB_PATH): Promise<DemoQaSeedManifest> {
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
  const manifest = await seedDemoQaProject(service, { skipIfExists: false });
  if (manifest === null) {
    throw new Error("DEMO-QA seed failed unexpectedly after clean database reset.");
  }
  return manifest;
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
