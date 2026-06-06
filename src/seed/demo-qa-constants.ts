/**
 * Canonical DEMO-QA identifiers shared by seed script, E2E fixtures, and design docs.
 */
export const DEMO_QA_PROJECT_KEY = "DEMO-QA";
export const DEMO_QA_PROJECT_NAME = "Demo QA sample workspace";

export const DEMO_QA_REQUIREMENT_KEYS = {
  R1: "DEMO-R1",
  R2: "DEMO-R2",
  R3: "DEMO-R3"
} as const;

export const DEMO_QA_MANUAL_TITLES = {
  login: "Manual: successful login with valid credentials",
  idleTimeout: "Manual: idle timeout logs user out",
  passwordReset: "Manual: password reset happy path"
} as const;

export const DEMO_QA_AUTOMATED_TITLE = "API: token exchange returns access token";

export const DEMO_QA_RUN_NAME = "Demo regression - staging";
export const DEMO_QA_PLAN_NAME = "Demo regression plan";

export type DemoQaSeedManifest = {
  projectId: string;
  projectKey: string;
  requirementIds: Record<keyof typeof DEMO_QA_REQUIREMENT_KEYS, string>;
  manualTestCaseIds: Record<keyof typeof DEMO_QA_MANUAL_TITLES, string>;
  automatedTestCaseId: string;
  testPlanId: string;
  runId: string;
};
