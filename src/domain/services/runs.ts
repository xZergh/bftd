import { and, desc, eq, inArray } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import {
  automatedManualLinks,
  requirementTestCaseLinks,
  runTraceabilityEdges,
  runTraceabilitySnapshots,
  testCases,
  testResults,
  testRuns
} from "../../db/schema";
import { normalizeLabel } from "./labels";

type Db = ReturnType<typeof import("../../db/client").createDb>;

function now() {
  return new Date();
}

export async function listTestRuns(
  db: Db,
  input: { projectId: string; releaseLabel?: string; sprintLabel?: string }
) {
  const releaseLabel = normalizeLabel(input.releaseLabel);
  const sprintLabel = normalizeLabel(input.sprintLabel);
  return db
    .select()
    .from(testRuns)
    .where(
      and(
        eq(testRuns.projectId, input.projectId),
        releaseLabel ? eq(testRuns.releaseLabel, releaseLabel) : undefined,
        sprintLabel ? eq(testRuns.sprintLabel, sprintLabel) : undefined
      )
    )
    .orderBy(desc(testRuns.createdAt));
}

export async function createTestRun(
  db: Db,
  input: { projectId: string; name: string; releaseLabel?: string; sprintLabel?: string }
) {
  const run = {
    id: randomUUID(),
    projectId: input.projectId,
    name: input.name,
    releaseLabel: normalizeLabel(input.releaseLabel),
    sprintLabel: normalizeLabel(input.sprintLabel),
    createdAt: now()
  };
  await db.insert(testRuns).values(run);
  await captureRunSnapshot(db, run.id, input.projectId);
  return run;
}

export async function submitTestResult(
  db: Db,
  input: {
    runId: string;
    testCaseId: string;
    status: "passed" | "failed" | "skipped" | "blocked";
    durationMs?: number;
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
    createdAt: now()
  };
  await db.insert(testResults).values(result);
  return result;
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

  const reqManualRows = await db
    .select({ requirementId: requirementTestCaseLinks.requirementId, manualTestCaseId: requirementTestCaseLinks.manualTestCaseId })
    .from(requirementTestCaseLinks);
  if (reqManualRows.length === 0) return;

  const manualIds = [...new Set(reqManualRows.map((r) => r.manualTestCaseId))];
  const manuals = await db
    .select({ id: testCases.id, projectId: testCases.projectId, type: testCases.type })
    .from(testCases)
    .where(inArray(testCases.id, manualIds));
  const manualSet = new Set(manuals.filter((m) => m.projectId === projectId && m.type === "manual").map((m) => m.id));
  const reqManualInProject = reqManualRows.filter((r) => manualSet.has(r.manualTestCaseId));
  if (reqManualInProject.length === 0) return;

  const autoLinks = await db
    .select({ automatedTestCaseId: automatedManualLinks.automatedTestCaseId, manualTestCaseId: automatedManualLinks.manualTestCaseId })
    .from(automatedManualLinks)
    .where(inArray(automatedManualLinks.manualTestCaseId, [...manualSet]));
  const automatedIds = [...new Set(autoLinks.map((a) => a.automatedTestCaseId))];
  const autos = automatedIds.length
    ? await db
        .select({ id: testCases.id, projectId: testCases.projectId, type: testCases.type })
        .from(testCases)
        .where(inArray(testCases.id, automatedIds))
    : [];
  const autoSet = new Set(autos.filter((a) => a.projectId === projectId && a.type === "automated").map((a) => a.id));

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
