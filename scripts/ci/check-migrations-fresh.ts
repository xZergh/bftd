import Database from "better-sqlite3";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { initSqlite } from "../../src/db/init";

const REQUIRED_TABLES = [
  "projects",
  "requirements",
  "requirement_design_links",
  "test_cases",
  "test_case_steps",
  "requirement_test_case_links",
  "automated_manual_links",
  "test_runs",
  "test_results",
  "run_traceability_snapshots",
  "run_traceability_edges",
  "kpi_project_snapshots",
  "kpi_run_snapshots",
  "kpi_daily_snapshots"
];

function assertTables(dbPath: string) {
  const db = new Database(dbPath, { readonly: true });
  const rows = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as Array<{ name: string }>;
  const names = new Set(rows.map((r) => r.name));
  const missing = REQUIRED_TABLES.filter((t) => !names.has(t));
  db.close();
  if (missing.length > 0) {
    throw new Error(`Fresh migration check failed. Missing tables: ${missing.join(", ")}`);
  }
}

function main() {
  const dir = mkdtempSync(join(tmpdir(), "tcms-mig-fresh-"));
  const dbPath = join(dir, "fresh.sqlite");
  try {
    initSqlite(dbPath);
    assertTables(dbPath);
    console.log("Fresh migration check passed.");
  } finally {
    // Intentionally do not remove temp directory on Windows to avoid transient EPERM locks.
  }
}

main();
