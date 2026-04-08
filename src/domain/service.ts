import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "./errors";
import {
  automatedManualLinks,
  kpiDailySnapshots,
  kpiProjectSnapshots,
  kpiRunSnapshots,
  projects,
  requirementDesignLinks,
  requirementTestCaseLinks,
  requirements,
  runTraceabilityEdges,
  runTraceabilitySnapshots,
  testCases,
  testCaseSteps,
  testResults,
  testRuns
} from "../db/schema";

type Db = ReturnType<typeof import("../db/client").createDb>;

function now() {
  return new Date();
}

type CoverageFormulaInfo = {
  formulaId: string;
  label: string;
  description: string;
  numeratorLabel: string;
  denominatorLabel: string;
  expression: string;
  scope: string;
};

type CoverageMetricValue = {
  formulaId: string;
  valuePct: number;
  numerator: number;
  denominator: number;
};

const COVERAGE_FORMULAS: CoverageFormulaInfo[] = [
  {
    formulaId: "requirement_coverage",
    label: "Requirement Coverage",
    description: "Covered requirements over total requirements",
    numeratorLabel: "Covered requirements",
    denominatorLabel: "Total requirements",
    expression: "coveredRequirements / totalRequirements * 100",
    scope: "project_current,daily_trend"
  },
  {
    formulaId: "testcase_coverage",
    label: "Testcase Coverage",
    description: "Manual testcases linked to requirements over total manual testcases",
    numeratorLabel: "Manual testcases linked to requirements",
    denominatorLabel: "Total manual testcases",
    expression: "manualCasesLinkedToRequirements / totalManualCases * 100",
    scope: "project_current,daily_trend"
  },
  {
    formulaId: "automation_coverage_manual",
    label: "Automation Coverage (Manual)",
    description: "Manual cases with at least one automated link over total manual cases",
    numeratorLabel: "Manual cases with automation",
    denominatorLabel: "Total manual cases",
    expression: "manualCasesWithAutomation / totalManualCases * 100",
    scope: "project_current,daily_trend"
  },
  {
    formulaId: "automation_coverage_requirement",
    label: "Automation Coverage (Requirement)",
    description: "Requirements linked to any automated testcase over total requirements",
    numeratorLabel: "Requirements with automation",
    denominatorLabel: "Total requirements",
    expression: "requirementsWithAutomation / totalRequirements * 100",
    scope: "project_current,daily_trend"
  }
];

