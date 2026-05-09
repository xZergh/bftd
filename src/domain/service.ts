import { and, eq } from "drizzle-orm";
import {
  appendTestCaseVersion,
  archiveProject as archiveProjectRecord,
  assertKpiDateRange,
  computeCurrentKpi,
  COVERAGE_FORMULAS,
  createAutomatedTestCase as createAutomatedTestCaseSvc,
  createManualTestCase as createManualTestCaseSvc,
  createProject as createProjectRecord,
  createRequirement as createRequirementRecord,
  createTestPlan as createTestPlanRecord,
  createTestRun as createTestRunRecord,
  deleteTestPlan as deleteTestPlanRecord,
  deleteAutomatedTestCase as deleteAutomatedTestCaseSvc,
  deleteManualTestCase as deleteManualTestCaseSvc,
  deleteRequirement as deleteRequirementRecord,
  getProject as getProjectRecord,
  getProjectSummary as getProjectSummaryStats,
  getRequirement as getRequirementRecord,
  getTestPlan as getTestPlanRecord,
  getRequirementDesignLinks as getRequirementDesignLinksRecords,
  getRunAggregate as getRunAggregateRecord,
  getRunTraceabilityReport as getRunTraceabilityReportRecord,
  getTraceabilityGraph as getTraceabilityGraphRecord,
  getTestCase as getTestCaseRecord,
  getTestRun as getTestRunRecord,
  importAutomatedFromTrr as importAutomatedFromTrrBatch,
  importRequirementDesignLinks as importRequirementDesignLinksBatch,
  importRequirements as importRequirementsBatch,
  linkAutomatedManualTestCase as linkAutomatedManual,
  linkRequirementManualTestCase as linkRequirementManual,
  linkTestPlanTestCase as linkTestPlanTestCaseRecord,
  listProjects as listProjectsRecords,
  listRequirements as listRequirementsRecords,
  listTestPlans as listTestPlansRecords,
  listTestCases as listTestCasesRecords,
  listTestCaseVersionHistory,
  listTestRuns as listTestRunsRecords,
  recalculateKpiSnapshots,
  restoreTestCase as restoreTestCaseRecord,
  submitTestResult as submitTestResultRecord,
  tombstoneTestCase as tombstoneTestCaseRecord,
  unlinkAutomatedManualTestCase as unlinkAutomatedManual,
  unlinkRequirementDesignLink as unlinkRequirementDesignLinkRecord,
  unlinkRequirementManualTestCase as unlinkRequirementManual,
  unlinkTestPlanTestCase as unlinkTestPlanTestCaseRecord,
  updateAutomatedTestCase as updateAutomatedTestCaseSvc,
  updateManualTestCase as updateManualTestCaseSvc,
  updateProject as updateProjectRecord,
  updateRequirement as updateRequirementRecord,
  updateTestPlan as updateTestPlanRecord,
  upsertRequirementDesignLink as upsertRequirementDesignLinkRecord
} from "./services";
import { kpiDailySnapshots, kpiProjectSnapshots, kpiRunSnapshots, testRuns } from "../db/schema";
import { normalizeLabel } from "./services/labels";

type Db = ReturnType<typeof import("../db/client").createDb>;

export class TcmsService {
  constructor(private readonly db: Db) {}

  async createProject(name: string, key?: string, description?: string | null) {
    return createProjectRecord(this.db, { name, key, description });
  }

  async listProjects(input?: { includeArchived?: boolean }) {
    return listProjectsRecords(this.db, input);
  }

  async getProject(input: { id?: string; key?: string }) {
    return getProjectRecord(this.db, input);
  }

  async updateProject(input: { id?: string; key?: string; name?: string; keyNew?: string; description?: string | null }) {
    return updateProjectRecord(this.db, input);
  }

  async archiveProject(input: { id?: string; key?: string; archived: boolean }) {
    const row = await archiveProjectRecord(this.db, input);
    return row ?? null;
  }

