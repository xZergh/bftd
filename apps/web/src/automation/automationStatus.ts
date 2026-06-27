export const TEST_CASE_AUTOMATION_STATUSES = [
  "not_automated",
  "automation_required",
  "in_progress",
  "automated",
  "not_automatable"
] as const;

export type TestCaseAutomationStatus = (typeof TEST_CASE_AUTOMATION_STATUSES)[number];

export const AUTOMATION_STATUS_LABELS: Record<TestCaseAutomationStatus, string> = {
  not_automated: "Not automated",
  automation_required: "Automation required",
  in_progress: "In progress",
  automated: "Automated",
  not_automatable: "Not automatable"
};

export function automationStatusLabel(status: string | null | undefined): string {
  if (status === null || status === undefined || status === "") {
    return AUTOMATION_STATUS_LABELS.not_automated;
  }
  if ((TEST_CASE_AUTOMATION_STATUSES as readonly string[]).includes(status)) {
    return AUTOMATION_STATUS_LABELS[status as TestCaseAutomationStatus];
  }
  return status;
}

export function automationStatusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case "automated":
      return "automation-status-badge automation-status-badge--automated";
    case "in_progress":
      return "automation-status-badge automation-status-badge--in-progress";
    case "automation_required":
      return "automation-status-badge automation-status-badge--required";
    case "not_automatable":
      return "automation-status-badge automation-status-badge--blocked";
    default:
      return "automation-status-badge automation-status-badge--pending";
  }
}

export type AutomationWorkspaceTab = "coverage" | "automated";

export function parseAutomationTab(value: string | null): AutomationWorkspaceTab {
  return value === "automated" ? "automated" : "coverage";
}

export type LinkedAutomatedTest = {
  id: string;
  title: string;
  externalKey: string | null;
  externalId: string | null;
};

export type AutomationCoverageLevel = "none" | "partial" | "full" | "blocked";

export function automationCoverageLevel(
  status: string | null | undefined,
  linkedAutomatedCount: number
): AutomationCoverageLevel {
  if (status === "not_automatable") {
    return "blocked";
  }
  if (status === "automated") {
    return "full";
  }
  if (linkedAutomatedCount > 0 || status === "in_progress") {
    return "partial";
  }
  return "none";
}

export function automationCoverageLabel(level: AutomationCoverageLevel): string {
  switch (level) {
    case "full":
      return "Fully automated";
    case "partial":
      return "Partial automation coverage";
    case "blocked":
      return "Not automatable";
    default:
      return "Not automated";
  }
}

export function automationCoverageSortKey(status: string | null | undefined, linkedAutomatedCount: number): number {
  switch (automationCoverageLevel(status, linkedAutomatedCount)) {
    case "blocked":
      return 0;
    case "none":
      return 1;
    case "partial":
      return 2;
    case "full":
      return 3;
    default:
      return 1;
  }
}
