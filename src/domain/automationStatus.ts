export const TEST_CASE_AUTOMATION_STATUSES = [
  "not_automated",
  "automation_required",
  "in_progress",
  "automated",
  "not_automatable"
] as const;

export type TestCaseAutomationStatus = (typeof TEST_CASE_AUTOMATION_STATUSES)[number];

export const DEFAULT_MANUAL_AUTOMATION_STATUS: TestCaseAutomationStatus = "not_automated";
export const DEFAULT_AUTOMATED_AUTOMATION_STATUS: TestCaseAutomationStatus = "automated";

export function isTestCaseAutomationStatus(value: string): value is TestCaseAutomationStatus {
  return (TEST_CASE_AUTOMATION_STATUSES as readonly string[]).includes(value);
}

export function normalizeAutomationStatusInput(
  value: string | null | undefined,
  fallback?: TestCaseAutomationStatus
): TestCaseAutomationStatus | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  if (!isTestCaseAutomationStatus(trimmed)) {
    throw new Error(`Invalid automation status: ${trimmed}`);
  }
  return trimmed;
}

export function defaultAutomationStatusForType(type: "manual" | "automated"): TestCaseAutomationStatus {
  return type === "automated" ? DEFAULT_AUTOMATED_AUTOMATION_STATUS : DEFAULT_MANUAL_AUTOMATION_STATUS;
}
