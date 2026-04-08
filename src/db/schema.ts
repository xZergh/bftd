import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const requirements = sqliteTable(
  "requirements",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    externalKey: text("external_key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    releaseLabel: text("release_label"),
    sprintLabel: text("sprint_label"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (t) => ({
    projectExternalKeyUniq: uniqueIndex("req_project_external_key_uniq").on(
      t.projectId,
      t.externalKey
    )
  })
);

export const requirementDesignLinks = sqliteTable(
  "requirement_design_links",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    requirementId: text("requirement_id").notNull(),
    provider: text("provider").notNull(),
    designProjectId: text("design_project_id"),
    designFileId: text("design_file_id"),
    designPageId: text("design_page_id"),
    designNodeId: text("design_node_id"),
    shareUrl: text("share_url").notNull(),
    title: text("title"),
    lastSyncedAt: integer("last_synced_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (t) => ({
    reqProviderNodeUrlUniq: uniqueIndex("req_provider_node_url_uniq").on(
      t.requirementId,
      t.provider,
      t.designNodeId,
      t.shareUrl
    )
  })
);

export const testCases = sqliteTable("test_cases", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  externalId: text("external_id"),
  type: text("type", { enum: ["manual", "automated"] }).notNull(),
  title: text("title").notNull(),
  releaseLabel: text("release_label"),
  sprintLabel: text("sprint_label"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
});

export const testCaseSteps = sqliteTable(
  "test_case_steps",
  {
    id: text("id").primaryKey(),
    testCaseId: text("test_case_id").notNull(),
    stepOrder: integer("step_order").notNull(),
    name: text("name").notNull(),
    expectedResult: text("expected_result"),
    sourceStepId: text("source_step_id")
  },
  (t) => ({
    stepUniq: uniqueIndex("test_case_step_uniq").on(t.testCaseId, t.stepOrder)
  })
);

export const requirementTestCaseLinks = sqliteTable(
  "requirement_test_case_links",
  {
    id: text("id").primaryKey(),
    requirementId: text("requirement_id").notNull(),
    manualTestCaseId: text("manual_test_case_id").notNull()
  },
  (t) => ({
    reqManualUniq: uniqueIndex("req_manual_uniq").on(t.requirementId, t.manualTestCaseId)
  })
);

export const automatedManualLinks = sqliteTable(
  "automated_manual_links",
  {
    id: text("id").primaryKey(),
    automatedTestCaseId: text("automated_test_case_id").notNull(),
    manualTestCaseId: text("manual_test_case_id").notNull()
  },
  (t) => ({
    autoManualUniq: uniqueIndex("auto_manual_uniq").on(
      t.automatedTestCaseId,
      t.manualTestCaseId
    )
  })
);

export const testRuns = sqliteTable("test_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  releaseLabel: text("release_label"),
  sprintLabel: text("sprint_label"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const testResults = sqliteTable("test_results", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  testCaseId: text("test_case_id").notNull(),
  status: text("status", { enum: ["passed", "failed", "skipped", "blocked"] }).notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const runTraceabilitySnapshots = sqliteTable("run_traceability_snapshots", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  projectId: text("project_id").notNull(),
  capturedAt: integer("captured_at", { mode: "timestamp" }).notNull()
});

export const runTraceabilityEdges = sqliteTable(
  "run_traceability_edges",
  {
    id: text("id").primaryKey(),
    runSnapshotId: text("run_snapshot_id").notNull(),
    requirementId: text("requirement_id").notNull(),
    manualTestCaseId: text("manual_test_case_id").notNull(),
    automatedTestCaseId: text("automated_test_case_id")
  },
  (t) => ({
    runEdgeUniq: uniqueIndex("run_edge_uniq").on(
      t.runSnapshotId,
      t.requirementId,
      t.manualTestCaseId,
      t.automatedTestCaseId
    )
  })
);

export const kpiProjectSnapshots = sqliteTable("kpi_project_snapshots", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
  payloadJson: text("payload_json").notNull()
});

export const kpiRunSnapshots = sqliteTable("kpi_run_snapshots", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  runId: text("run_id").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
  payloadJson: text("payload_json").notNull()
});

export const kpiDailySnapshots = sqliteTable("kpi_daily_snapshots", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  snapshotDate: text("snapshot_date").notNull(),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
  payloadJson: text("payload_json").notNull()
});
