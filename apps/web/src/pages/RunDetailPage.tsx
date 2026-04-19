import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  RunAggregateQuery,
  SubmitTestResultMutation,
  TestCasesListQuery,
  TestRunDetailQuery
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG } from "../forms/mandatoryFields";
import type { TestCaseListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

const RESULT_STATUSES = ["passed", "failed", "skipped", "blocked"] as const;

export function RunDetailPage() {
  const { projectId, runId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [testCaseId, setTestCaseId] = useState("");
  const [status, setStatus] = useState<string>("passed");
  const [durationMs, setDurationMs] = useState("0");
  const [tcError, setTcError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const paused =
    projectId === undefined || projectId === "" || runId === undefined || runId === "";

  const [detailResult, reexecuteDetail] = useQuery({
    query: TestRunDetailQuery,
    variables: { runId: runId ?? "", projectId: projectId ?? undefined },
    pause: paused
  });

  const [aggregateResult, reexecuteAggregate] = useQuery({
    query: RunAggregateQuery,
    variables: { runId: runId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [casesResult] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", includeDeleted: false },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [, submitResult] = useMutation(SubmitTestResultMutation);

  const detail = detailResult.data?.testRun;

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(detailResult.error));
  }, [detailResult.error, setTransportMessage]);

  useEffect(() => {
    if (!aggregateResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(aggregateResult.error));
  }, [aggregateResult.error, setTransportMessage]);

  const caseTitleById = useMemo(() => {
    const testCases: TestCaseListItem[] = casesResult.data?.testCases ?? [];
    const m = new Map<string, string>();
    for (const t of testCases) {
      m.set(t.id, t.title);
    }
    return m;
  }, [casesResult.data?.testCases]);

  const submitClientPayload = useMemo(() => {
    const d = durationMs.trim() === "" ? null : Number.parseInt(durationMs.trim(), 10);
    return {
      mutation: "SubmitTestResult",
      variables: {
        input: {
          runId: runId ?? null,
          testCaseId: testCaseId === "" ? null : testCaseId,
          status: status === "" ? null : status,
          durationMs: Number.isFinite(d as number) ? d : null
        }
      }
    };
  }, [durationMs, runId, status, testCaseId]);

  const onSubmitResult = useCallback(async () => {
    if (paused || runId === undefined) {
      return;
    }
    clearShellMessages();
    let invalid = false;
    if (testCaseId === "") {
      setTcError(REQUIRED_MSG);
      invalid = true;
    } else {
      setTcError(null);
    }
    if (invalid) {
      setShowValidationPayload(true);
      return;
    }
    setShowValidationPayload(false);
    const d = durationMs.trim() === "" ? 0 : Number.parseInt(durationMs.trim(), 10);
    const duration = Number.isFinite(d) ? d : 0;
    const res = await submitResult({
      input: {
        runId,
        testCaseId,
        status,
        durationMs: duration
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.submitTestResult?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setTestCaseId("");
    setDurationMs("0");
    reexecuteDetail({ requestPolicy: "network-only" });
    reexecuteAggregate({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    durationMs,
    paused,
    reexecuteAggregate,
    reexecuteDetail,
    runId,
    setPayloadAppError,
    setTransportMessage,
    status,
    submitResult,
    testCaseId
  ]);

  if (paused) {
    return null;
  }

  if (detailResult.fetching && detailResult.data === undefined) {
    return (
      <section className="projects-page" data-testid="run-detail-loading">
        <PageLoading />
      </section>
    );
  }

  if (!detailResult.fetching && detailResult.data !== undefined && detail === null) {
    return (
      <section className="projects-page" data-testid="run-not-found">
        <h2>Run not found</h2>
        <RouterLink to={`/projects/${projectId}/runs`}>Back to runs</RouterLink>
      </section>
    );
  }

  if (detail === undefined || detail === null) {
    return (
      <section className="projects-page" data-testid="run-detail-loading">
        <PageLoading />
      </section>
    );
  }

  const run = detail.run;
  const agg = aggregateResult.data?.runAggregate;

  return (
    <section className="projects-page" data-testid="run-detail-page">
      <ProjectWorkspaceHeader title="Test run" projectId={projectId} active="runs" />

      <dl className="project-detail-meta">
        <div>
          <dt>Name</dt>
          <dd data-testid="run-detail-name">{run.name}</dd>
        </div>
        <div>
          <dt>Created</dt>
          <dd>
            <time dateTime={run.createdAt} data-testid="run-detail-created">
              {new Date(run.createdAt).toLocaleString()}
            </time>
          </dd>
        </div>
      </dl>

      <div className="projects-create run-aggregate-panel" data-testid="run-aggregate-panel">
        <h3 className="projects-subheading">Aggregate</h3>
        {aggregateResult.fetching && agg === undefined ? (
          <PageLoading dataTestId="run-aggregate-loading" />
        ) : agg !== undefined ? (
          <dl className="run-aggregate-grid">
            <div>
              <dt>Total</dt>
              <dd data-testid="run-aggregate-total">{agg.total}</dd>
            </div>
            <div>
              <dt>Passed</dt>
              <dd data-testid="run-aggregate-passed">{agg.passed}</dd>
            </div>
            <div>
              <dt>Failed</dt>
              <dd data-testid="run-aggregate-failed">{agg.failed}</dd>
            </div>
            <div>
              <dt>Skipped</dt>
              <dd data-testid="run-aggregate-skipped">{agg.skipped}</dd>
            </div>
            <div>
              <dt>Blocked</dt>
              <dd data-testid="run-aggregate-blocked">{agg.blocked}</dd>
            </div>
            <div>
              <dt>Pass rate</dt>
              <dd data-testid="run-aggregate-pass-rate">{agg.passRatePct}%</dd>
            </div>
            <div>
              <dt>Duration (ms)</dt>
              <dd data-testid="run-aggregate-duration-ms">{agg.durationMs}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      <div className="projects-create" data-testid="run-submit-result-panel">
        <h3 className="projects-subheading">Submit result</h3>
        <div className="projects-create-fields">
          <label>
            Test case <span className="required-star" aria-hidden="true">*</span>
            <select
              value={testCaseId}
              onChange={(e) => {
                setTestCaseId(e.target.value);
                setTcError(null);
                setShowValidationPayload(false);
              }}
              data-testid="result-submit-testcase"
            >
              <option value="">—</option>
              {(casesResult.data?.testCases ?? []).map((t: TestCaseListItem) => (
                <option key={t.id} value={t.id}>
                  [{t.type}] {t.title}
                </option>
              ))}
            </select>
            {tcError !== null && (
              <p className="field-error" role="alert" data-testid="result-submit-testcase-error">
                {tcError}
              </p>
            )}
          </label>
          <label>
            Status <span className="required-star" aria-hidden="true">*</span>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setShowValidationPayload(false);
              }}
              data-testid="result-submit-status"
            >
              {RESULT_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label>
            Duration (ms)
            <input
              type="number"
              min={0}
              value={durationMs}
              onChange={(e) => setDurationMs(e.target.value)}
              data-testid="result-submit-duration"
            />
          </label>
        </div>
        <ValidationErrorPayloadPreview open={showValidationPayload} payload={submitClientPayload} />
        <button type="button" onClick={onSubmitResult} data-testid="result-submit-button">
          Submit result
        </button>
      </div>

      <div className="projects-create">
        <h3 className="projects-subheading">Results</h3>
        {(detail?.results ?? []).length === 0 ? (
          <p className="projects-empty" data-testid="run-results-empty">
            No results yet.
          </p>
        ) : (
          <table className="projects-table" data-testid="run-results-table">
            <thead>
              <tr>
                <th scope="col">Test case</th>
                <th scope="col">Status</th>
                <th scope="col">Duration (ms)</th>
              </tr>
            </thead>
            <tbody>
              {(detail?.results ?? []).map(
                (r: { id: string; testCaseId: string; status: string; durationMs: number }) => (
                  <tr key={r.id} data-testid="run-result-row">
                    <td data-testid="run-result-testcase-title">
                      {caseTitleById.get(r.testCaseId) ?? r.testCaseId}
                    </td>
                    <td data-testid="run-result-status">{r.status}</td>
                    <td>{r.durationMs}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
