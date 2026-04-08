import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export function initSqlite(dbPath: string) {
  mkdirSync(dirname(dbPath), { recursive: true });
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
      release_label TEXT,
      sprint_label TEXT,
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
    CREATE UNIQUE INDEX IF NOT EXISTS req_provider_node_url_uniq
    ON requirement_design_links(requirement_id, provider, design_node_id, share_url);

    CREATE TABLE IF NOT EXISTS test_cases (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      external_id TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      release_label TEXT,
      sprint_label TEXT,
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
      source_step_id TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS test_case_step_uniq
    ON test_case_steps(test_case_id, step_order);

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
      name TEXT NOT NULL,
      release_label TEXT,
      sprint_label TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      test_case_id TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL
    );

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
  db.close();
}
