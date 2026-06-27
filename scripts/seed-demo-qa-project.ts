/**
 * Seeds DEMO-QA via shared seed module. Safe to re-run: skips if project key exists.
 *
 * Usage: npm run seed:demo
 * Force reset E2E DB: npm run e2e:reset-db
 */
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { resolveDatabasePath } from "../src/db/registry";
import { TcmsService } from "../src/domain/service";
import { seedDemoQaProject } from "../src/seed/demo-qa-seed";

async function main() {
  const dbPath = process.env.DB_PATH ?? resolveDatabasePath("demo");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);
  const manifest = await seedDemoQaProject(service, { skipIfExists: true });
  if (manifest === null) {
    console.log('Project with key "DEMO-QA" already exists; skipping seed.');
    return;
  }
  console.log(JSON.stringify({ ok: true, dbPath, ...manifest }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
