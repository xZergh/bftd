import { eq } from "drizzle-orm";
import { AppError } from "../errors";
import { resolveLinkedAutomationTargets, resolveManualTestCaseIdsForRun } from "../automation/resolve-linked";
import { defaultDbPath, defaultReportDir, spawnAutomationRunner } from "../automation/spawn-runner";
import type { AutomationRunReport, AutomationTarget } from "../automation/types";
import { testRuns } from "../../db/schema";

type Db = ReturnType<typeof import("../../db/client").createDb>;

export type RunAutomationPreview = {
  manualCount: number;
  automatedCount: number;
  targets: AutomationTarget[];
  specPaths: string[];
};

export async function previewRunAutomation(
  db: Db,
  input: { runId: string; projectId: string; manualTestCaseIds?: string[] }
): Promise<RunAutomationPreview> {
  const manualIds = await resolveManualTestCaseIdsForRun(db, input);
  const targets = await resolveLinkedAutomationTargets(db, {
    projectId: input.projectId,
    manualTestCaseIds: manualIds
  });
  const specPaths = [...new Set(targets.map((t) => t.externalId))];
  return {
    manualCount: manualIds.length,
    automatedCount: targets.length,
    targets,
    specPaths
  };
}

export async function attachAutomationReport(db: Db, runId: string, report: AutomationRunReport) {
  await db
    .update(testRuns)
    .set({ automationReportJson: JSON.stringify(report) })
    .where(eq(testRuns.id, runId));
}

export function parseAutomationReport(json: string | null | undefined): AutomationRunReport | null {
  if (!json) {
    return null;
  }
  try {
    return JSON.parse(json) as AutomationRunReport;
  } catch {
    return null;
  }
}

export type ExecuteRunAutomationResult = RunAutomationPreview & { started: boolean };

/** Resolve linked automation from manual run cases, then spawn the framework adapter runner. */
export async function executeRunAutomation(
  db: Db,
  input: {
    runId: string;
    projectId: string;
    manualTestCaseIds?: string[];
    framework?: string;
    spawnRunner?: boolean;
    repoRoot?: string;
    dbPath?: string;
  }
): Promise<ExecuteRunAutomationResult> {
  const preview = await previewRunAutomation(db, input);

  if (preview.manualCount === 0) {
    throw new AppError(
      "RUN_NO_MANUAL_CASES",
      "This run has no manual test cases to drive automation.",
      "Create a run from a plan with manual cases, or pass manualTestCaseIds.",
      { runId: input.runId }
    );
  }

  if (preview.automatedCount === 0) {
    throw new AppError(
      "RUN_NO_LINKED_AUTOMATION",
      "Selected manual cases have no linked automated tests with externalId.",
      "Link automated tests to manual cases and set externalId (spec path) on automated cases.",
      { runId: input.runId, manualCount: preview.manualCount }
    );
  }

  const shouldSpawn = input.spawnRunner !== false;
  if (shouldSpawn) {
    const repoRoot = input.repoRoot ?? process.cwd();
    const dbPath = input.dbPath ?? defaultDbPath(repoRoot);
    const automatedIds = preview.targets.map((t) => t.automatedTestCaseId);
    spawnAutomationRunner({
      repoRoot,
      dbPath,
      runId: input.runId,
      automatedTestCaseIds: automatedIds,
      framework: input.framework
    });
  }

  return { ...preview, started: shouldSpawn };
}

export { defaultReportDir };
