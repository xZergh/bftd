import { and, eq, inArray } from "drizzle-orm";
import { AppError } from "../errors";
import { automatedManualLinks, runTestCaseAssignments, testCases, testRuns } from "../../db/schema";
import type { AutomationTarget } from "./types";

type Db = ReturnType<typeof import("../../db/client").createDb>;

export async function resolveManualTestCaseIdsForRun(
  db: Db,
  input: { runId: string; projectId: string; manualTestCaseIds?: string[] }
): Promise<string[]> {
  const runRows = await db.select().from(testRuns).where(eq(testRuns.id, input.runId));
  if (runRows.length === 0 || runRows[0].projectId !== input.projectId) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Test run not found in project scope.",
      "Use a run from the same project.",
      { runId: input.runId, projectId: input.projectId }
    );
  }

  if (input.manualTestCaseIds && input.manualTestCaseIds.length > 0) {
    return [...new Set(input.manualTestCaseIds)];
  }

  const assignments = await db
    .select({ testCaseId: runTestCaseAssignments.testCaseId })
    .from(runTestCaseAssignments)
    .where(eq(runTestCaseAssignments.runId, input.runId));

  if (assignments.length === 0) {
    return [];
  }

  const caseRows = await db
    .select({ id: testCases.id, type: testCases.type, isDeleted: testCases.isDeleted })
    .from(testCases)
    .where(
      and(
        eq(testCases.projectId, input.projectId),
        inArray(
          testCases.id,
          assignments.map((a) => a.testCaseId)
        )
      )
    );

  return caseRows.filter((tc) => tc.type === "manual" && !tc.isDeleted).map((tc) => tc.id);
}

/** Manual cases in a run → linked automated cases with externalId (spec path). */
export async function resolveLinkedAutomationTargets(
  db: Db,
  input: { projectId: string; manualTestCaseIds: string[] }
): Promise<AutomationTarget[]> {
  const manualIds = [...new Set(input.manualTestCaseIds)];
  if (manualIds.length === 0) {
    return [];
  }

  const links = await db
    .select({
      manualTestCaseId: automatedManualLinks.manualTestCaseId,
      automatedTestCaseId: automatedManualLinks.automatedTestCaseId
    })
    .from(automatedManualLinks)
    .where(inArray(automatedManualLinks.manualTestCaseId, manualIds));

  if (links.length === 0) {
    return [];
  }

  const automatedIds = [...new Set(links.map((l) => l.automatedTestCaseId))];
  const automatedRows = await db
    .select({
      id: testCases.id,
      externalId: testCases.externalId,
      type: testCases.type,
      isDeleted: testCases.isDeleted
    })
    .from(testCases)
    .where(and(eq(testCases.projectId, input.projectId), inArray(testCases.id, automatedIds)));

  const automatedById = new Map(
    automatedRows
      .filter((tc) => tc.type === "automated" && !tc.isDeleted)
      .map((tc) => [tc.id, tc] as const)
  );

  const targets: AutomationTarget[] = [];
  const seenAuto = new Set<string>();

  for (const link of links) {
    const auto = automatedById.get(link.automatedTestCaseId);
    if (!auto?.externalId) {
      continue;
    }
    if (seenAuto.has(auto.id)) {
      continue;
    }
    seenAuto.add(auto.id);
    targets.push({
      manualTestCaseId: link.manualTestCaseId,
      automatedTestCaseId: auto.id,
      externalId: auto.externalId
    });
  }

  return targets;
}
