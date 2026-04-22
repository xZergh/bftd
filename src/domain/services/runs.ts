import { asc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import {
  automatedManualLinks,
  requirementTestCaseLinks,
  requirements,
  runTestCaseAssignments,
  runTraceabilityEdges,
  runTraceabilitySnapshots,
  testCases,
  testPlanTestCaseLinks,
  testPlans,
  testResults,
  testRuns
} from "../../db/schema";
import { normalizeLabel } from "./labels";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

export async function createTestRun(
  db: Db,
  input: {
    projectId: string;
    name: string;
    releaseLabel?: string;
    sprintLabel?: string;
    environment?: string;
    buildVersion?: string;
    trigger?: string;
    finishedAt?: string;
    testPlanId?: string;
  }
) {
  const finishedAt = input.finishedAt ? new Date(input.finishedAt) : null;
  if (input.testPlanId) {
    const planRows = await db.select().from(testPlans).where(eq(testPlans.id, input.testPlanId));
    if (planRows.length === 0 || planRows[0].projectId !== input.projectId) {
      throw new AppError(
        "ENTITY_NOT_FOUND",
        "Test plan not found in run project scope.",
        "Use a test plan from the same project as the run.",
        { testPlanId: input.testPlanId, projectId: input.projectId }
      );
    }
  }
  const run = {
    id: randomUUID(),
    projectId: input.projectId,
    testPlanId: input.testPlanId ?? null,
    name: input.name,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    environment: input.environment ?? null,
    buildVersion: input.buildVersion ?? null,
    trigger: input.trigger ?? null,
    createdAt: now(),
    finishedAt
  };
  await db.insert(testRuns).values(run);
  if (input.testPlanId) {
    const links = await db
      .select({ testCaseId: testPlanTestCaseLinks.testCaseId })
      .from(testPlanTestCaseLinks)
      .where(eq(testPlanTestCaseLinks.testPlanId, input.testPlanId));
    if (links.length > 0) {
      await db.insert(runTestCaseAssignments).values(
        links.map((link) => ({
          id: randomUUID(),
          runId: run.id,
          testCaseId: link.testCaseId,
          sourceTestPlanId: input.testPlanId!,
          createdAt: now()
        }))
      );
    }
  }
  await captureRunSnapshot(db, run.id, input.projectId);
  return run;
}

export async function submitTestResult(
  db: Db,
  input: {
    runId: string;
    testCaseId: string;
    status: "passed" | "failed" | "skipped" | "blocked" | "not_run";
    durationMs?: number;
    attachments?: Array<{ kind: string; ref: string }>;
  }
) {
  const run = await db.select({ id: testRuns.id, projectId: testRuns.projectId }).from(testRuns).where(eq(testRuns.id, input.runId));
  if (run.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Test run not found.", "Create a test run before submitting results.", { runId: input.runId });
  }
  const tc = await db.select({ id: testCases.id, projectId: testCases.projectId }).from(testCases).where(eq(testCases.id, input.testCaseId));
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
    attachmentsJson:
      input.attachments && input.attachments.length > 0 ? JSON.stringify(input.attachments) : null,
    createdAt: now()
  };
  await db.insert(testResults).values(result);
  return result;
}

