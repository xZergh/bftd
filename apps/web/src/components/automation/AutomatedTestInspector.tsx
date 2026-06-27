import { RouterLink } from "../../tamagui/RouterLink";
import { useQuery } from "urql";
import { PageLoading } from "../PageLoading";
import { TestCaseByIdQuery } from "../../graphql/documents";
import { formatGraphQlTransportError } from "../../graphql/formatGraphQlError";
import { useEffect } from "react";
import { useShellErrors } from "../../shell/ShellErrorsContext";
import { AllureStepsReadable } from "./AllureStepsReadable";

type Props = {
  projectId: string;
  testCaseId: string;
  linkedManualTitles: string[];
  onClose: () => void;
};

export function AutomatedTestInspector({ projectId, testCaseId, linkedManualTitles, onClose }: Props) {
  const { setTransportMessage } = useShellErrors();
  const [detailResult] = useQuery({
    query: TestCaseByIdQuery,
    variables: { id: testCaseId, projectId, includeDeleted: false },
    requestPolicy: "network-only"
  });

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(detailResult.error));
  }, [detailResult.error, setTransportMessage]);

  const tc = detailResult.data?.testCase;

  if (detailResult.fetching && tc === undefined) {
    return <PageLoading />;
  }

  if (tc === undefined || tc === null) {
    return (
      <div className="automation-inspector" data-testid="automated-test-inspector-missing">
        <p>Automated test case not found.</p>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="automation-inspector" data-testid="automated-test-inspector">
      <div className="detail-panel-header">
        <div className="detail-panel-header-actions">
          <button type="button" className="detail-panel-close" onClick={onClose} data-testid="automated-test-close">
            Close
          </button>
        </div>
      </div>

      <dl className="detail-meta-strip" aria-label="Automated test summary">
        <div className="detail-meta-item">
          <dt className="detail-meta-label">Key</dt>
          <dd>{tc.externalKey ?? "—"}</dd>
        </div>
        <div className="detail-meta-item">
          <dt className="detail-meta-label">Automation ID</dt>
          <dd>
            <code>{tc.externalId ?? "—"}</code>
          </dd>
        </div>
        <div className="detail-meta-item">
          <dt className="detail-meta-label">Title</dt>
          <dd>{tc.title}</dd>
        </div>
      </dl>

      <section className="automation-linked-block">
        <h3 className="projects-subheading">Covers manual tests</h3>
        {linkedManualTitles.length === 0 ? (
          <p className="projects-empty">No manual tests linked.</p>
        ) : (
          <ul>
            {linkedManualTitles.map((title) => (
              <li key={title}>{title}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="automation-steps-block">
        <h3 className="projects-subheading">Automated steps</h3>
        <AllureStepsReadable steps={tc.steps ?? []} />
      </section>
    </div>
  );
}
