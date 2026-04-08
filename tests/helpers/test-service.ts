import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDb } from "../../src/db/client";
import { initSqlite } from "../../src/db/init";
import { TcmsService } from "../../src/domain/service";

export function createTestService(prefix: string) {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  const dbPath = join(dir, "db.sqlite");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  return { service: new TcmsService(db), dir };
}
