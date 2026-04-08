import { and, eq, gt, gte, inArray, lte, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import {
  automatedManualLinks,
  kpiDailySnapshots,
  kpiProjectSnapshots,
  kpiRunSnapshots,
  requirementTestCaseLinks,
  requirements,
  testCases,
  testResults,
  testRuns
} from "../../db/schema";

type Db = ReturnType<typeof import("../../db/client").createDb>;

export type CoverageFormulaInfo = {
  formulaId: string;
  label: string;
  description: string;
  numeratorLabel: string;
  denominatorLabel: string;
  expression: string;
  scope: string;
};

export type CoverageMetricValue = {
  formulaId: string;
  valuePct: number;
  numerator: number;
  denominator: number;
};

export const COVERAGE_FORMULAS: CoverageFormulaInfo[] = [
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

function now() {
  return new Date();
}

export function assertIsoDate(value: string | undefined, field: string) {
  if (value === undefined) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(
      "KPI_RANGE_INVALID",
      `Invalid ${field} (expected YYYY-MM-DD).`,
      "Use ISO calendar dates for KPI ranges.",
      { [field]: value }
    );
  }
}

export function assertKpiDateRange(fromDate?: string, toDate?: string) {
  assertIsoDate(fromDate, "fromDate");
  assertIsoDate(toDate, "toDate");
  if (fromDate && toDate && fromDate > toDate) {
    throw new AppError(
      "KPI_RANGE_INVALID",
      "fromDate must be on or before toDate.",
      "Swap the dates or clear one side of the range.",
      { fromDate, toDate }
    );
  }
}

function endOfUtcDay(dateStr: string): Date {
  return new Date(`${dateStr}T23:59:59.999Z`);
}

export async function computeRunStats(db: Db, runId: string) {
  const runs = await db.select({ id: testRuns.id, createdAt: testRuns.createdAt }).from(testRuns).where(eq(testRuns.id, runId));
  const rows = await db.select({ status: testResults.status }).from(testResults).where(eq(testResults.runId, runId));
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

export async function computeCurrentKpi(
  db: Db,
  projectId: string,
  releaseLabel?: string | null,
  sprintLabel?: string | null,
  opts?: { asOfEnd?: Date }
) {
  const asOf = opts?.asOfEnd;
  const reqs = await db
    .select({ id: requirements.id })
    .from(requirements)
    .where(
      and(
        eq(requirements.projectId, projectId),
        releaseLabel ? eq(requirements.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(requirements.sprintLabel, sprintLabel) : undefined,
        asOf ? lte(requirements.createdAt, asOf) : undefined
      )
    );
  const cases = await db
    .select({
      id: testCases.id,
      type: testCases.type,
      projectId: testCases.projectId,
      createdAt: testCases.createdAt,
      isDeleted: testCases.isDeleted,
      deletedAt: testCases.deletedAt
    })
    .from(testCases)
    .where(
      and(
        eq(testCases.projectId, projectId),
        releaseLabel ? eq(testCases.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(testCases.sprintLabel, sprintLabel) : undefined,
        asOf
          ? and(
              lte(testCases.createdAt, asOf),
              or(eq(testCases.isDeleted, false), gt(testCases.deletedAt, asOf))
            )
          : eq(testCases.isDeleted, false)
      )
    );
  const runs = await db
    .select({ id: testRuns.id })
    .from(testRuns)
    .where(
      and(
        eq(testRuns.projectId, projectId),
        releaseLabel ? eq(testRuns.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(testRuns.sprintLabel, sprintLabel) : undefined,
        asOf ? lte(testRuns.createdAt, asOf) : undefined
      )
    );

  const manualIds = cases.filter((c) => c.type === "manual").map((c) => c.id);
  const automatedIds = cases.filter((c) => c.type === "automated").map((c) => c.id);
  const reqIds = reqs.map((r) => r.id);

  const reqManualLinks =
    manualIds.length === 0
      ? []
      : await db
          .select({
            requirementId: requirementTestCaseLinks.requirementId,
            manualTestCaseId: requirementTestCaseLinks.manualTestCaseId
          })
          .from(requirementTestCaseLinks)
          .where(inArray(requirementTestCaseLinks.manualTestCaseId, manualIds));
  const autoManual =
    manualIds.length === 0
      ? []
      : await db
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
  const orphanAutomatedCases = automatedIds.filter((id) => !autoManual.some((l) => l.automatedTestCaseId === id)).length;

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

export async function recalculateKpiSnapshots(
  db: Db,
  input: { projectId: string; fromDate?: string; toDate?: string; fullRebuild?: boolean }
) {
  assertKpiDateRange(input.fromDate, input.toDate);
  const current = await computeCurrentKpi(db, input.projectId);
  const today = new Date().toISOString().slice(0, 10);
  const nowTs = now();

  if (input.fullRebuild && (input.fromDate || input.toDate)) {
    const from = input.fromDate ?? "0000-01-01";
    const to = input.toDate ?? "9999-12-31";
    await db
      .delete(kpiDailySnapshots)
      .where(
        and(
          eq(kpiDailySnapshots.projectId, input.projectId),
          gte(kpiDailySnapshots.snapshotDate, from),
          lte(kpiDailySnapshots.snapshotDate, to)
        )
      );
  }

  const existingProject = await db
    .select({ id: kpiProjectSnapshots.id })
    .from(kpiProjectSnapshots)
    .where(and(eq(kpiProjectSnapshots.projectId, input.projectId), eq(kpiProjectSnapshots.snapshotDate, today)));
  if (existingProject.length === 0) {
    await db.insert(kpiProjectSnapshots).values({
      id: randomUUID(),
      projectId: input.projectId,
      snapshotDate: today,
      generatedAt: nowTs,
      payloadJson: JSON.stringify(current)
    });
  } else {
    await db
      .update(kpiProjectSnapshots)
      .set({ generatedAt: nowTs, payloadJson: JSON.stringify(current) })
      .where(eq(kpiProjectSnapshots.id, existingProject[0].id));
  }

  const runs = await db.select({ id: testRuns.id, createdAt: testRuns.createdAt }).from(testRuns).where(eq(testRuns.projectId, input.projectId));
  const runsInRange = runs.filter((r) => {
    const d = r.createdAt.toISOString().slice(0, 10);
    if (input.fromDate && d < input.fromDate) return false;
    if (input.toDate && d > input.toDate) return false;
    return true;
  });
  const runsToProcess = input.fromDate || input.toDate ? runsInRange : runs;

  let runSnapshotsUpdated = 0;
  for (const run of runsToProcess) {
    const stats = await computeRunStats(db, run.id);
    const existing = await db
      .select({ id: kpiRunSnapshots.id })
      .from(kpiRunSnapshots)
      .where(and(eq(kpiRunSnapshots.projectId, input.projectId), eq(kpiRunSnapshots.runId, run.id)));
    if (existing.length === 0) {
      await db.insert(kpiRunSnapshots).values({
        id: randomUUID(),
        projectId: input.projectId,
        runId: run.id,
        generatedAt: nowTs,
        payloadJson: JSON.stringify(stats)
      });
    } else {
      await db
        .update(kpiRunSnapshots)
        .set({ generatedAt: nowTs, payloadJson: JSON.stringify(stats) })
        .where(eq(kpiRunSnapshots.id, existing[0].id));
    }
    runSnapshotsUpdated += 1;
  }

  const dateMap = new Map<string, number>();
  for (const r of runs) {
    const d = r.createdAt.toISOString().slice(0, 10);
    if (input.fromDate && d < input.fromDate) continue;
    if (input.toDate && d > input.toDate) continue;
    dateMap.set(d, (dateMap.get(d) ?? 0) + 1);
  }
  let dailySnapshotsUpdated = 0;
  for (const [date, totalTestRuns] of dateMap) {
    const asOf = endOfUtcDay(date);
    const dayKpi = await computeCurrentKpi(db, input.projectId, undefined, undefined, { asOfEnd: asOf });
    const payload = { date, coverage: dayKpi.coverage, totalTestRuns };
    const existing = await db
      .select({ id: kpiDailySnapshots.id })
      .from(kpiDailySnapshots)
      .where(and(eq(kpiDailySnapshots.projectId, input.projectId), eq(kpiDailySnapshots.snapshotDate, date)));
    if (existing.length === 0) {
      await db.insert(kpiDailySnapshots).values({
        id: randomUUID(),
        projectId: input.projectId,
        snapshotDate: date,
        generatedAt: nowTs,
        payloadJson: JSON.stringify(payload)
      });
    } else {
      await db
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
