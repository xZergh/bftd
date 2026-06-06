import { eq, inArray } from "drizzle-orm";
import {
  automatedManualLinks,
  kpiDailySnapshots,
  kpiProjectSnapshots,
  kpiRunSnapshots,
  projects,
  requirementDesignLinks,
  requirementTestCaseLinks,
  requirements,
  runTestCaseAssignments,
  runTraceabilityEdges,
  runTraceabilitySnapshots,
  testCaseSteps,
  testCases,
  testCaseVersionSteps,
  testCaseVersions,
  testPlanTestCaseLinks,
  testPlans,
  testResults,
  testRuns
} from "../../db/schema";

type Db = ReturnType<typeof import("../../db/client").createDb>;

/** Permanently delete one project and all dependent rows (local admin / E2E reset). */
export async function deleteProjectCascade(db: Db, projectId: string) {
  const runRows = await db.select({ id: testRuns.id }).from(testRuns).where(eq(testRuns.projectId, projectId));
  const runIds = runRows.map((r) => r.id);

  if (runIds.length > 0) {
    const snapshotRows = await db
      .select({ id: runTraceabilitySnapshots.id })
      .from(runTraceabilitySnapshots)
      .where(inArray(runTraceabilitySnapshots.runId, runIds));
    const snapshotIds = snapshotRows.map((s) => s.id);
    if (snapshotIds.length > 0) {
      await db.delete(runTraceabilityEdges).where(inArray(runTraceabilityEdges.runSnapshotId, snapshotIds));
      await db.delete(runTraceabilitySnapshots).where(inArray(runTraceabilitySnapshots.id, snapshotIds));
    }
    await db.delete(testResults).where(inArray(testResults.runId, runIds));
    await db.delete(runTestCaseAssignments).where(inArray(runTestCaseAssignments.runId, runIds));
    await db.delete(kpiRunSnapshots).where(inArray(kpiRunSnapshots.runId, runIds));
    await db.delete(testRuns).where(inArray(testRuns.id, runIds));
  }

  const planRows = await db.select({ id: testPlans.id }).from(testPlans).where(eq(testPlans.projectId, projectId));
  const planIds = planRows.map((p) => p.id);
  if (planIds.length > 0) {
    await db.delete(testPlanTestCaseLinks).where(inArray(testPlanTestCaseLinks.testPlanId, planIds));
    await db.delete(testPlans).where(inArray(testPlans.id, planIds));
  }

  await db.delete(requirementDesignLinks).where(eq(requirementDesignLinks.projectId, projectId));

  const reqRows = await db.select({ id: requirements.id }).from(requirements).where(eq(requirements.projectId, projectId));
  const reqIds = reqRows.map((r) => r.id);
  if (reqIds.length > 0) {
    await db.delete(requirementTestCaseLinks).where(inArray(requirementTestCaseLinks.requirementId, reqIds));
  }

  const caseRows = await db.select({ id: testCases.id }).from(testCases).where(eq(testCases.projectId, projectId));
  const caseIds = caseRows.map((c) => c.id);
  if (caseIds.length > 0) {
    await db.delete(automatedManualLinks).where(inArray(automatedManualLinks.automatedTestCaseId, caseIds));
    await db.delete(automatedManualLinks).where(inArray(automatedManualLinks.manualTestCaseId, caseIds));
    const versionRows = await db
      .select({ id: testCaseVersions.id })
      .from(testCaseVersions)
      .where(inArray(testCaseVersions.testCaseId, caseIds));
    const versionIds = versionRows.map((v) => v.id);
    if (versionIds.length > 0) {
      await db.delete(testCaseVersionSteps).where(inArray(testCaseVersionSteps.versionId, versionIds));
      await db.delete(testCaseVersions).where(inArray(testCaseVersions.id, versionIds));
    }
    await db.delete(testCaseSteps).where(inArray(testCaseSteps.testCaseId, caseIds));
    await db.delete(testCases).where(inArray(testCases.id, caseIds));
  }

  if (reqIds.length > 0) {
    await db.delete(requirements).where(inArray(requirements.id, reqIds));
  }

  await db.delete(kpiProjectSnapshots).where(eq(kpiProjectSnapshots.projectId, projectId));
  await db.delete(kpiDailySnapshots).where(eq(kpiDailySnapshots.projectId, projectId));
  await db.delete(kpiRunSnapshots).where(eq(kpiRunSnapshots.projectId, projectId));

  await db.delete(projects).where(eq(projects.id, projectId));
}

export async function purgeArchivedProjects(db: Db): Promise<{ deletedCount: number; deletedProjectKeys: string[] }> {
  const archived = await db.select().from(projects).where(eq(projects.isArchived, true));
  const keys: string[] = [];
  for (const p of archived) {
    await deleteProjectCascade(db, p.id);
    keys.push(p.key);
  }
  return { deletedCount: keys.length, deletedProjectKeys: keys };
}