  async createRequirement(input: {
    projectId: string;
    externalKey: string;
    title: string;
    description?: string;
    releaseLabel?: string;
    sprintLabel?: string;
    requirementType?: string;
    status?: string;
    priority?: string;
    tags?: string[];
    parentRequirementId?: string;
  }) {
    return createRequirementRecord(this.db, input);
  }

  async listRequirements(input: { projectId: string }) {
    return listRequirementsRecords(this.db, input);
  }

  async getRequirement(input: { id: string; projectId?: string }) {
    return getRequirementRecord(this.db, input);
  }

  async updateRequirement(input: Parameters<typeof updateRequirementRecord>[1]) {
    return updateRequirementRecord(this.db, input);
  }

  async deleteRequirement(input: { id: string }) {
    return deleteRequirementRecord(this.db, input);
  }

  async createManualTestCase(input: {
    projectId: string;
    title: string;
    requirementIds: string[];
    steps: Array<{ name: string; expectedResult?: string }>;
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    return createManualTestCaseSvc(this.db, input);
  }

  async createAutomatedTestCase(input: {
    projectId: string;
    title: string;
    manualTestCaseIds: string[];
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    return createAutomatedTestCaseSvc(this.db, input);
  }

  async listTestCases(input: { projectId: string; type?: "manual" | "automated"; includeDeleted?: boolean }) {
    return listTestCasesRecords(this.db, input);
  }

  async getTestCase(input: { id: string; projectId?: string; includeDeleted?: boolean }) {
    return getTestCaseRecord(this.db, input);
  }

  async updateManualTestCase(input: Parameters<typeof updateManualTestCaseSvc>[1]) {
    return updateManualTestCaseSvc(this.db, input);
  }

  async updateAutomatedTestCase(input: Parameters<typeof updateAutomatedTestCaseSvc>[1]) {
    return updateAutomatedTestCaseSvc(this.db, input);
  }

  async deleteManualTestCase(input: { id: string }) {
    return deleteManualTestCaseSvc(this.db, input);
  }

  async deleteAutomatedTestCase(input: { id: string }) {
    return deleteAutomatedTestCaseSvc(this.db, input);
  }

  async linkRequirementManualTestCase(input: { projectId: string; requirementId: string; manualTestCaseId: string }) {
    return linkRequirementManual(this.db, input);
  }

  async unlinkRequirementManualTestCase(input: { requirementId: string; manualTestCaseId: string }) {
    return unlinkRequirementManual(this.db, input);
  }

  async linkAutomatedManualTestCase(input: { projectId: string; automatedTestCaseId: string; manualTestCaseId: string }) {
    return linkAutomatedManual(this.db, input);
  }

  async unlinkAutomatedManualTestCase(input: { automatedTestCaseId: string; manualTestCaseId: string }) {
    return unlinkAutomatedManual(this.db, input);
  }

  async listTestCaseVersionHistory(input: { testCaseId: string; includeDeleted?: boolean }) {
    return listTestCaseVersionHistory(this.db, input);
  }

  async tombstoneTestCase(input: { testCaseId: string }) {
    return tombstoneTestCaseRecord(this.db, input);
  }

  async restoreTestCase(input: { testCaseId: string }) {
    return restoreTestCaseRecord(this.db, input);
  }

  async getProjectSummary(input: { projectId: string; releaseLabel?: string; sprintLabel?: string }) {
    return getProjectSummaryStats(this.db, input);
  }

  async createTestRun(input: {
    projectId: string;
    name: string;
    releaseLabel?: string;
    sprintLabel?: string;
    environment?: string;
    buildVersion?: string;
    trigger?: string;
    finishedAt?: string;
    testPlanId?: string;
  }) {
    return createTestRunRecord(this.db, input);
  }

  async createTestPlan(input: {
    projectId: string;
    name: string;
    description?: string;
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    return createTestPlanRecord(this.db, input);
  }

  async listTestPlans(input: { projectId: string }) {
    return listTestPlansRecords(this.db, input);
  }

  async getTestPlan(input: { id: string; projectId?: string }) {
    return getTestPlanRecord(this.db, input);
  }

  async updateTestPlan(input: {
    id: string;
    name?: string;
    description?: string | null;
    releaseLabel?: string | null;
    sprintLabel?: string | null;
  }) {
    return updateTestPlanRecord(this.db, input);
  }

  async deleteTestPlan(input: { id: string }) {
    return deleteTestPlanRecord(this.db, input);
  }

  async linkTestPlanTestCase(input: { testPlanId: string; testCaseId: string }) {
    return linkTestPlanTestCaseRecord(this.db, input);
  }

  async unlinkTestPlanTestCase(input: { testPlanId: string; testCaseId: string }) {
    return unlinkTestPlanTestCaseRecord(this.db, input);
  }

  async listTestRuns(input: { projectId: string }) {
    return listTestRunsRecords(this.db, input);
  }

  async getTestRun(input: { runId: string; projectId?: string }) {
    return getTestRunRecord(this.db, input);
  }

  async getRunAggregate(input: { runId: string }) {
    return getRunAggregateRecord(this.db, input);
  }

  async submitTestResult(input: {
    runId: string;
    testCaseId: string;
    status: "passed" | "failed" | "skipped" | "blocked" | "not_run";
    durationMs?: number;
    attachments?: Array<{ kind: string; ref: string }>;
  }) {
    return submitTestResultRecord(this.db, input);
  }

  async getRunTraceabilityReport(input: { runId: string; releaseLabel?: string; sprintLabel?: string }) {
    return getRunTraceabilityReportRecord(this.db, input);
  }

  async getTraceabilityGraph(input: { projectId: string }) {
    return getTraceabilityGraphRecord(this.db, input);
  }

  async importRequirements(input: {
    projectId?: string;
    projectKey?: string;
    releaseLabel?: string;
    sprintLabel?: string;
    requirements: Array<{
      externalKey?: string;
      title?: string;
      description?: string;
      releaseLabel?: string;
      sprintLabel?: string;
      requirementType?: string;
      status?: string;
      priority?: string;
      tags?: string[];
      parentExternalKey?: string;
    }>;
  }) {
    return importRequirementsBatch(this.db, input);
  }

  async importAutomatedFromTrr(input: {
    projectId?: string;
    projectKey?: string;
    releaseLabel?: string;
    sprintLabel?: string;
    automatedTests: Array<{
      internalTestCaseId?: string;
      externalId?: string;
      title?: string;
      releaseLabel?: string;
      sprintLabel?: string;
      linkedManualCaseIds?: string[];
      steps?: Array<{
        order: number;
        name: string;
        expectedResult?: string;
        sourceStepId?: string;
        parentStepId?: string;
        metaJson?: string;
      }>;
    }>;
  }) {
    return importAutomatedFromTrrBatch(this.db, input);
  }

  async recalculateKpiSnapshots(input: {
    projectId: string;
    fromDate?: string;
    toDate?: string;
    fullRebuild?: boolean;
  }) {
    return recalculateKpiSnapshots(this.db, input);
  }

  async getKpiDashboard(input: {
    projectId: string;
    releaseLabel?: string;
    sprintLabel?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    assertKpiDateRange(input.fromDate, input.toDate);
    await this.recalculateKpiSnapshots({ projectId: input.projectId, fromDate: input.fromDate, toDate: input.toDate });
    const releaseLabel = normalizeLabel(input.releaseLabel);
    const sprintLabel = normalizeLabel(input.sprintLabel);
    const currentSnap = await this.db
      .select({ payloadJson: kpiProjectSnapshots.payloadJson, generatedAt: kpiProjectSnapshots.generatedAt })
      .from(kpiProjectSnapshots)
      .where(eq(kpiProjectSnapshots.projectId, input.projectId));
    const runSnaps = await this.db
      .select({ payloadJson: kpiRunSnapshots.payloadJson })
      .from(kpiRunSnapshots)
      .where(eq(kpiRunSnapshots.projectId, input.projectId));
    const dailySnaps = await this.db
      .select({ payloadJson: kpiDailySnapshots.payloadJson, snapshotDate: kpiDailySnapshots.snapshotDate })
      .from(kpiDailySnapshots)
      .where(eq(kpiDailySnapshots.projectId, input.projectId));

    const current = currentSnap.length
      ? JSON.parse(currentSnap[currentSnap.length - 1].payloadJson)
      : await computeCurrentKpi(this.db, input.projectId, releaseLabel, sprintLabel);
    const generatedAt = currentSnap.length
      ? currentSnap[currentSnap.length - 1].generatedAt.toISOString()
      : new Date().toISOString();

    let perRun = runSnaps.map((s) => JSON.parse(s.payloadJson));
    if (releaseLabel || sprintLabel) {
      const runs = await this.db
        .select({
          id: testRuns.id,
          releaseLabel: testRuns.releaseLabel,
          sprintLabel: testRuns.sprintLabel
        })
        .from(testRuns)
        .where(
          and(
            eq(testRuns.projectId, input.projectId),
            releaseLabel ? eq(testRuns.releaseLabel, releaseLabel) : undefined,
            sprintLabel ? eq(testRuns.sprintLabel, sprintLabel) : undefined
          )
        );
      const runSet = new Set(runs.map((r) => r.id));
      perRun = perRun.filter((r: { runId: string }) => runSet.has(r.runId));
    }
    perRun.sort((a: { runStartedAt: string }, b: { runStartedAt: string }) =>
      a.runStartedAt < b.runStartedAt ? 1 : -1
    );

    let dailyTrend = dailySnaps.map((s) => JSON.parse(s.payloadJson));
    if (input.fromDate || input.toDate) {
      const from = input.fromDate ?? "0000-01-01";
      const to = input.toDate ?? "9999-12-31";
      dailyTrend = dailyTrend.filter((d: { date: string }) => d.date >= from && d.date <= to);
    }
    dailyTrend.sort((a: { date: string }, b: { date: string }) => (a.date > b.date ? 1 : -1));

    return {
      projectId: input.projectId,
      generatedAt,
      coverageFormulaInfo: COVERAGE_FORMULAS,
      current,
      perRun,
      dailyTrend
    };
  }

  async upsertRequirementDesignLink(input: {
    projectId: string;
    provider: string;
    requirementId?: string;
    requirementKey?: string;
    designProjectId?: string;
    designFileId?: string;
    designPageId?: string;
    designNodeId?: string;
    shareUrl: string;
    title?: string;
    lastSyncedAt?: string;
  }) {
    return upsertRequirementDesignLinkRecord(this.db, input);
  }

  async unlinkRequirementDesignLink(input: { projectId: string; requirementId: string; provider: string; shareUrl: string }) {
    return unlinkRequirementDesignLinkRecord(this.db, input);
  }

  async getRequirementDesignLinks(input: { projectId: string; requirementId?: string }) {
    return getRequirementDesignLinksRecords(this.db, input);
  }

  async importRequirementDesignLinks(input: {
    projectId: string;
    provider: string;
    links: Array<{
      requirementId?: string;
      requirementKey?: string;
      designProjectId?: string;
      designFileId?: string;
      designPageId?: string;
      designNodeId?: string;
      shareUrl?: string;
      title?: string;
      lastSyncedAt?: string;
    }>;
  }) {
    return importRequirementDesignLinksBatch(this.db, input);
  }

  async appendTestCaseVersionForTest(testCaseId: string) {
    return appendTestCaseVersion(this.db, testCaseId);
  }
}
