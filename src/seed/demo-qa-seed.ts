import type { TcmsService } from "../domain/service";
import { slugifyProjectKey } from "../domain/services/projects";
import {
  DEMO_QA_AUTOMATED_TITLE,
  DEMO_QA_MANUAL_TITLES,
  DEMO_QA_PLAN_NAME,
  DEMO_QA_PROJECT_KEY,
  DEMO_QA_PROJECT_NAME,
  DEMO_QA_REQUIREMENT_KEYS,
  DEMO_QA_RUN_NAME,
  type DemoQaSeedManifest
} from "./demo-qa-constants";

export type SeedDemoQaOptions = {
  /** When true, skip if DEMO-QA already exists. When false, caller must ensure a clean DB or no duplicate key. */
  skipIfExists?: boolean;
};

export async function seedDemoQaProject(
  service: TcmsService,
  options: SeedDemoQaOptions = {}
): Promise<DemoQaSeedManifest | null> {
  const skipIfExists = options.skipIfExists ?? true;
  const projects = await service.listProjects({ includeArchived: true });
  const demoKey = slugifyProjectKey(DEMO_QA_PROJECT_KEY);
  const existing = projects.find((p) => p.key === demoKey);
  if (existing) {
    if (skipIfExists) {
      return null;
    }
    throw new Error(`Project key "${DEMO_QA_PROJECT_KEY}" already exists; reset the database before re-seeding.`);
  }

  const project = await service.createProject(
    DEMO_QA_PROJECT_NAME,
    DEMO_QA_PROJECT_KEY,
    "Seeded demo workspace for UI review, manual QA, and Playwright E2E."
  );
  const projectId = project.id;

  const r1 = await service.createRequirement({
    projectId,
    externalKey: DEMO_QA_REQUIREMENT_KEYS.R1,
    title: "User can sign in with email and password",
    description: "Covers primary authentication for the web client.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "approved",
    priority: "high",
    tags: ["demo", "auth"],
    requirementType: "functional"
  });
  const r2 = await service.createRequirement({
    projectId,
    externalKey: DEMO_QA_REQUIREMENT_KEYS.R2,
    title: "Session expires after configured idle timeout",
    description: "Security requirement for idle logout.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "draft",
    priority: "medium",
    tags: ["demo", "security"],
    requirementType: "nonfunctional"
  });
  const r3 = await service.createRequirement({
    projectId,
    externalKey: DEMO_QA_REQUIREMENT_KEYS.R3,
    title: "Password reset sends a single-use link",
    description: "Self-service recovery flow.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "in_progress",
    priority: "high",
    tags: ["demo", "auth"],
    requirementType: "functional"
  });

  const manualLogin = await service.createManualTestCase({
    projectId,
    title: DEMO_QA_MANUAL_TITLES.login,
    requirementIds: [r1.id],
    steps: [
      { name: "Open sign-in page", expectedResult: "Email and password fields visible" },
      { name: "Enter valid credentials and submit", expectedResult: "User lands on home dashboard" }
    ],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  });

  const manualTimeout = await service.createManualTestCase({
    projectId,
    title: DEMO_QA_MANUAL_TITLES.idleTimeout,
    requirementIds: [r2.id],
    steps: [{ name: "Sign in and remain idle past timeout", expectedResult: "Session ends; sign-in required" }],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  });

  const manualReset = await service.createManualTestCase({
    projectId,
    title: DEMO_QA_MANUAL_TITLES.passwordReset,
    requirementIds: [r3.id],
    steps: [
      { name: "Request reset for known email", expectedResult: "Confirmation message shown" },
      { name: "Open reset link and set new password", expectedResult: "Can sign in with new password" }
    ],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2"
  });

  const automatedAuth = await service.createAutomatedTestCase({
    projectId,
    title: DEMO_QA_AUTOMATED_TITLE,
    manualTestCaseIds: [manualLogin.id],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  });

  const plan = await service.createTestPlan({
    projectId,
    name: DEMO_QA_PLAN_NAME,
    description: "Curated regression slice for staging sign-off.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  });
  for (const tc of [manualLogin, manualTimeout, manualReset, automatedAuth]) {
    await service.linkTestPlanTestCase({ testPlanId: plan.id, testCaseId: tc.id });
  }

  const run = await service.createTestRun({
    projectId,
    name: DEMO_QA_RUN_NAME,
    environment: "staging",
    buildVersion: "demo-1.0.0",
    trigger: "seed-script"
  });

  await service.submitTestResult({ runId: run.id, testCaseId: manualLogin.id, status: "passed", durationMs: 1200 });
  await service.submitTestResult({ runId: run.id, testCaseId: manualTimeout.id, status: "failed", durationMs: 800 });
  await service.submitTestResult({ runId: run.id, testCaseId: manualReset.id, status: "skipped", durationMs: 0 });
  await service.submitTestResult({ runId: run.id, testCaseId: automatedAuth.id, status: "passed", durationMs: 340 });

  return {
    projectId,
    projectKey: DEMO_QA_PROJECT_KEY,
    requirementIds: { R1: r1.id, R2: r2.id, R3: r3.id },
    manualTestCaseIds: {
      login: manualLogin.id,
      idleTimeout: manualTimeout.id,
      passwordReset: manualReset.id
    },
    automatedTestCaseId: automatedAuth.id,
    testPlanId: plan.id,
    runId: run.id
  };
}
