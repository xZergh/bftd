import { AutomationCoverageIcon } from "../automation/AutomationCoverageIcon";
import type { TestCaseListItem } from "../../graphql/types";

type TestCaseQuickViewModalProps = {
  testCase: TestCaseListItem;
  linkedAutomatedCount: number;
  inPlan: boolean;
  onClose: () => void;
};

export function TestCaseQuickViewModal({ testCase, linkedAutomatedCount, inPlan, onClose }: TestCaseQuickViewModalProps) {
  return (
    <div
      className="projects-modal-backdrop"
      role="presentation"
      data-testid="plan-tc-quick-view"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="projects-create-dialog plan-tc-quick-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-tc-quick-view-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="detail-panel-header plan-tc-quick-header">
          <button type="button" className="detail-panel-close" onClick={onClose} data-testid="plan-tc-quick-view-close">
            Close
          </button>
        </div>
        <h3 id="plan-tc-quick-view-title" className="plan-tc-quick-title">
          {testCase.title}
        </h3>
        {testCase.description ? <p className="plan-tc-quick-desc">{testCase.description}</p> : null}
        <p className="plan-tc-quick-inline-meta">
          {testCase.externalKey ? (
            <>
              <span>
                Key <code>{testCase.externalKey}</code>
              </span>
              <span className="plan-tc-quick-sep" aria-hidden="true">
                ·
              </span>
            </>
          ) : null}
          <span>Type {testCase.type}</span>
          <span className="plan-tc-quick-sep" aria-hidden="true">
            ·
          </span>
          <span>Epic {testCase.epic ? <code>{testCase.epic.externalKey}</code> : "—"}</span>
          <span className="plan-tc-quick-sep" aria-hidden="true">
            ·
          </span>
          <span>In plan {inPlan ? "yes" : "no"}</span>
          <span className="plan-tc-quick-sep" aria-hidden="true">
            ·
          </span>
          <span className="plan-tc-quick-auto">
            Auto <AutomationCoverageIcon automationStatus={testCase.automationStatus} linkedAutomatedCount={linkedAutomatedCount} />
          </span>
          {(testCase.releaseLabel ?? testCase.sprintLabel) ? (
            <>
              <span className="plan-tc-quick-sep" aria-hidden="true">
                ·
              </span>
              <span>
                {testCase.releaseLabel ?? "—"} / {testCase.sprintLabel ?? "—"}
              </span>
            </>
          ) : null}
        </p>
        {testCase.preconditions ? (
          <p className="plan-tc-quick-extra">
            <strong>Preconditions:</strong> {testCase.preconditions}
          </p>
        ) : null}
        {testCase.notes ? (
          <p className="plan-tc-quick-extra">
            <strong>Notes:</strong> {testCase.notes}
          </p>
        ) : null}
      </div>
    </div>
  );
}
