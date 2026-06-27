import {
  AUTOMATION_STATUS_LABELS,
  TEST_CASE_AUTOMATION_STATUSES,
  automationStatusBadgeClass,
  automationStatusLabel,
  type TestCaseAutomationStatus
} from "../../automation/automationStatus";

type Props = {
  status: string | null | undefined;
};

export function AutomationStatusBadge({ status }: Props) {
  return (
    <span className={automationStatusBadgeClass(status)} data-testid="automation-status-badge">
      {automationStatusLabel(status)}
    </span>
  );
}

type SelectProps = {
  value: string;
  disabled?: boolean;
  onChange: (next: TestCaseAutomationStatus) => void;
  testId?: string;
};

export function AutomationStatusSelect({ value, disabled, onChange, testId }: SelectProps) {
  const current = (TEST_CASE_AUTOMATION_STATUSES as readonly string[]).includes(value)
    ? (value as TestCaseAutomationStatus)
    : "not_automated";

  return (
    <select
      value={current}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as TestCaseAutomationStatus)}
      data-testid={testId ?? "automation-status-select"}
    >
      {TEST_CASE_AUTOMATION_STATUSES.map((s) => (
        <option key={s} value={s}>
          {AUTOMATION_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
