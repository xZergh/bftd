import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initSqlite } from "../../src/db/init";

const NEW_TABLES = [
  "requirement_design_links",
  "test_case_steps",
  "run_traceability_snapshots",
  "run_traceability_edges",
  "kpi_project_snapshots",
  "kpi_run_snapshots",
  "kpi_daily_snapshots"
];

function createLegacyBaseline(dbPath: string) {
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS requirements (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      external_key TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      external_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  db.close();
}

function assertUpgrade(dbPath: string) {
  const db = new Database(dbPath, { readonly: true });
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as Array<{ name: string }>;
  const names = new Set(rows.map((r) => r.name));
  const missing = NEW_TABLES.filter((t) => !names.has(t));
  db.close();
  if (missing.length > 0) {
    throw new Error(`Upgrade migration check failed. Missing upgraded tables: ${missing.join(", ")}`);
  }
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), "tcms-mig-upgrade-"));
  const dbPath = join(dir, "upgrade.sqlite");
  try {
    createLegacyBaseline(dbPath);
    initSqlite(dbPath);
    assertUpgrade(dbPath);
    console.log("Upgrade migration check passed.");
  } finally {
    // Intentionally do not remove temp directory on Windows to avoid transient EPERM locks.
  }
}

main();
