import { join } from "node:path";

/** Committed canonical DEMO-QA SQLite (manual demo; DEMO-QA project only). Override with DEMO_WORKSPACE_PATH for tooling. */
export const DEMO_WORKSPACE_PATH =
  process.env.DEMO_WORKSPACE_PATH ?? join(process.cwd(), "fixtures", "demo-workspace.sqlite");

/** Generated replay manifest synced from {@link DEMO_WORKSPACE_PATH}. */
export const DEMO_QA_SEED_DATA_PATH = join(process.cwd(), "fixtures", "demo-qa-seed-data.json");

export const DEFAULT_DB_PATH = DEMO_WORKSPACE_PATH;
