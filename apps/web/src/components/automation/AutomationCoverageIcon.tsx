import {
  automationCoverageLabel,
  automationCoverageLevel,
  type AutomationCoverageLevel
} from "../../automation/automationStatus";

type Props = {
  automationStatus: string | null | undefined;
  linkedAutomatedCount: number;
};

const COVERAGE_ICONS: Record<AutomationCoverageLevel, string> = {
  none: "○",
  partial: "◐",
  full: "●",
  blocked: "⊘"
};

export function AutomationCoverageIcon({ automationStatus, linkedAutomatedCount }: Props) {
  const level = automationCoverageLevel(automationStatus, linkedAutomatedCount);
  const label = automationCoverageLabel(level);

  return (
    <span
      className={`automation-coverage-icon automation-coverage-icon--${level}`}
      title={label}
      aria-label={label}
      data-testid="automation-coverage-icon"
      data-coverage-level={level}
    >
      <span aria-hidden="true">{COVERAGE_ICONS[level]}</span>
    </span>
  );
}
