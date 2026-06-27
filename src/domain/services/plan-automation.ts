import { spawn } from "node:child_process";
import { join } from "node:path";
import { inArray, eq } from "drizzle-orm";
import { AppError } from "../errors";
import { runTestCaseAssignments, testCases, testPlans, testRuns } from "../../db/schema";
import { createTestRun } from "./runs";
import { flattenTestPlanMembers } from "./test-plan-flatten";

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
      externalId: testCases.externalId,
      isDeleted: testCases.isDeleted
    })
    .from(testCases)
    .where(
      inArray(
        testCases.id,
        flattened.map((f) => f.testCaseId)
      )
    );

  const automatedCases = caseRows.filter((tc) => tc.type === "automated" && !tc.isDeleted);

  const specPaths = [
    ...new Set(
      automatedCases
        .map((tc) => tc.externalId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  ];

  if (automatedCases.length === 0) {
    throw new AppError(
      "PLAN_NO_AUTOMATION",
      "Test plan has no automated test cases to run.",
      "Link automated tests to this plan (directly or via sub-plans) before launching.",
      { testPlanId: input.testPlanId }
    );
  }

  if (specPaths.length === 0) {
    throw new AppError(
      "PLAN_AUTOMATION_NO_EXTERNAL_ID",
      "Automated tests in this plan are missing externalId (spec path).",
      "Set externalId on automated test cases (e.g. e2e/fe-projects-create.spec.ts).",
      { testPlanId: input.testPlanId, automatedTestCaseIds: automatedCases.map((a) => a.id) }
    );
  }

  const run = await createTestRun(db, {
    projectId: input.projectId,
    name: `Automation · ${new Date().toISOString()}`,
    trigger: "plan_automation",
    testPlanId: input.testPlanId
  });

  const shouldSpawn = options?.spawnRunner !== false;
  if (shouldSpawn) {
    const repoRoot = options?.repoRoot ?? process.cwd();
    const dbPath = options?.dbPath ?? process.env.DB_PATH ?? join(repoRoot, "data", "tcms.sqlite");
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(npx, ["tsx", "scripts/run-plan-automation.ts", "--run-id", run.id, "--db-path", dbPath], {
      cwd: repoRoot,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, DB_PATH: dbPath }
    });
    child.unref();
  }

  return { run, automatedCount: automatedCases.length, specPaths };
}

/** Spawn Playwright runner for an existing run that already has plan assignments. */
export async function spawnAutomationForRun(
  db: Db,
  input: { runId: string; projectId: string },
  options?: { spawnRunner?: boolean; repoRoot?: string; dbPath?: string }
): Promise<{ automatedCount: number; specPaths: string[] }> {
  const runRows = await db.select().from(testRuns).where(eq(testRuns.id, input.runId));
  if (runRows.length === 0 || runRows[0].projectId !== input.projectId) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Test run not found in project scope.",
      "Use a run from the same project.",
      { runId: input.runId, projectId: input.projectId }
    );
  }

  const assignments = await db
    .select({ testCaseId: runTestCaseAssignments.testCaseId })
    .from(runTestCaseAssignments)
    .where(eq(runTestCaseAssignments.runId, input.runId));

  const caseRows =
    assignments.length === 0
      ? []
      : await db
          .select({
            id: testCases.id,
            type: testCases.type,
            externalId: testCases.externalId,
            isDeleted: testCases.isDeleted
          })
          .from(testCases)
          .where(
            inArray(
              testCases.id,
              assignments.map((a) => a.testCaseId)
            )
          );

  const automatedCases = caseRows.filter((tc) => tc.type === "automated" && !tc.isDeleted);
  const specPaths = [
    ...new Set(
      automatedCases
        .map((tc) => tc.externalId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  ];

  if (automatedCases.length === 0) {
    throw new AppError(
      "RUN_NO_AUTOMATION",
      "This run has no automated test cases to execute.",
      "Link a test plan with automated coverage or assign automated cases before executing.",
      { runId: input.runId }
    );
  }

  const shouldSpawn = options?.spawnRunner !== false;
  if (shouldSpawn) {
    const repoRoot = options?.repoRoot ?? process.cwd();
    const dbPath = options?.dbPath ?? process.env.DB_PATH ?? join(repoRoot, "data", "tcms.sqlite");
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(npx, ["tsx", "scripts/run-plan-automation.ts", "--run-id", input.runId, "--db-path", dbPath], {
      cwd: repoRoot,
      detached: true,
      stdio: "ignore",
      env: { ...process.env, DB_PATH: dbPath }
    });
    child.unref();
  }

  return { automatedCount: automatedCases.length, specPaths };
}
