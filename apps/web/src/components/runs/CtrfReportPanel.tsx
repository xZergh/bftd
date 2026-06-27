import { formatRunStatusLabel } from "./runStatusFormat";
import { CtrfVisualizer } from "./CtrfVisualizer";
import { CollapsibleSection } from "./CollapsibleSection";
import { sanitizeAutomationMessage } from "../../utils/sanitizeAutomationMessage";

export type CtrfSpecOutcome = {
  testCaseId: string;
  externalId: string;
  status: string;
  durationMs: number;
  failureMessage?: string | null;
  testName?: string | null;
  suite?: string | null;
};

type CtrfReportPanelProps = {
  framework: string;
  generatedAt: string;
  passed: number;
  failed: number;
  durationMs: number;
  specs: CtrfSpecOutcome[];
  ctrfReportUrl: string | null;
};

function failureHeadline(message?: string | null) {
  const sanitized = sanitizeAutomationMessage(message);
  if (!sanitized) {
    return null;
  }
  const firstLine = sanitized.split("\n")[0]?.trim() ?? sanitized;
  return firstLine.replace(/^Error:\s*/, "");
}

function specFileName(externalId: string) {
  const normalized = externalId.replace(/\\/g, "/");
  return normalized.split("/").pop() ?? externalId;
}

export function CtrfReportPanel(props: CtrfReportPanelProps) {
  const failedSpecs = props.specs.filter((spec) => spec.status === "failed");
  const rootCause =
    failedSpecs.length > 0
      ? [...new Set(failedSpecs.map((spec) => failureHeadline(spec.failureMessage)).filter(Boolean))].slice(0, 3)
      : [];

  return (
    <>
      <dl className="run-report-summary-grid">
        <div>
          <dt>Framework</dt>
          <dd>{props.framework}</dd>
        </div>
        <div>
          <dt>Generated</dt>
          <dd>
            <time dateTime={props.generatedAt}>{new Date(props.generatedAt).toLocaleString()}</time>
          </dd>
        </div>
        <div>
          <dt>Passed</dt>
          <dd data-testid="run-report-passed">{props.passed}</dd>
        </div>
        <div>
          <dt>Failed</dt>
          <dd data-testid="run-report-failed">{props.failed}</dd>
        </div>
        <div>
          <dt>Duration (ms)</dt>
          <dd>{props.durationMs}</dd>
        </div>
      </dl>

      {failedSpecs.length > 0 ? (
        <CollapsibleSection
          title="Failure analysis"
          subtitle={`${failedSpecs.length} failed`}
          defaultOpen
          testId="run-report-failure-analysis"
          className="run-report-failure-analysis"
        >
          {rootCause.length === 1 ? (
            <p className="run-report-root-cause" data-testid="run-report-root-cause">
              <strong>Likely root cause:</strong> {rootCause[0]}
            </p>
          ) : null}
          <ul className="run-report-failure-list">
            {failedSpecs.map((spec) => (
              <li key={spec.testCaseId} data-testid={`run-report-failure-${spec.testCaseId}`}>
                <span className="run-report-failure-spec">{specFileName(spec.externalId)}</span>
                <span className="run-report-failure-name">{spec.testName ?? "Unnamed test"}</span>
                <p className="run-report-failure-message">{failureHeadline(spec.failureMessage) ?? "Failed"}</p>
              </li>
            ))}
          </ul>
        </CollapsibleSection>
      ) : null}

      {props.ctrfReportUrl ? (
        <CollapsibleSection
          title="CTRF report"
          subtitle={`${props.passed} passed · ${props.failed} failed`}
          defaultOpen
          testId="run-report-ctrf-shell"
          className="run-report-ctrf-shell"
          actions={
            <a href={props.ctrfReportUrl} target="_blank" rel="noreferrer" data-testid="run-report-download-ctrf">
              Download JSON
            </a>
          }
        >
          <CtrfVisualizer
            ctrfReportUrl={props.ctrfReportUrl}
            reportGeneratedAt={props.generatedAt}
            linkedSpecs={props.specs}
          />
        </CollapsibleSection>
      ) : (
        <table className="projects-table run-report-spec-table" data-testid="run-report-spec-table">
          <thead>
            <tr>
              <th scope="col">Spec</th>
              <th scope="col">Test</th>
              <th scope="col">Status</th>
              <th scope="col">Duration (ms)</th>
              <th scope="col">Failure</th>
            </tr>
          </thead>
          <tbody>
            {props.specs.map((spec) => (
              <tr key={spec.testCaseId}>
                <td>{specFileName(spec.externalId)}</td>
                <td>{spec.testName ?? "—"}</td>
                <td>{formatRunStatusLabel(spec.status)}</td>
                <td>{spec.durationMs}</td>
                <td className="run-report-failure-cell">{failureHeadline(spec.failureMessage) ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
