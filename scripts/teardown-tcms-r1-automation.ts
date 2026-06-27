/**
 * Removes TCMS-AUTO-R1-05 from the TCMS project database and reverts manual R1-05 status.
 *
 * Usage: npm run seed:tcms:r1-automation:teardown
 */
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { resolveDatabasePath } from "../src/db/registry";
import { TcmsService } from "../src/domain/service";
import { teardownTcmsR1Automation } from "../src/seed/tcms-r1-automation";

async function main() {
  const dbPath = process.env.DB_PATH ?? resolveDatabasePath("tcms");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);
  const result = await teardownTcmsR1Automation(service);
  if (result === null) {
    console.log(JSON.stringify({ ok: true, dbPath, removed: false, message: "No TCMS-AUTO-R1-* tests found." }, null, 2));
    return;
  }
  console.log(JSON.stringify({ ok: true, dbPath, removed: true, count: result.removed.length, ...result }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
