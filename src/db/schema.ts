import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (t) => ({
    projectKeyUniq: uniqueIndex("project_key_uniq").on(t.key)
  })
);

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
    requirementType: text("requirement_type"),
    status: text("status"),
    priority: text("priority"),
    tagsJson: text("tags_json"),
    parentRequirementId: text("parent_requirement_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (t) => ({
    projectExternalKeyUniq: uniqueIndex("req_project_external_key_uniq").on(t.projectId, t.externalKey)
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
    reqProviderNodeUrlUniq: uniqueIndex("req_design_link_uniq").on(
      t.requirementId,
      t.provider,
      sql`coalesce(${t.designNodeId}, '')`,
      t.shareUrl
    )
  })
);

export const testCases = sqliteTable(
  "test_cases",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    externalId: text("external_id"),
    type: text("type", { enum: ["manual", "automated"] }).notNull(),
    title: text("title").notNull(),
    releaseLabel: text("release_label"),
    sprintLabel: text("sprint_label"),
    isDeleted: integer("is_deleted", { mode: "boolean" }).notNull().default(false),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull()
  },
  (t) => ({
    projectExternalUniq: uniqueIndex("test_case_project_external_uniq").on(t.projectId, t.externalId)
  })
);

export const testCaseSteps = sqliteTable(
  "test_case_steps",
  {
    id: text("id").primaryKey(),
    testCaseId: text("test_case_id").notNull(),
    stepOrder: integer("step_order").notNull(),
    name: text("name").notNull(),
    expectedResult: text("expected_result"),
    sourceStepId: text("source_step_id"),
    parentStepId: text("parent_step_id"),
    metaJson: text("meta_json")
  },
  (t) => ({
    stepUniq: uniqueIndex("test_case_step_uniq").on(t.testCaseId, t.stepOrder)
  })
);

export const testCaseVersions = sqliteTable(
  "test_case_versions",
  {
    id: text("id").primaryKey(),
    testCaseId: text("test_case_id").notNull(),
    versionSeq: integer("version_seq").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
    title: text("title").notNull(),
    type: text("type", { enum: ["manual", "automated"] }).notNull(),
    externalId: text("external_id"),
    releaseLabel: text("release_label"),
    sprintLabel: text("sprint_label"),
    isTombstone: integer("is_tombstone", { mode: "boolean" }).notNull().default(false),
    linksJson: text("links_json").notNull()
  },
  (t) => ({
    caseVersionSeqUniq: uniqueIndex("test_case_version_seq_uniq").on(t.testCaseId, t.versionSeq)
  })
);

export const testCaseVersionSteps = sqliteTable(
  "test_case_version_steps",
  {
    id: text("id").primaryKey(),
    versionId: text("version_id").notNull(),
    stepOrder: integer("step_order").notNull(),
    name: text("name").notNull(),
    expectedResult: text("expected_result"),
    parentStepId: text("parent_step_id"),
    sourceStepId: text("source_step_id"),
    metaJson: text("meta_json")
  },
  (t) => ({
    versionStepUniq: uniqueIndex("test_case_version_step_uniq").on(t.versionId, t.stepOrder)
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
    autoManualUniq: uniqueIndex("auto_manual_uniq").on(t.automatedTestCaseId, t.manualTestCaseId)
  })
);

export const testRuns = sqliteTable("test_runs", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  name: text("name").notNull(),
  releaseLabel: text("release_label"),
  sprintLabel: text("sprint_label"),
  environment: text("environment"),
  buildVersion: text("build_version"),
  trigger: text("trigger"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp" })
});

export const testResults = sqliteTable("test_results", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull(),
  testCaseId: text("test_case_id").notNull(),
  status: text("status", { enum: ["passed", "failed", "skipped", "blocked"] }).notNull(),
  durationMs: integer("duration_ms").notNull().default(0),
  attachmentsJson: text("attachments_json"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull()
});

export const runTraceabilitySnapshots = sqliteTable(
  "run_traceability_snapshots",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    projectId: text("project_id").notNull(),
    capturedAt: integer("captured_at", { mode: "timestamp" }).notNull()
  },
  (t) => ({
    runSnapshotRunIdx: index("run_snapshot_run_idx").on(t.runId)
  })
);

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

export const kpiProjectSnapshots = sqliteTable(
  "kpi_project_snapshots",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    snapshotDate: text("snapshot_date").notNull(),
    generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
    payloadJson: text("payload_json").notNull()
  },
  (t) => ({
    kpiProjectSnapshotUniq: uniqueIndex("kpi_project_snapshot_uniq").on(t.projectId, t.snapshotDate)
  })
);

export const kpiRunSnapshots = sqliteTable(
  "kpi_run_snapshots",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    runId: text("run_id").notNull(),
    generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
    payloadJson: text("payload_json").notNull()
  },
  (t) => ({
    kpiRunSnapshotUniq: uniqueIndex("kpi_run_snapshot_uniq").on(t.projectId, t.runId)
  })
);

export const kpiDailySnapshots = sqliteTable(
  "kpi_daily_snapshots",
  {
    id: text("id").primaryKey(),
    projectId: text("project_id").notNull(),
    snapshotDate: text("snapshot_date").notNull(),
    generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
    payloadJson: text("payload_json").notNull()
  },
  (t) => ({
    kpiDailySnapshotUniq: uniqueIndex("kpi_daily_snapshot_uniq").on(t.projectId, t.snapshotDate)
  })
);
