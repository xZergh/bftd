export type AutomationFrameworkId = string;

export type AutomationTarget = {
  manualTestCaseId: string;
  automatedTestCaseId: string;
  externalId: string;
};

export type AutomationSpecOutcome = {
  testCaseId: string;
  externalId: string;
  status: "passed" | "failed" | "skipped";
  durationMs: number;
  failureMessage?: string;
  testName?: string;
  suite?: string;
};

export type AutomationRunReport = {
  framework: AutomationFrameworkId;
  generatedAt: string;
  attachment: { kind: string; ref: string };
  ctrfAttachment?: { kind: string; ref: string };
  ctrfHtmlAttachment?: { kind: string; ref: string };
  summary: {
    total: number;
    passed: number;
    failed: number;
    durationMs: number;
    specs: AutomationSpecOutcome[];
  };
};

export type AutomationExecuteRequest = {
  repoRoot: string;
  runId: string;
  targets: Array<{ testCaseId: string; externalId: string }>;
  reportDir: string;
};

export type AutomationExecuteResult = {
  outcomes: AutomationSpecOutcome[];
  report: AutomationRunReport;
};

/** Pluggable test-framework runner (Playwright MVP; pytest/JUnit/etc. later). */
export interface TestFrameworkAdapter {
  readonly id: AutomationFrameworkId;
  execute(request: AutomationExecuteRequest): Promise<AutomationExecuteResult>;
}
