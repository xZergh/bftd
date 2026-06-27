import type { ReactNode } from "react";

type SelectionBarProps = {
  count: number;
  onClear: () => void;
  children?: ReactNode;
  testId?: string;
};

export function SelectionBar({ count, onClear, children, testId = "plan-selection-bar" }: SelectionBarProps) {
  if (count === 0 && children === undefined) {
    return null;
  }
  return (
    <div className="plan-selection-bar" data-testid={testId}>
      <span className="plan-selection-bar-count" data-testid={`${testId}-count`}>
        {count} selected
      </span>
      <button type="button" onClick={onClear} data-testid={`${testId}-clear`}>
        Clear
      </button>
      {children}
    </div>
  );
}
