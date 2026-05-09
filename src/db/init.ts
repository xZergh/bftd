import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes } from "node:crypto";

function slugifyBase(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return s.length > 0 ? s : "project";
}

function tableColumns(db: Database.Database, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

function ensureColumn(db: Database.Database, table: string, column: string, ddl: string) {
  const cols = tableColumns(db, table);
  if (!cols.has(column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

function indexExists(db: Database.Database, name: string): boolean {
  const rows = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name=?`)
    .all(name) as Array<{ name: string }>;
  return rows.length > 0;
}

function backfillProjectKeys(db: Database.Database) {
  const projects = db.prepare(`SELECT id, name, key FROM projects`).all() as Array<{
    id: string;
    name: string;
    key: string | null;
  }>;
  const used = new Set(
    projects.map((p) => p.key).filter((k): k is string => k != null && k.length > 0)
  );
  const upd = db.prepare(`UPDATE projects SET key = ? WHERE id = ?`);
  for (const p of projects) {
    if (p.key && p.key.length > 0) continue;
    const base = slugifyBase(p.name);
    let candidate = base;
    let n = 0;
    while (used.has(candidate)) {
      n += 1;
      candidate = `${base}-${n}`;
    }
    if (candidate.length === 0) {
      candidate = `p-${randomBytes(4).toString("hex")}`;
    }
    used.add(candidate);
    upd.run(candidate, p.id);
  }
}

function applyAdditiveMigrations(db: Database.Database) {
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table'`)
    .all() as Array<{ name: string }>;
  const names = new Set(tables.map((t) => t.name));

  if (names.has("projects")) {
    ensureColumn(db, "projects", "key", "TEXT");
    ensureColumn(db, "projects", "description", "TEXT");
    backfillProjectKeys(db);
  }

  if (names.has("requirements")) {
    ensureColumn(db, "requirements", "description", "TEXT");
    ensureColumn(db, "requirements", "release_label", "TEXT");
    ensureColumn(db, "requirements", "sprint_label", "TEXT");
    ensureColumn(db, "requirements", "requirement_type", "TEXT");
    ensureColumn(db, "requirements", "status", "TEXT");
    ensureColumn(db, "requirements", "priority", "TEXT");
    ensureColumn(db, "requirements", "tags_json", "TEXT");
    ensureColumn(db, "requirements", "parent_requirement_id", "TEXT");
  }

  if (names.has("test_cases")) {
    ensureColumn(db, "test_cases", "release_label", "TEXT");
    ensureColumn(db, "test_cases", "sprint_label", "TEXT");
    ensureColumn(db, "test_cases", "is_deleted", "INTEGER NOT NULL DEFAULT 0");
    ensureColumn(db, "test_cases", "deleted_at", "INTEGER");
  }

  if (names.has("test_case_steps")) {
    ensureColumn(db, "test_case_steps", "parent_step_id", "TEXT");
    ensureColumn(db, "test_case_steps", "meta_json", "TEXT");
  }

  if (names.has("test_runs")) {
    ensureColumn(db, "test_runs", "test_plan_id", "TEXT");
    ensureColumn(db, "test_runs", "release_label", "TEXT");
    ensureColumn(db, "test_runs", "sprint_label", "TEXT");
    ensureColumn(db, "test_runs", "environment", "TEXT");
    ensureColumn(db, "test_runs", "build_version", "TEXT");
    ensureColumn(db, "test_runs", "trigger", "TEXT");
    ensureColumn(db, "test_runs", "finished_at", "INTEGER");
  }

  if (names.has("test_results")) {
    ensureColumn(db, "test_results", "attachments_json", "TEXT");
  }
  if (!indexExists(db, "test_plan_case_uniq")) {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS test_plan_case_uniq ON test_plan_test_case_links(test_plan_id, test_case_id)`);
  }
  if (!indexExists(db, "run_case_assignment_uniq")) {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS run_case_assignment_uniq ON run_test_case_assignments(run_id, test_case_id)`);
  }

  db.exec(`DROP INDEX IF EXISTS req_provider_node_url_uniq`);
  if (!indexExists(db, "req_design_link_uniq")) {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS req_design_link_uniq
      ON requirement_design_links(requirement_id, provider, coalesce(design_node_id, ''), share_url)
    `);
  }
  if (names.has("projects") && !indexExists(db, "project_key_uniq")) {
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS project_key_uniq ON projects(key)`);
  }
}

export function initSqlite(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
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
      release_label TEXT,
      sprint_label TEXT,
      requirement_type TEXT,
      status TEXT,
      priority TEXT,
      tags_json TEXT,
      parent_requirement_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS req_project_external_key_uniq
    ON requirements(project_id, external_key);

    CREATE TABLE IF NOT EXISTS requirement_design_links (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      requirement_id TEXT NOT NULL,
      provider TEXT NOT NULL,
      design_project_id TEXT,
      design_file_id TEXT,
      design_page_id TEXT,
      design_node_id TEXT,
      share_url TEXT NOT NULL,
      title TEXT,
      last_synced_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      external_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      release_label TEXT,
      sprint_label TEXT,
      is_deleted INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS test_case_project_external_uniq
    ON test_cases(project_id, external_id);

    CREATE TABLE IF NOT EXISTS test_case_steps (
      id TEXT PRIMARY KEY,
      test_case_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      expected_result TEXT,
      source_step_id TEXT,
      parent_step_id TEXT,
      meta_json TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS test_case_step_uniq
    ON test_case_steps(test_case_id, step_order);

    CREATE TABLE IF NOT EXISTS test_case_versions (
      id TEXT PRIMARY KEY,
      test_case_id TEXT NOT NULL,
      version_seq INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      external_id TEXT,
      release_label TEXT,
      sprint_label TEXT,
      is_tombstone INTEGER NOT NULL DEFAULT 0,
      links_json TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS test_case_version_seq_uniq
    ON test_case_versions(test_case_id, version_seq);

    CREATE TABLE IF NOT EXISTS test_case_version_steps (
      id TEXT PRIMARY KEY,
      version_id TEXT NOT NULL,
      step_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      expected_result TEXT,
      parent_step_id TEXT,
      source_step_id TEXT,
      meta_json TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS test_case_version_step_uniq
    ON test_case_version_steps(version_id, step_order);

    CREATE TABLE IF NOT EXISTS requirement_test_case_links (
      id TEXT PRIMARY KEY,
      requirement_id TEXT NOT NULL,
      manual_test_case_id TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS req_manual_uniq
    ON requirement_test_case_links(requirement_id, manual_test_case_id);

    CREATE TABLE IF NOT EXISTS automated_manual_links (
      id TEXT PRIMARY KEY,
      automated_test_case_id TEXT NOT NULL,
      manual_test_case_id TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS auto_manual_uniq
    ON automated_manual_links(automated_test_case_id, manual_test_case_id);

    CREATE TABLE IF NOT EXISTS test_runs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      test_plan_id TEXT,
      name TEXT NOT NULL,
      release_label TEXT,
      sprint_label TEXT,
      environment TEXT,
      build_version TEXT,
      trigger TEXT,
      created_at INTEGER NOT NULL,
      finished_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      test_case_id TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      attachments_json TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_plans (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      release_label TEXT,
      sprint_label TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_plan_test_case_links (
      id TEXT PRIMARY KEY,
      test_plan_id TEXT NOT NULL,
      test_case_id TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS test_plan_case_uniq
    ON test_plan_test_case_links(test_plan_id, test_case_id);

    CREATE TABLE IF NOT EXISTS run_test_case_assignments (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      test_case_id TEXT NOT NULL,
      source_test_plan_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS run_case_assignment_uniq
    ON run_test_case_assignments(run_id, test_case_id);

    CREATE TABLE IF NOT EXISTS run_traceability_snapshots (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      captured_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS run_snapshot_run_idx
    ON run_traceability_snapshots(run_id);

    CREATE TABLE IF NOT EXISTS run_traceability_edges (
      id TEXT PRIMARY KEY,
      run_snapshot_id TEXT NOT NULL,
      requirement_id TEXT NOT NULL,
      manual_test_case_id TEXT NOT NULL,
      automated_test_case_id TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS run_edge_uniq
    ON run_traceability_edges(run_snapshot_id, requirement_id, manual_test_case_id, automated_test_case_id);

    CREATE TABLE IF NOT EXISTS kpi_project_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      snapshot_date TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS kpi_project_snapshot_uniq
    ON kpi_project_snapshots(project_id, snapshot_date);

    CREATE TABLE IF NOT EXISTS kpi_run_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      run_id TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS kpi_run_snapshot_uniq
    ON kpi_run_snapshots(project_id, run_id);

    CREATE TABLE IF NOT EXISTS kpi_daily_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      snapshot_date TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      payload_json TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS kpi_daily_snapshot_uniq
    ON kpi_daily_snapshots(project_id, snapshot_date);
  `);

  applyAdditiveMigrations(db);

  if (!indexExists(db, "req_design_link_uniq")) {
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS req_design_link_uniq
      ON requirement_design_links(requirement_id, provider, coalesce(design_node_id, ''), share_url)
    `);
  }

  db.close();
}
