import { AppError } from "../errors";
import { createTestRun } from "./runs";
import { flattenTestPlanMembers } from "./test-plan-flatten";
import { defaultDbPath, spawnAutomationRunner } from "../automation/spawn-runner";
import { resolveLinkedAutomationTargets } from "../automation/resolve-linked";
import { executeRunAutomation } from "./run-automation";
import { eq, inArray } from "drizzle-orm";
import { testCases, testPlans } from "../../db/schema";

type Db = ReturnType<typeof import("../../db/client").createDb>;

export type LaunchPlanAutomationResult = {
  run: Awaited<ReturnType<typeof createTestRun>>;
  automatedCount: number;
  specPaths: string[];
};

export async function launchPlanAutomation(
  db: Db,
  input: { projectId: string; testPlanId: string },
  options?: { spawnRunner?: boolean; repoRoot?: string; dbPath?: string }
): Promise<LaunchPlanAutomationResult> {
  const planRows = await db.select().from(testPlans).where(eq(testPlans.id, input.testPlanId));
  if (planRows.length === 0 || planRows[0].projectId !== input.projectId) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Test plan not found in project scope.",
      "Use a test plan from the same project.",
      { testPlanId: input.testPlanId, projectId: input.projectId }
    );
  }

  const flattened = await flattenTestPlanMembers(db, input.testPlanId);
  if (flattened.length === 0) {
    throw new AppError(
      "PLAN_EMPTY",
      "Test plan has no test cases (direct or via sub-plans).",
      "Link test cases or sub-plans before launching automation.",
      { testPlanId: input.testPlanId }
    );
  }

  const caseRows = await db
    .select({
      id: testCases.id,
      type: testCases.type,
      isDeleted: testCases.isDeleted
    })
    .from(testCases)
    .where(
      inArray(
        testCases.id,
        flattened.map((f) => f.testCaseId)
      )
    );

  const manualIds = caseRows.filter((tc) => tc.type === "manual" && !tc.isDeleted).map((tc) => tc.id);
  const targets = await resolveLinkedAutomationTargets(db, {
    projectId: input.projectId,
    manualTestCaseIds: manualIds
  });

  if (targets.length === 0) {
    throw new AppError(
      "PLAN_NO_AUTOMATION",
      "Test plan has no linked automated tests to run.",
      "Link automated tests to manual cases in this plan and set externalId on automated cases.",
      { testPlanId: input.testPlanId }
    );
  }

  const specPaths = [...new Set(targets.map((t) => t.externalId))];

  const run = await createTestRun(db, {
    projectId: input.projectId,
    name: `Automation · ${new Date().toISOString()}`,
    trigger: "plan_automation",
    testPlanId: input.testPlanId
  });

  const shouldSpawn = options?.spawnRunner !== false;
  if (shouldSpawn) {
    const repoRoot = options?.repoRoot ?? process.cwd();
    const dbPath = options?.dbPath ?? defaultDbPath(repoRoot);
    spawnAutomationRunner({
      repoRoot,
      dbPath,
      runId: run.id,
      automatedTestCaseIds: targets.map((t) => t.automatedTestCaseId),
      framework: "playwright"
    });
  }

  return { run, automatedCount: targets.length, specPaths };
}

/** Spawn framework runner for an existing run (manual cases → linked automation). */
export async function spawnAutomationForRun(
  db: Db,
  input: { runId: string; projectId: string; manualTestCaseIds?: string[]; framework?: string },
  options?: { spawnRunner?: boolean; repoRoot?: string; dbPath?: string }
): Promise<{ automatedCount: number; specPaths: string[] }> {
  const result = await executeRunAutomation(db, {
    runId: input.runId,
    projectId: input.projectId,
    manualTestCaseIds: input.manualTestCaseIds,
    framework: input.framework,
    spawnRunner: options?.spawnRunner,
    repoRoot: options?.repoRoot,
    dbPath: options?.dbPath
  });
  return { automatedCount: result.automatedCount, specPaths: result.specPaths };
}
