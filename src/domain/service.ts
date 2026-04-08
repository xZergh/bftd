import { and, eq } from "drizzle-orm";
import {
  computeCurrentKpi,
  COVERAGE_FORMULAS,
  recalculateKpiSnapshots,
  normalizeLabel,
  createProject as createProjectRecord,
  createRequirement as createRequirementRecord,
  getProjectSummary as getProjectSummaryStats,
  createAutomatedTestCase as createAutomatedTestCaseRecord,
  createManualTestCase as createManualTestCaseRecord,
  importAutomatedFromTrr as importAutomatedFromTrrBatch,
  importRequirements as importRequirementsBatch,
  createTestRun as createTestRunRecord,
  getRunTraceabilityReport as getRunTraceabilityReportRecord,
  submitTestResult as submitTestResultRecord,
  getRequirementDesignLinks as getRequirementDesignLinksRecords,
  importRequirementDesignLinks as importRequirementDesignLinksBatch,
  unlinkRequirementDesignLink as unlinkRequirementDesignLinkRecord,
  upsertRequirementDesignLink as upsertRequirementDesignLinkRecord
} from "./services";
import {
  kpiDailySnapshots,
  kpiProjectSnapshots,
  kpiRunSnapshots,
  testRuns
} from "../db/schema";

type Db = ReturnType<typeof import("../db/client").createDb>;

export class TcmsService {
  constructor(private readonly db: Db) {}

  async createProject(name: string) {
    return createProjectRecord(this.db, name);
  }

  async createRequirement(input: {
    projectId: string;
    externalKey: string;
    title: string;
    description?: string;
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    return createRequirementRecord(this.db, input);
  }

  async createManualTestCase(input: {
    projectId: string;
    title: string;
    requirementIds: string[];
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    return createManualTestCaseRecord(this.db, input);
  }

  async createAutomatedTestCase(input: {
    projectId: string;
    title: string;
    manualTestCaseIds: string[];
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    return createAutomatedTestCaseRecord(this.db, input);
  }

  async getProjectSummary(input: { projectId: string; releaseLabel?: string; sprintLabel?: string }) {
    return getProjectSummaryStats(this.db, input);
  }

  async createTestRun(input: { projectId: string; name: string; releaseLabel?: string; sprintLabel?: string }) {
    return createTestRunRecord(this.db, input);
  }

  async submitTestResult(input: {
    runId: string;
    testCaseId: string;
    status: "passed" | "failed" | "skipped" | "blocked";
    durationMs?: number;
  }) {
    return submitTestResultRecord(this.db, input);
  }

  async getRunTraceabilityReport(input: { runId: string; releaseLabel?: string; sprintLabel?: string }) {
    return getRunTraceabilityReportRecord(this.db, input);
  }

  async importRequirements(input: {
    projectId: string;
    releaseLabel?: string;
    sprintLabel?: string;
    requirements: Array<{
      externalKey?: string;
      title?: string;
      description?: string;
      releaseLabel?: string;
      sprintLabel?: string;
    }>;
  }) {
    return importRequirementsBatch(this.db, input);
  }

  async importAutomatedFromTrr(input: {
    projectId: string;
    releaseLabel?: string;
    sprintLabel?: string;
    automatedTests: Array<{
      internalTestCaseId?: string;
      externalId?: string;
      title?: string;
      releaseLabel?: string;
      sprintLabel?: string;
      linkedManualCaseIds?: string[];
      steps?: Array<{ order: number; name: string; expectedResult?: string; sourceStepId?: string }>;
    }>;
  }) {
    return importAutomatedFromTrrBatch(this.db, input);
  }

  async recalculateKpiSnapshots(input: { projectId: string; fromDate?: string; toDate?: string }) {
    return recalculateKpiSnapshots(this.db, input);
  }

  async getKpiDashboard(input: { projectId: string; releaseLabel?: string; sprintLabel?: string }) {
    await this.recalculateKpiSnapshots({ projectId: input.projectId });
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
      .select({ payloadJson: kpiDailySnapshots.payloadJson })
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

    const dailyTrend = dailySnaps.map((s) => JSON.parse(s.payloadJson));
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

}
