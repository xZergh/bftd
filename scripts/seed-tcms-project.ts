/**
 * Seeds the TCMS product project + MVP requirements into the isolated project database.
 *
 * Usage: npm run seed:tcms
 */
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { resolveDatabasePath } from "../src/db/registry";
import { TcmsService } from "../src/domain/service";
import { seedTcmsProject } from "../src/seed/tcms-project-seed";

async function main() {
  const dbPath = process.env.DB_PATH ?? resolveDatabasePath("tcms");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);
  const manifest = await seedTcmsProject(service, { skipIfExists: true });
  if (manifest === null) {
    console.log('Project with key "tcms" already exists; skipping seed.');
    return;
  }
  console.log(JSON.stringify({ ok: true, dbPath, ...manifest }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
