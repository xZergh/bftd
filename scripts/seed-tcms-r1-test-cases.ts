/**
 * Seeds manual test cases for TCMS-R1 (project keys) into the TCMS project database.
 *
 * Usage: npm run seed:tcms:r1-tcs
 */
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { resolveDatabasePath } from "../src/db/registry";
import { TcmsService } from "../src/domain/service";
import { seedTcmsR1ManualTestCases } from "../src/seed/tcms-r1-test-cases";

async function main() {
  const dbPath = process.env.DB_PATH ?? resolveDatabasePath("tcms");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);
  const result = await seedTcmsR1ManualTestCases(service);
  if (result === null) {
    console.log('TCMS project not found; run npm run seed:tcms first.');
    return;
  }
  console.log(JSON.stringify({ ok: true, dbPath, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