export async function listTestRuns(db: Db, input: { projectId: string }) {
  const rows = await db.select().from(testRuns).where(eq(testRuns.projectId, input.projectId));
  return rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getTestRun(db: Db, input: { runId: string; projectId?: string }) {
  const rows = await db.select().from(testRuns).where(eq(testRuns.id, input.runId));
  if (rows.length === 0) return null;
  const run = rows[0];
  if (input.projectId && run.projectId !== input.projectId) return null;
  const results = await db
    .select()
    .from(testResults)
    .where(eq(testResults.runId, input.runId))
    .orderBy(asc(testResults.createdAt));
  const assignments = await db
    .select({ testCaseId: runTestCaseAssignments.testCaseId })
    .from(runTestCaseAssignments)
    .where(eq(runTestCaseAssignments.runId, input.runId));
  const executedTestCaseIds = new Set(results.map((r) => r.testCaseId));
  const pendingRows = assignments
    .filter((a) => !executedTestCaseIds.has(a.testCaseId))
    .map((a) => ({
      id: `pending:${input.runId}:${a.testCaseId}`,
      runId: input.runId,
      testCaseId: a.testCaseId,
      status: "not_run" as const,
      durationMs: 0,
      attachmentsJson: null as string | null,
      createdAt: run.createdAt,
      attachments: [] as unknown[]
    }));
  return {
    ...run,
    results: [
      ...results.map((r) => ({
        ...r,
        attachments: r.attachmentsJson ? (JSON.parse(r.attachmentsJson) as unknown[]) : []
      })),
      ...pendingRows
    ]
  };
}

export async function getRunAggregate(db: Db, input: { runId: string }) {
  const run = await getTestRun(db, { runId: input.runId });
  if (!run) {
    throw new AppError("ENTITY_NOT_FOUND", "Test run not found.", "Use a valid run id.", { runId: input.runId });
  }
  const rows = run.results as Array<{ status: string; durationMs: number }>;
  const total = rows.length;
  const passed = rows.filter((r) => r.status === "passed").length;
  const failed = rows.filter((r) => r.status === "failed").length;
  const skipped = rows.filter((r) => r.status === "skipped").length;
  const blocked = rows.filter((r) => r.status === "blocked").length;
  const notRun = rows.filter((r) => r.status === "not_run").length;
  const durationMs = rows.reduce((s, r) => s + (r.durationMs ?? 0), 0);
  const passRatePct = total === 0 ? 0 : Math.round((passed / total) * 10000) / 100;
  return { runId: input.runId, total, passed, failed, skipped, blocked, notRun, passRatePct, durationMs };
}

export async function getRunTraceabilityReport(
  db: Db,
  input: { runId: string; releaseLabel?: string; sprintLabel?: string }
) {
  const releaseLabel = normalizeLabel(input.releaseLabel);
  const sprintLabel = normalizeLabel(input.sprintLabel);
  const snapshots = await db
    .select({
      id: runTraceabilitySnapshots.id,
      runId: runTraceabilitySnapshots.runId,
      projectId: runTraceabilitySnapshots.projectId,
      capturedAt: runTraceabilitySnapshots.capturedAt
    })
    .from(runTraceabilitySnapshots)
    .where(eq(runTraceabilitySnapshots.runId, input.runId));

  if (snapshots.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Run snapshot not found.", "Create a test run to capture traceability snapshot.", { runId: input.runId });
  }
  const snapshot = snapshots[0];
  const runRows = await db
    .select({ id: testRuns.id, releaseLabel: testRuns.releaseLabel, sprintLabel: testRuns.sprintLabel })
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

  const edges = await db
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
    edges
  };
}

async function captureRunSnapshot(db: Db, runId: string, projectId: string) {
  const snapshotId = randomUUID();
  await db.insert(runTraceabilitySnapshots).values({
    id: snapshotId,
    runId,
    projectId,
    capturedAt: now()
  });

  const projectReqRows = await db
    .select({ id: requirements.id })
    .from(requirements)
    .where(eq(requirements.projectId, projectId));
  const reqInProject = new Set(projectReqRows.map((r) => r.id));

  const reqManualRows = await db
    .select({
      requirementId: requirementTestCaseLinks.requirementId,
      manualTestCaseId: requirementTestCaseLinks.manualTestCaseId
    })
    .from(requirementTestCaseLinks);
  const scopedReqManual = reqManualRows.filter((r) => reqInProject.has(r.requirementId));
  if (scopedReqManual.length === 0) return;

  const manualIds = [...new Set(scopedReqManual.map((r) => r.manualTestCaseId))];
  const manuals = await db
    .select({ id: testCases.id, projectId: testCases.projectId, type: testCases.type, isDeleted: testCases.isDeleted })
    .from(testCases)
    .where(inArray(testCases.id, manualIds));
  const manualSet = new Set(
    manuals.filter((m) => m.projectId === projectId && m.type === "manual" && !m.isDeleted).map((m) => m.id)
  );
  const reqManualInProject = scopedReqManual.filter((r) => manualSet.has(r.manualTestCaseId));
  if (reqManualInProject.length === 0) return;

  const autoLinks = await db
    .select({ automatedTestCaseId: automatedManualLinks.automatedTestCaseId, manualTestCaseId: automatedManualLinks.manualTestCaseId })
    .from(automatedManualLinks)
    .where(inArray(automatedManualLinks.manualTestCaseId, [...manualSet]));
  const automatedIds = [...new Set(autoLinks.map((a) => a.automatedTestCaseId))];
  const autos = automatedIds.length
    ? await db
        .select({ id: testCases.id, projectId: testCases.projectId, type: testCases.type, isDeleted: testCases.isDeleted })
        .from(testCases)
        .where(inArray(testCases.id, automatedIds))
    : [];
  const autoSet = new Set(
    autos.filter((a) => a.projectId === projectId && a.type === "automated" && !a.isDeleted).map((a) => a.id)
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
  if (rows.length > 0) await db.insert(runTraceabilityEdges).values(rows);
}