function pct(numerator: number, denominator: number) {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

export class TcmsService {
  constructor(private readonly db: Db) {}

  private normalizeLabel(value?: string) {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  async createProject(name: string) {
    const project = {
      id: randomUUID(),
      name,
      isArchived: false,
      createdAt: now(),
      updatedAt: now()
    };
    await this.db.insert(projects).values(project);
    return project;
  }

  async createRequirement(input: {
    projectId: string;
    externalKey: string;
    title: string;
    description?: string;
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    const req = {
      id: randomUUID(),
      projectId: input.projectId,
      externalKey: input.externalKey,
      title: input.title,
      description: input.description ?? null,
      releaseLabel: this.normalizeLabel(input.releaseLabel),
      sprintLabel: this.normalizeLabel(input.sprintLabel),
      createdAt: now(),
      updatedAt: now()
    };
    await this.db.insert(requirements).values(req);
    return req;
  }

  async createManualTestCase(input: {
    projectId: string;
    title: string;
    requirementIds: string[];
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    if (input.requirementIds.length === 0) {
      throw new AppError(
        "REQUIREMENT_PARENT_REQUIRED",
        "Manual testcase requires at least one linked requirement.",
        "Provide at least one valid requirement id in requirementIds.",
        { requirementIds: input.requirementIds }
      );
    }

    const linkedReqs = await this.db
      .select({ id: requirements.id })
      .from(requirements)
      .where(eq(requirements.projectId, input.projectId));
    const set = new Set(linkedReqs.map((r) => r.id));
    const missing = input.requirementIds.filter((id) => !set.has(id));
    if (missing.length > 0) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "One or more requirements were not found for this project.",
        "Ensure all requirementIds belong to the target project.",
        { missingRequirementIds: missing }
      );
    }

    const tc = {
      id: randomUUID(),
      projectId: input.projectId,
      externalId: null,
      type: "manual" as const,
      title: input.title,
      releaseLabel: this.normalizeLabel(input.releaseLabel),
      sprintLabel: this.normalizeLabel(input.sprintLabel),
      createdAt: now(),
      updatedAt: now()
    };
    await this.db.insert(testCases).values(tc);

    if (input.requirementIds.length > 0) {
      await this.db.insert(requirementTestCaseLinks).values(
        input.requirementIds.map((rid) => ({
          id: randomUUID(),
          requirementId: rid,
          manualTestCaseId: tc.id
        }))
      );
    }
    return tc;
  }

  async createAutomatedTestCase(input: {
    projectId: string;
    title: string;
    manualTestCaseIds: string[];
    releaseLabel?: string;
    sprintLabel?: string;
  }) {
    if (input.manualTestCaseIds.length === 0) {
      throw new AppError(
        "MANUAL_LINK_REQUIRED",
        "Automated testcase requires at least one linked manual testcase.",
        "Provide at least one valid manual test id in manualTestCaseIds.",
        { manualTestCaseIds: input.manualTestCaseIds }
      );
    }

    const manuals = await this.db
      .select({ id: testCases.id, type: testCases.type })
      .from(testCases)
      .where(eq(testCases.projectId, input.projectId));
    const manualIds = new Set(manuals.filter((m) => m.type === "manual").map((m) => m.id));
    const missing = input.manualTestCaseIds.filter((id) => !manualIds.has(id));
    if (missing.length > 0) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "One or more manual testcases were not found for this project.",
        "Ensure all manualTestCaseIds point to manual tests in the same project.",
        { missingManualTestCaseIds: missing }
      );
    }

    const tc = {
      id: randomUUID(),
      projectId: input.projectId,
      externalId: null,
      type: "automated" as const,
      title: input.title,
      releaseLabel: this.normalizeLabel(input.releaseLabel),
      sprintLabel: this.normalizeLabel(input.sprintLabel),
      createdAt: now(),
      updatedAt: now()
    };
    await this.db.insert(testCases).values(tc);
    await this.db.insert(automatedManualLinks).values(
      input.manualTestCaseIds.map((mid) => ({
        id: randomUUID(),
        automatedTestCaseId: tc.id,
        manualTestCaseId: mid
      }))
    );
    return tc;
  }

  async getProjectSummary(input: { projectId: string; releaseLabel?: string; sprintLabel?: string }) {
    const releaseLabel = this.normalizeLabel(input.releaseLabel);
    const sprintLabel = this.normalizeLabel(input.sprintLabel);
    const reqCount = await this.db
      .select({ id: requirements.id })
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, input.projectId),
          releaseLabel ? eq(requirements.releaseLabel, releaseLabel) : undefined,
          sprintLabel ? eq(requirements.sprintLabel, sprintLabel) : undefined
        )
      );
    const caseRows = await this.db
      .select({ id: testCases.id, type: testCases.type })
      .from(testCases)
      .where(
        and(
          eq(testCases.projectId, input.projectId),
          releaseLabel ? eq(testCases.releaseLabel, releaseLabel) : undefined,
          sprintLabel ? eq(testCases.sprintLabel, sprintLabel) : undefined
        )
      );
    return {
      totalRequirements: reqCount.length,
      totalManualCases: caseRows.filter((c) => c.type === "manual").length,
      totalAutomatedCases: caseRows.filter((c) => c.type === "automated").length
    };
  }

  async createTestRun(input: { projectId: string; name: string; releaseLabel?: string; sprintLabel?: string }) {
    const run = {
      id: randomUUID(),
      projectId: input.projectId,
      name: input.name,
      releaseLabel: this.normalizeLabel(input.releaseLabel),
      sprintLabel: this.normalizeLabel(input.sprintLabel),
      createdAt: now()
    };
    await this.db.insert(testRuns).values(run);
    await this.captureRunSnapshot(run.id, input.projectId);
    return run;
  }

  async submitTestResult(input: {
    runId: string;
    testCaseId: string;
    status: "passed" | "failed" | "skipped" | "blocked";
    durationMs?: number;
  }) {
    const run = await this.db
      .select({ id: testRuns.id, projectId: testRuns.projectId })
      .from(testRuns)
      .where(eq(testRuns.id, input.runId));
    if (run.length === 0) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Test run not found.",
        "Create a test run before submitting results.",
        { runId: input.runId }
      );
    }
    const tc = await this.db
      .select({ id: testCases.id, projectId: testCases.projectId })
      .from(testCases)
      .where(eq(testCases.id, input.testCaseId));
    if (tc.length === 0 || tc[0].projectId !== run[0].projectId) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Testcase not found in the run project scope.",
        "Ensure testCaseId belongs to the same project as the run.",
        { runId: input.runId, testCaseId: input.testCaseId }
      );
    }

    const result = {
      id: randomUUID(),
      runId: input.runId,
      testCaseId: input.testCaseId,
      status: input.status,
      durationMs: input.durationMs ?? 0,
      createdAt: now()
    };
    await this.db.insert(testResults).values(result);
    return result;
  }

  async getRunTraceabilityReport(input: { runId: string; releaseLabel?: string; sprintLabel?: string }) {
    const releaseLabel = this.normalizeLabel(input.releaseLabel);
    const sprintLabel = this.normalizeLabel(input.sprintLabel);
    const snapshots = await this.db
      .select({
        id: runTraceabilitySnapshots.id,
        runId: runTraceabilitySnapshots.runId,
        projectId: runTraceabilitySnapshots.projectId,
        capturedAt: runTraceabilitySnapshots.capturedAt
      })
      .from(runTraceabilitySnapshots)
      .where(eq(runTraceabilitySnapshots.runId, input.runId));

    if (snapshots.length === 0) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Run snapshot not found.",
        "Create a test run to capture traceability snapshot.",
        { runId: input.runId }
      );
    }

    const snapshot = snapshots[0];
    const runRows = await this.db
      .select({
        id: testRuns.id,
        releaseLabel: testRuns.releaseLabel,
        sprintLabel: testRuns.sprintLabel
      })
      .from(testRuns)
      .where(eq(testRuns.id, snapshot.runId));
    if (
      runRows.length === 0 ||
      (releaseLabel && runRows[0].releaseLabel !== releaseLabel) ||
      (sprintLabel && runRows[0].sprintLabel !== sprintLabel)
    ) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Run not found for provided label filters.",
        "Use a runId and label filters that point to the same test run.",
        { runId: input.runId, releaseLabel, sprintLabel }
      );
    }
    const edges = await this.db
      .select({
        requirementId: runTraceabilityEdges.requirementId,
        manualTestCaseId: runTraceabilityEdges.manualTestCaseId,
        automatedTestCaseId: runTraceabilityEdges.automatedTestCaseId
      })
      .from(runTraceabilityEdges)
      .where(eq(runTraceabilityEdges.runSnapshotId, snapshot.id));

    return {
      runId: snapshot.runId,
      projectId: snapshot.projectId,
      capturedAt: snapshot.capturedAt.toISOString(),
      edges: edges.map((e) => ({
        requirementId: e.requirementId,
        manualTestCaseId: e.manualTestCaseId,
        automatedTestCaseId: e.automatedTestCaseId
      }))
    };
  }

  private async captureRunSnapshot(runId: string, projectId: string) {
    const snapshotId = randomUUID();
    await this.db.insert(runTraceabilitySnapshots).values({
      id: snapshotId,
      runId,
      projectId,
      capturedAt: now()
    });

    const reqManualRows = await this.db
      .select({
        requirementId: requirementTestCaseLinks.requirementId,
        manualTestCaseId: requirementTestCaseLinks.manualTestCaseId
      })
      .from(requirementTestCaseLinks);

    if (reqManualRows.length === 0) return;

    const manualIds = [...new Set(reqManualRows.map((r) => r.manualTestCaseId))];
    const manuals = await this.db
      .select({ id: testCases.id, projectId: testCases.projectId, type: testCases.type })
      .from(testCases)
      .where(inArray(testCases.id, manualIds));
    const manualSet = new Set(
      manuals
        .filter((m) => m.projectId === projectId && m.type === "manual")
        .map((m) => m.id)
    );

    const reqManualInProject = reqManualRows.filter((r) => manualSet.has(r.manualTestCaseId));
    if (reqManualInProject.length === 0) return;

    const autoLinks = await this.db
      .select({
        automatedTestCaseId: automatedManualLinks.automatedTestCaseId,
        manualTestCaseId: automatedManualLinks.manualTestCaseId
      })
      .from(automatedManualLinks)
      .where(inArray(automatedManualLinks.manualTestCaseId, [...manualSet]));
    const automatedIds = [...new Set(autoLinks.map((a) => a.automatedTestCaseId))];

    const autos = automatedIds.length
      ? await this.db
          .select({ id: testCases.id, projectId: testCases.projectId, type: testCases.type })
          .from(testCases)
          .where(inArray(testCases.id, automatedIds))
      : [];
    const autoSet = new Set(
      autos
        .filter((a) => a.projectId === projectId && a.type === "automated")
        .map((a) => a.id)
    );

    const rows: Array<{
      id: string;
      runSnapshotId: string;
      requirementId: string;
      manualTestCaseId: string;
      automatedTestCaseId: string | null;
    }> = [];
    const uniq = new Set<string>();

    for (const rm of reqManualInProject) {
      const linkedAutos = autoLinks
        .filter((l) => l.manualTestCaseId === rm.manualTestCaseId && autoSet.has(l.automatedTestCaseId))
        .map((l) => l.automatedTestCaseId);
      if (linkedAutos.length === 0) {
        const key = `${rm.requirementId}|${rm.manualTestCaseId}|`;
        if (!uniq.has(key)) {
          uniq.add(key);
          rows.push({
            id: randomUUID(),
            runSnapshotId: snapshotId,
            requirementId: rm.requirementId,
            manualTestCaseId: rm.manualTestCaseId,
            automatedTestCaseId: null
          });
        }
        continue;
      }
      for (const autoId of linkedAutos) {
        const key = `${rm.requirementId}|${rm.manualTestCaseId}|${autoId}`;
        if (!uniq.has(key)) {
          uniq.add(key);
          rows.push({
            id: randomUUID(),
            runSnapshotId: snapshotId,
            requirementId: rm.requirementId,
            manualTestCaseId: rm.manualTestCaseId,
            automatedTestCaseId: autoId
          });
        }
      }
    }

    if (rows.length > 0) {
      await this.db.insert(runTraceabilityEdges).values(rows);
    }
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
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ index: number; code: string; message: string; fixHint: string }> = [];
    const warnings: Array<{ index: number; message: string }> = [];

    for (let i = 0; i < input.requirements.length; i += 1) {
      const item = input.requirements[i];
      if (!item.externalKey || !item.title) {
        skippedCount += 1;
        errors.push({
          index: i,
          code: "INVALID_IMPORT_SCHEMA",
          message: "Requirement item missing externalKey or title.",
          fixHint: "Provide both externalKey and title for each requirement item."
        });
        continue;
      }

      const existing = await this.db
        .select({ id: requirements.id })
        .from(requirements)
        .where(and(eq(requirements.projectId, input.projectId), eq(requirements.externalKey, item.externalKey)));

      if (existing.length === 0) {
        await this.db.insert(requirements).values({
          id: randomUUID(),
          projectId: input.projectId,
          externalKey: item.externalKey,
          title: item.title,
          description: item.description ?? null,
          releaseLabel: this.normalizeLabel(item.releaseLabel ?? input.releaseLabel),
          sprintLabel: this.normalizeLabel(item.sprintLabel ?? input.sprintLabel),
          createdAt: now(),
          updatedAt: now()
        });
        createdCount += 1;
      } else {
        await this.db
          .update(requirements)
          .set({
            title: item.title,
            description: item.description ?? null,
            releaseLabel: this.normalizeLabel(item.releaseLabel ?? input.releaseLabel),
            sprintLabel: this.normalizeLabel(item.sprintLabel ?? input.sprintLabel),
            updatedAt: now()
          })
          .where(eq(requirements.id, existing[0].id));
        updatedCount += 1;
      }
      if (!item.description) {
        warnings.push({ index: i, message: "No description provided." });
      }
    }

    return { createdCount, updatedCount, skippedCount, errors, warnings };
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
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ index: number; code: string; message: string; fixHint: string }> = [];

    const projectCases = await this.db
      .select({ id: testCases.id, type: testCases.type, projectId: testCases.projectId, externalId: testCases.externalId })
      .from(testCases)
      .where(eq(testCases.projectId, input.projectId));
    const manualSet = new Set(projectCases.filter((c) => c.type === "manual").map((c) => c.id));

    for (let i = 0; i < input.automatedTests.length; i += 1) {
      const item = input.automatedTests[i];
      if (!item.internalTestCaseId && !item.externalId) {
        skippedCount += 1;
        errors.push({
          index: i,
          code: "TRR_IMPORT_INVALID",
          message: "Missing automated testcase identity.",
          fixHint: "Provide internalTestCaseId or externalId."
        });
        continue;
      }
      if (!item.title) {
        skippedCount += 1;
        errors.push({
          index: i,
          code: "TRR_IMPORT_INVALID",
          message: "Missing automated testcase title.",
          fixHint: "Provide title in TRR item."
        });
        continue;
      }
      if (!item.linkedManualCaseIds || item.linkedManualCaseIds.length === 0) {
        skippedCount += 1;
        errors.push({
          index: i,
          code: "MANUAL_LINK_REQUIRED",
          message: "Automated testcase requires at least one manual link.",
          fixHint: "Provide linkedManualCaseIds with at least one valid manual testcase id."
        });
        continue;
      }
      const badManual = item.linkedManualCaseIds.filter((id) => !manualSet.has(id));
      if (badManual.length > 0) {
        skippedCount += 1;
        errors.push({
          index: i,
          code: "ENTITY_NOT_FOUND",
          message: "One or more linked manual testcases were not found.",
          fixHint: "Ensure linkedManualCaseIds belong to manual testcases in the same project."
        });
        continue;
      }

      let automatedId: string | null = null;
      if (item.internalTestCaseId) {
        const existingByInternal = projectCases.find(
          (c) => c.id === item.internalTestCaseId && c.type === "automated"
        );
        if (existingByInternal) automatedId = existingByInternal.id;
      } else if (item.externalId) {
        const existingByExternal = projectCases.find(
          (c) => c.externalId === item.externalId && c.type === "automated"
        );
        if (existingByExternal) automatedId = existingByExternal.id;
      }

      if (!automatedId) {
        automatedId = randomUUID();
        await this.db.insert(testCases).values({
          id: automatedId,
          projectId: input.projectId,
          externalId: item.externalId ?? null,
          type: "automated",
          title: item.title,
          releaseLabel: this.normalizeLabel(item.releaseLabel ?? input.releaseLabel),
          sprintLabel: this.normalizeLabel(item.sprintLabel ?? input.sprintLabel),
          createdAt: now(),
          updatedAt: now()
        });
        createdCount += 1;
      } else {
        await this.db
          .update(testCases)
          .set({
            title: item.title,
            externalId: item.externalId ?? null,
            releaseLabel: this.normalizeLabel(item.releaseLabel ?? input.releaseLabel),
            sprintLabel: this.normalizeLabel(item.sprintLabel ?? input.sprintLabel),
            updatedAt: now()
          })
          .where(eq(testCases.id, automatedId));
        await this.db
          .delete(automatedManualLinks)
          .where(eq(automatedManualLinks.automatedTestCaseId, automatedId));
        await this.db.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, automatedId));
        updatedCount += 1;
      }

      await this.db.insert(automatedManualLinks).values(
        item.linkedManualCaseIds.map((mid) => ({
          id: randomUUID(),
          automatedTestCaseId: automatedId!,
          manualTestCaseId: mid
        }))
      );

      const steps = (item.steps ?? [])
        .sort((a, b) => a.order - b.order)
        .map((s, idx) => ({
          id: randomUUID(),
          testCaseId: automatedId!,
          stepOrder: idx + 1,
          name: s.name,
          expectedResult: s.expectedResult ?? null,
          sourceStepId: s.sourceStepId ?? null
        }));
      if (steps.length > 0) {
        await this.db.insert(testCaseSteps).values(steps);
      }
    }

    return { createdCount, updatedCount, skippedCount, errors };
  }

  async recalculateKpiSnapshots(input: { projectId: string; fromDate?: string; toDate?: string }) {
    const current = await this.computeCurrentKpi(input.projectId);
    const today = new Date().toISOString().slice(0, 10);
    const nowTs = now();

    const existingProject = await this.db
      .select({ id: kpiProjectSnapshots.id })
      .from(kpiProjectSnapshots)
      .where(and(eq(kpiProjectSnapshots.projectId, input.projectId), eq(kpiProjectSnapshots.snapshotDate, today)));
    if (existingProject.length === 0) {
      await this.db.insert(kpiProjectSnapshots).values({
        id: randomUUID(),
        projectId: input.projectId,
        snapshotDate: today,
        generatedAt: nowTs,
        payloadJson: JSON.stringify(current)
      });
    } else {
      await this.db
        .update(kpiProjectSnapshots)
        .set({ generatedAt: nowTs, payloadJson: JSON.stringify(current) })
        .where(eq(kpiProjectSnapshots.id, existingProject[0].id));
    }

    const runs = await this.db
      .select({ id: testRuns.id, createdAt: testRuns.createdAt })
      .from(testRuns)
      .where(eq(testRuns.projectId, input.projectId));
    let runSnapshotsUpdated = 0;
    for (const run of runs) {
      const stats = await this.computeRunStats(run.id);
      const existing = await this.db
        .select({ id: kpiRunSnapshots.id })
        .from(kpiRunSnapshots)
        .where(and(eq(kpiRunSnapshots.projectId, input.projectId), eq(kpiRunSnapshots.runId, run.id)));
      if (existing.length === 0) {
        await this.db.insert(kpiRunSnapshots).values({
          id: randomUUID(),
          projectId: input.projectId,
          runId: run.id,
          generatedAt: nowTs,
          payloadJson: JSON.stringify(stats)
        });
      } else {
        await this.db
          .update(kpiRunSnapshots)
          .set({ generatedAt: nowTs, payloadJson: JSON.stringify(stats) })
          .where(eq(kpiRunSnapshots.id, existing[0].id));
      }
      runSnapshotsUpdated += 1;
    }

    const dateMap = new Map<string, number>();
    for (const r of runs) {
      const d = r.createdAt.toISOString().slice(0, 10);
      dateMap.set(d, (dateMap.get(d) ?? 0) + 1);
    }
    let dailySnapshotsUpdated = 0;
    for (const [date, totalTestRuns] of dateMap) {
      const payload = {
        date,
        coverage: current.coverage,
        totalTestRuns
      };
      const existing = await this.db
        .select({ id: kpiDailySnapshots.id })
        .from(kpiDailySnapshots)
        .where(and(eq(kpiDailySnapshots.projectId, input.projectId), eq(kpiDailySnapshots.snapshotDate, date)));
      if (existing.length === 0) {
        await this.db.insert(kpiDailySnapshots).values({
          id: randomUUID(),
          projectId: input.projectId,
          snapshotDate: date,
          generatedAt: nowTs,
          payloadJson: JSON.stringify(payload)
        });
      } else {
        await this.db
          .update(kpiDailySnapshots)
          .set({ generatedAt: nowTs, payloadJson: JSON.stringify(payload) })
          .where(eq(kpiDailySnapshots.id, existing[0].id));
      }
      dailySnapshotsUpdated += 1;
    }

    return {
      projectId: input.projectId,
      fromDate: input.fromDate ?? null,
      toDate: input.toDate ?? null,
      projectSnapshotsUpdated: 1,
      runSnapshotsUpdated,
      dailySnapshotsUpdated,
      completedAt: nowTs.toISOString()
    };
  }

  async getKpiDashboard(input: { projectId: string; releaseLabel?: string; sprintLabel?: string }) {
    await this.recalculateKpiSnapshots({ projectId: input.projectId });
    const releaseLabel = this.normalizeLabel(input.releaseLabel);
    const sprintLabel = this.normalizeLabel(input.sprintLabel);
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
      : await this.computeCurrentKpi(input.projectId, releaseLabel, sprintLabel);
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
    if (input.provider !== "penpot") {
      throw new AppError(
        "VALIDATION_ERROR",
        "Unsupported design provider.",
        "Use provider 'penpot' for MVP.",
        { provider: input.provider }
      );
    }
    if (!input.shareUrl.startsWith("https://")) {
      throw new AppError(
        "VALIDATION_ERROR",
        "Invalid design share URL.",
        "Provide a valid HTTPS shareUrl.",
        { shareUrl: input.shareUrl }
      );
    }

    let requirementId = input.requirementId ?? null;
    if (!requirementId && input.requirementKey) {
      const byKey = await this.db
        .select({ id: requirements.id })
        .from(requirements)
        .where(and(eq(requirements.projectId, input.projectId), eq(requirements.externalKey, input.requirementKey)));
      if (byKey.length > 0) requirementId = byKey[0].id;
    }
    if (!requirementId) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Requirement link target not found.",
        "Provide requirementId or requirementKey that exists in the project.",
        { requirementId: input.requirementId ?? null, requirementKey: input.requirementKey ?? null }
      );
    }

    const req = await this.db
      .select({ id: requirements.id, projectId: requirements.projectId })
      .from(requirements)
      .where(eq(requirements.id, requirementId));
    if (req.length === 0 || req[0].projectId !== input.projectId) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Requirement is not in the target project.",
        "Use a requirementId that belongs to projectId.",
        { requirementId, projectId: input.projectId }
      );
    }

    const candidates = await this.db
      .select({ id: requirementDesignLinks.id, designNodeId: requirementDesignLinks.designNodeId })
      .from(requirementDesignLinks)
      .where(
        and(
          eq(requirementDesignLinks.requirementId, requirementId),
          eq(requirementDesignLinks.provider, input.provider),
          eq(requirementDesignLinks.shareUrl, input.shareUrl)
        )
      );
    const existing = candidates.filter((c) => (c.designNodeId ?? null) === (input.designNodeId ?? null));

    const parsedSyncedAt = input.lastSyncedAt ? new Date(input.lastSyncedAt) : null;
    if (existing.length === 0) {
      const row = {
        id: randomUUID(),
        projectId: input.projectId,
        requirementId,
        provider: input.provider,
        designProjectId: input.designProjectId ?? null,
        designFileId: input.designFileId ?? null,
        designPageId: input.designPageId ?? null,
        designNodeId: input.designNodeId ?? null,
        shareUrl: input.shareUrl,
        title: input.title ?? null,
        lastSyncedAt: parsedSyncedAt,
        createdAt: now(),
        updatedAt: now()
      };
      await this.db.insert(requirementDesignLinks).values(row);
      return row;
    }

    const updated = {
      designProjectId: input.designProjectId ?? null,
      designFileId: input.designFileId ?? null,
      designPageId: input.designPageId ?? null,
      designNodeId: input.designNodeId ?? null,
      title: input.title ?? null,
      lastSyncedAt: parsedSyncedAt,
      updatedAt: now()
    };
    await this.db
      .update(requirementDesignLinks)
      .set(updated)
      .where(eq(requirementDesignLinks.id, existing[0].id));

    return {
      id: existing[0].id,
      projectId: input.projectId,
      requirementId,
      provider: input.provider,
      shareUrl: input.shareUrl,
      ...updated
    };
  }

  async unlinkRequirementDesignLink(input: { projectId: string; requirementId: string; provider: string; shareUrl: string }) {
    await this.db
      .delete(requirementDesignLinks)
      .where(
        and(
          eq(requirementDesignLinks.projectId, input.projectId),
          eq(requirementDesignLinks.requirementId, input.requirementId),
          eq(requirementDesignLinks.provider, input.provider),
          eq(requirementDesignLinks.shareUrl, input.shareUrl)
        )
      );
    return { success: true };
  }

  async getRequirementDesignLinks(input: { projectId: string; requirementId?: string }) {
    const rows = await this.db
      .select({
        id: requirementDesignLinks.id,
        projectId: requirementDesignLinks.projectId,
        requirementId: requirementDesignLinks.requirementId,
        provider: requirementDesignLinks.provider,
        designProjectId: requirementDesignLinks.designProjectId,
        designFileId: requirementDesignLinks.designFileId,
        designPageId: requirementDesignLinks.designPageId,
        designNodeId: requirementDesignLinks.designNodeId,
        shareUrl: requirementDesignLinks.shareUrl,
        title: requirementDesignLinks.title,
        lastSyncedAt: requirementDesignLinks.lastSyncedAt
      })
      .from(requirementDesignLinks)
      .where(
        input.requirementId
          ? and(
              eq(requirementDesignLinks.projectId, input.projectId),
              eq(requirementDesignLinks.requirementId, input.requirementId)
            )
          : eq(requirementDesignLinks.projectId, input.projectId)
      );
    return rows.map((r) => ({
      ...r,
      lastSyncedAt: r.lastSyncedAt ? r.lastSyncedAt.toISOString() : null
    }));
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
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ index: number; code: string; message: string; fixHint: string }> = [];

    for (let i = 0; i < input.links.length; i += 1) {
      const link = input.links[i];
      if (!link.shareUrl) {
        skippedCount += 1;
        errors.push({
          index: i,
          code: "DESIGN_LINK_INVALID",
          message: "Missing shareUrl for design link.",
          fixHint: "Provide shareUrl for each imported design link."
        });
        continue;
      }
      const before = await this.getRequirementDesignLinks({
        projectId: input.projectId,
        requirementId: link.requirementId
      });
      try {
        await this.upsertRequirementDesignLink({
          projectId: input.projectId,
          provider: input.provider,
          requirementId: link.requirementId,
          requirementKey: link.requirementKey,
          designProjectId: link.designProjectId,
          designFileId: link.designFileId,
          designPageId: link.designPageId,
          designNodeId: link.designNodeId,
          shareUrl: link.shareUrl,
          title: link.title,
          lastSyncedAt: link.lastSyncedAt
        });
        const after = await this.getRequirementDesignLinks({
          projectId: input.projectId,
          requirementId: link.requirementId
        });
        if (after.length > before.length) createdCount += 1;
        else updatedCount += 1;
      } catch (err) {
        skippedCount += 1;
        if (err instanceof AppError) {
          errors.push({ index: i, code: err.code, message: err.message, fixHint: err.fixHint });
        } else {
          errors.push({
            index: i,
            code: "DESIGN_LINK_INVALID",
            message: "Failed to import design link.",
            fixHint: "Check link payload and provider fields."
          });
        }
      }
    }
    return { createdCount, updatedCount, skippedCount, errors };
  }

  private async computeRunStats(runId: string) {
    const runs = await this.db
      .select({ id: testRuns.id, createdAt: testRuns.createdAt })
      .from(testRuns)
      .where(eq(testRuns.id, runId));
    const rows = await this.db
      .select({ status: testResults.status })
      .from(testResults)
      .where(eq(testResults.runId, runId));
    const totalTests = rows.length;
    const passed = rows.filter((r) => r.status === "passed").length;
    const failed = rows.filter((r) => r.status === "failed").length;
    const skipped = rows.filter((r) => r.status === "skipped").length;
    const blocked = rows.filter((r) => r.status === "blocked").length;
    return {
      runId,
      runStartedAt: runs.length ? runs[0].createdAt.toISOString() : new Date().toISOString(),
      totalTests,
      passed,
      failed,
      skipped,
      blocked,
      passRatePct: pct(passed, totalTests)
    };
  }

  private async computeCurrentKpi(projectId: string, releaseLabel?: string | null, sprintLabel?: string | null) {
    const reqs = await this.db
      .select({ id: requirements.id })
      .from(requirements)
      .where(
        and(
          eq(requirements.projectId, projectId),
          releaseLabel ? eq(requirements.releaseLabel, releaseLabel) : undefined,
          sprintLabel ? eq(requirements.sprintLabel, sprintLabel) : undefined
        )
      );
    const cases = await this.db
      .select({ id: testCases.id, type: testCases.type, projectId: testCases.projectId })
      .from(testCases)
      .where(
        and(
          eq(testCases.projectId, projectId),
          releaseLabel ? eq(testCases.releaseLabel, releaseLabel) : undefined,
          sprintLabel ? eq(testCases.sprintLabel, sprintLabel) : undefined
        )
      );
    const runs = await this.db
      .select({ id: testRuns.id })
      .from(testRuns)
      .where(
        and(
          eq(testRuns.projectId, projectId),
          releaseLabel ? eq(testRuns.releaseLabel, releaseLabel) : undefined,
          sprintLabel ? eq(testRuns.sprintLabel, sprintLabel) : undefined
        )
      );

    const manualIds = cases.filter((c) => c.type === "manual").map((c) => c.id);
    const automatedIds = cases.filter((c) => c.type === "automated").map((c) => c.id);
    const reqIds = reqs.map((r) => r.id);

    const reqManualLinks =
      manualIds.length === 0
        ? []
        : await this.db
            .select({
              requirementId: requirementTestCaseLinks.requirementId,
              manualTestCaseId: requirementTestCaseLinks.manualTestCaseId
            })
            .from(requirementTestCaseLinks)
            .where(inArray(requirementTestCaseLinks.manualTestCaseId, manualIds));
    const autoManual =
      manualIds.length === 0
        ? []
        : await this.db
            .select({
              automatedTestCaseId: automatedManualLinks.automatedTestCaseId,
              manualTestCaseId: automatedManualLinks.manualTestCaseId
            })
            .from(automatedManualLinks)
            .where(inArray(automatedManualLinks.manualTestCaseId, manualIds));

    const reqWithManual = new Set(reqManualLinks.map((l) => l.requirementId));
    const manualWithReq = new Set(reqManualLinks.map((l) => l.manualTestCaseId));
    const manualWithAuto = new Set(autoManual.map((l) => l.manualTestCaseId));
    const autoReachable = new Set(autoManual.map((l) => l.automatedTestCaseId));

    const reqWithAutomation = new Set<string>();
    const manualToReqs = new Map<string, string[]>();
    for (const link of reqManualLinks) {
      const arr = manualToReqs.get(link.manualTestCaseId) ?? [];
      arr.push(link.requirementId);
      manualToReqs.set(link.manualTestCaseId, arr);
    }
    for (const link of autoManual) {
      const reqList = manualToReqs.get(link.manualTestCaseId) ?? [];
      for (const reqId of reqList) reqWithAutomation.add(reqId);
    }

    const totalRequirements = reqIds.length;
    const totalManualCases = manualIds.length;
    const totalTestRuns = runs.length;
    const requirementsWithManualLinks = reqWithManual.size;
    const requirementsWithAutomatedLinksViaManual = reqWithAutomation.size;
    const automatedCasesReachableFromRequirements = autoReachable.size;
    const orphanManualCases = manualIds.filter((id) => !manualWithReq.has(id)).length;
    const orphanAutomatedCases = automatedIds.filter(
      (id) => !autoManual.some((l) => l.automatedTestCaseId === id)
    ).length;

    const coverage: CoverageMetricValue[] = [
      {
        formulaId: "requirement_coverage",
        numerator: requirementsWithManualLinks,
        denominator: totalRequirements,
        valuePct: pct(requirementsWithManualLinks, totalRequirements)
      },
      {
        formulaId: "testcase_coverage",
        numerator: manualWithReq.size,
        denominator: totalManualCases,
        valuePct: pct(manualWithReq.size, totalManualCases)
      },
      {
        formulaId: "automation_coverage_manual",
        numerator: manualWithAuto.size,
        denominator: totalManualCases,
        valuePct: pct(manualWithAuto.size, totalManualCases)
      },
      {
        formulaId: "automation_coverage_requirement",
        numerator: requirementsWithAutomatedLinksViaManual,
        denominator: totalRequirements,
        valuePct: pct(requirementsWithAutomatedLinksViaManual, totalRequirements)
      }
    ];

    return {
      totalRequirements,
      totalManualCases,
      totalTestRuns,
      requirementsWithManualLinks,
      requirementsWithAutomatedLinksViaManual,
      automatedCasesReachableFromRequirements,
      orphanManualCases,
      orphanAutomatedCases,
      coverage
    };
  }
}
