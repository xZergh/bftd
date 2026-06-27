import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  testId?: string;
  actions?: ReactNode;
  subtitle?: ReactNode;
  className?: string;
};

export function CollapsibleSection({
  title,
  children,
  defaultOpen = true,
  testId,
  actions,
  subtitle,
  className
}: CollapsibleSectionProps) {
  const classes = ["run-collapsible", className].filter(Boolean).join(" ");

  return (
    <details className={classes} open={defaultOpen || undefined} data-testid={testId}>
      <summary className="run-collapsible__summary">
        <span className="run-collapsible__chevron" aria-hidden="true">
          ▸
        </span>
        <span className="run-collapsible__title">{title}</span>
        {subtitle ? <span className="run-collapsible__subtitle">{subtitle}</span> : null}
        {actions ? (
          <span
            className="run-collapsible__actions"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            {actions}
          </span>
        ) : null}
      </summary>
      <div className="run-collapsible__body">{children}</div>
    </details>
  );
}
