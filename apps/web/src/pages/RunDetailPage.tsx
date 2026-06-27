import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  ExecuteRunAutomationMutation,
  RunAggregateQuery,
  RunAutomationPreviewQuery,
  SubmitTestResultMutation,
  TestCasesListQuery,
  TestRunDetailQuery
} from "../graphql/documents";
import { CtrfReportPanel } from "../components/runs/CtrfReportPanel";
import { CollapsibleSection } from "../components/runs/CollapsibleSection";
import { formatRunStatusLabel } from "../components/runs/runStatusFormat";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG } from "../forms/mandatoryFields";
import type { TestCaseListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

const RESULT_STATUSES = ["not_run", "passed", "failed", "skipped", "blocked"] as const;

function normalizeRunStatusValue(status: string) {
  if (status === "not run" || status === "notRun") return "not_run";
  return status;
}

export function RunDetailPage() {
  const { projectId, runId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [testCaseId, setTestCaseId] = useState("");
  const [status, setStatus] = useState<string>("passed");
  const [durationMs, setDurationMs] = useState("0");
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [rowStatusDraft, setRowStatusDraft] = useState<Record<string, string>>({});
  const [selectedManualIds, setSelectedManualIds] = useState<Set<string>>(new Set());
  const [automationPolling, setAutomationPolling] = useState(false);
  const automationReportBaselineRef = useRef<string | null>(null);
  const [tcError, setTcError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const paused =
    projectId === undefined || projectId === "" || runId === undefined || runId === "";

  const [detailResult, reexecuteDetail] = useQuery({
    query: TestRunDetailQuery,
    variables: { runId: runId ?? "", projectId: projectId ?? undefined },
    pause: paused
  });

  const runNotFound =
    !detailResult.fetching && detailResult.data !== undefined && detailResult.data?.testRun === null;

  const [aggregateResult, reexecuteAggregate] = useQuery({
    query: RunAggregateQuery,
    variables: { runId: runId ?? "" },
    pause: paused || runNotFound,
    requestPolicy: "network-only"
  });

  const [casesResult] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", includeDeleted: false },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [, submitResult] = useMutation(SubmitTestResultMutation);
  const [, executeAutomation] = useMutation(ExecuteRunAutomationMutation);

  const detail = detailResult.data?.testRun;

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(detailResult.error));
  }, [detailResult.error, setTransportMessage]);

  useEffect(() => {
    if (!aggregateResult.error || runNotFound) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(aggregateResult.error));
  }, [aggregateResult.error, runNotFound, setTransportMessage]);

  const caseTitleById = useMemo(() => {
    const testCases: TestCaseListItem[] = casesResult.data?.testCases ?? [];
    const m = new Map<string, string>();
    for (const t of testCases) {
      m.set(t.id, t.title);
    }
    return m;
  }, [casesResult.data?.testCases]);

  const caseTypeById = useMemo(() => {
    const testCases: TestCaseListItem[] = casesResult.data?.testCases ?? [];
    const m = new Map<string, string>();
    for (const t of testCases) {
      m.set(t.id, t.type);
    }
    return m;
  }, [casesResult.data?.testCases]);

  const manualResultIds = useMemo(() => {
    const results = detail?.results ?? [];
    return results
      .map((r: { testCaseId: string }) => r.testCaseId)
      .filter((id: string) => caseTypeById.get(id) === "manual");
  }, [caseTypeById, detail?.results]);

  useEffect(() => {
    setSelectedManualIds(new Set());
  }, [runId]);

  useEffect(() => {
    if (manualResultIds.length === 0) {
      return;
    }
    setSelectedManualIds((prev) => {
      if (prev.size > 0) {
        return prev;
      }
      return new Set(manualResultIds);
    });
  }, [manualResultIds]);

  const selectedManualList = useMemo(() => [...selectedManualIds], [selectedManualIds]);

  const [previewResult] = useQuery({
    query: RunAutomationPreviewQuery,
    variables: {
      input: {
        runId: runId ?? "",
        projectId: projectId ?? "",
        manualTestCaseIds: selectedManualList.length > 0 ? selectedManualList : undefined
      }
    },
    pause: paused || selectedManualList.length === 0
  });

  const automationPreview = previewResult.data?.runAutomationPreview;

  const selectableCases = useMemo(() => {
    const results = detail?.results ?? [];
    if (results.length > 0) {
      return results
        .map((r: { testCaseId: string }) => r.testCaseId)
        .filter((id, idx, arr) => arr.indexOf(id) === idx)
        .map((id) => ({ id, title: caseTitleById.get(id) ?? id }));
    }
    return (casesResult.data?.testCases ?? []).map((t: TestCaseListItem) => ({ id: t.id, title: t.title }));
  }, [caseTitleById, casesResult.data?.testCases, detail?.results]);

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
    setSubmitModalOpen(false);
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

  const refreshRunData = useCallback(() => {
    reexecuteDetail({ requestPolicy: "network-only" });
    reexecuteAggregate({ requestPolicy: "network-only" });
  }, [reexecuteAggregate, reexecuteDetail]);

  useEffect(() => {
    if (!automationPolling) {
      return;
    }
    const report = detail?.run?.automationReport;
    if (!report) {
      return;
    }
    const baseline = automationReportBaselineRef.current;
    if (baseline !== null && report.generatedAt === baseline) {
      return;
    }
    automationReportBaselineRef.current = null;
    setAutomationPolling(false);
    setTransportMessage(null);
  }, [automationPolling, detail?.run?.automationReport, setTransportMessage]);

  useEffect(() => {
    if (!automationPolling) {
      return;
    }
    const interval = window.setInterval(() => {
      refreshRunData();
    }, 3000);
    const timeout = window.setTimeout(() => {
      automationReportBaselineRef.current = null;
      setAutomationPolling(false);
      setTransportMessage(null);
    }, 60000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [automationPolling, refreshRunData, setTransportMessage]);

  const onRunLinkedAutomation = useCallback(async () => {
    if (paused || runId === undefined || projectId === undefined) {
      return;
    }
    if (selectedManualList.length === 0) {
      setTransportMessage("Select at least one manual test case.");
      return;
    }
    clearShellMessages();
    const res = await executeAutomation({
      input: {
        runId,
        projectId,
        manualTestCaseIds: selectedManualList
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.executeRunAutomation?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    if (res.data?.executeRunAutomation?.started) {
      automationReportBaselineRef.current = detail?.run?.automationReport?.generatedAt ?? null;
      setAutomationPolling(true);
      setTransportMessage(
        `Started ${res.data.executeRunAutomation.automatedCount} linked automated test(s) in the background.`
      );
    }
    refreshRunData();
  }, [
    clearShellMessages,
    detail?.run?.automationReport?.generatedAt,
    executeAutomation,
    paused,
    projectId,
    refreshRunData,
    runId,
    selectedManualList,
    setPayloadAppError,
    setTransportMessage
  ]);

  const toggleManualSelection = useCallback((testCaseId: string, checked: boolean) => {
    setSelectedManualIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(testCaseId);
      } else {
        next.delete(testCaseId);
      }
      return next;
    });
  }, []);

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
  const automationReport = run.automationReport;
  const ctrfReportUrl =
    typeof automationReport?.ctrfReportUrl === "string" && automationReport.ctrfReportUrl.length > 0
      ? automationReport.ctrfReportUrl
      : null;
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

      <CollapsibleSection
        title="Aggregate"
        defaultOpen
        testId="run-aggregate-panel"
        className="projects-create run-aggregate-panel"
        subtitle={
          agg !== undefined
            ? `${agg.passed} passed · ${agg.failed} failed · ${agg.passRatePct}% pass rate`
            : undefined
        }
      >
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
              <dt>Not run</dt>
              <dd data-testid="run-aggregate-not-run">{agg.notRun}</dd>
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
      </CollapsibleSection>

      <CollapsibleSection
        title="Test report"
        defaultOpen
        testId="run-report-panel"
        className="projects-create run-report-panel"
        subtitle={
          automationReport
            ? `${automationReport.summary.passed} passed · ${automationReport.summary.failed} failed`
            : automationPolling
              ? "Running…"
              : "No report yet"
        }
      >
        <div className="run-automation-bar" data-testid="run-automation-bar">
          <button
            type="button"
            data-testid="run-linked-automation-button"
            disabled={selectedManualList.length === 0 || (automationPreview?.automatedCount ?? 0) === 0}
            onClick={() => void onRunLinkedAutomation()}
          >
            Run linked automation
          </button>
          <span className="automation-preview-count" data-testid="run-automation-preview">
            {selectedManualList.length} manual selected · {automationPreview?.automatedCount ?? 0} automated linked
            {automationPolling ? " · running…" : ""}
          </span>
        </div>
        <CollapsibleSection title="Preconditions & setup" defaultOpen={false} testId="run-report-preconditions">
          <p className="automation-section-hint">
            Preconditions: main dev on <strong>5180</strong> (tcms.sqlite) plus automation sandbox on{" "}
            <strong>5182</strong> (plan-automation.sqlite) — see{" "}
            <code>docs/plans/plan-automation-local.md</code>. Reports use the{" "}
            <a href="https://ctrf.io" target="_blank" rel="noreferrer">
              CTRF
            </a>{" "}
            format so any framework with a CTRF reporter can plug in. The report viewer loads CTRF JSON and renders a
            searchable summary with failure details. Use <strong>Select all manual</strong> to run every linked automated
            test.
          </p>
        </CollapsibleSection>
        <div className="run-report-embed-shell" data-testid="run-report-embed-shell">
          {automationPolling && !automationReport ? (
            <p className="projects-empty" data-testid="run-report-running">
              Running automation…
            </p>
          ) : automationReport ? (
            <CtrfReportPanel
              framework={automationReport.framework}
              generatedAt={automationReport.generatedAt}
              passed={automationReport.summary.passed}
              failed={automationReport.summary.failed}
              durationMs={automationReport.summary.durationMs}
              specs={automationReport.summary.specs}
              ctrfReportUrl={ctrfReportUrl}
            />
          ) : (
            <p className="projects-empty">No report attached yet.</p>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Results"
        defaultOpen
        testId="run-results-panel"
        className="projects-create"
        subtitle={
          detail?.results?.length ? `${detail.results.length} result${detail.results.length === 1 ? "" : "s"}` : undefined
        }
        actions={
          <div className="run-results-header-actions">
            {manualResultIds.length > 0 ? (
              <button
                type="button"
                data-testid="run-select-all-manual"
                onClick={() => setSelectedManualIds(new Set(manualResultIds))}
              >
                Select all manual
              </button>
            ) : null}
            <button
              type="button"
              data-testid="result-submit-open"
              onClick={() => {
                if (testCaseId === "" && selectableCases.length > 0) {
                  setTestCaseId(selectableCases[0]!.id);
                }
                setSubmitModalOpen(true);
              }}
            >
              Submit result
            </button>
          </div>
        }
      >
        {(detail?.results ?? []).length === 0 ? (
          <p className="projects-empty" data-testid="run-results-empty">
            No results yet.
          </p>
        ) : (
          <table className="projects-table" data-testid="run-results-table">
            <thead>
              <tr>
                <th scope="col" aria-label="Select manual cases" />
                <th scope="col">Test case</th>
                <th scope="col">Status</th>
                <th scope="col">Set status</th>
                <th scope="col">Duration (ms)</th>
              </tr>
            </thead>
            <tbody>
              {(detail?.results ?? []).map(
                (r: { id: string; testCaseId: string; status: string; durationMs: number }) => {
                  const isManual = caseTypeById.get(r.testCaseId) === "manual";
                  return (
                  <tr key={r.id} data-testid="run-result-row">
                    <td>
                      {isManual ? (
                        <input
                          type="checkbox"
                          checked={selectedManualIds.has(r.testCaseId)}
                          data-testid="run-result-manual-select"
                          aria-label={`Select ${caseTitleById.get(r.testCaseId) ?? r.testCaseId}`}
                          onChange={(e) => toggleManualSelection(r.testCaseId, e.target.checked)}
                        />
                      ) : null}
                    </td>
                    <td data-testid="run-result-testcase-title">
                      {caseTitleById.get(r.testCaseId) ?? r.testCaseId}
                    </td>
                    <td data-testid="run-result-status">{formatRunStatusLabel(r.status)}</td>
                    <td>
                      <select
                        value={rowStatusDraft[r.testCaseId] ?? normalizeRunStatusValue(r.status)}
                        data-testid="run-result-status-select"
                        onChange={(e) => {
                          const next = e.target.value;
                          setRowStatusDraft((prev) => ({ ...prev, [r.testCaseId]: normalizeRunStatusValue(next) }));
                          setTestCaseId(r.testCaseId);
                          setStatus(normalizeRunStatusValue(next));
                          setTcError(null);
                          setShowValidationPayload(false);
                        }}
                      >
                        {RESULT_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {formatRunStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>{r.durationMs}</td>
                  </tr>
                  );
                }
              )}
            </tbody>
          </table>
        )}
      </CollapsibleSection>
      {submitModalOpen ? (
        <div
          className="projects-modal-backdrop"
          role="presentation"
          data-testid="result-submit-dialog"
          onClick={() => setSubmitModalOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setSubmitModalOpen(false);
            }
          }}
        >
          <div
            className="projects-create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-submit-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="result-submit-dialog-title" className="projects-subheading">
              Submit result
            </h3>
            <div className="projects-create-fields">
              <label>
                Test case <span className="required-star" aria-hidden="true">*</span>
                <select
                  value={testCaseId}
                  onChange={(e) => {
                    const nextTestCaseId = e.target.value;
                    setTestCaseId(nextTestCaseId);
                    setStatus(normalizeRunStatusValue(rowStatusDraft[nextTestCaseId] ?? "not_run"));
                    setTcError(null);
                    setShowValidationPayload(false);
                  }}
                  data-testid="result-submit-testcase"
                >
                  <option value="">—</option>
                  {selectableCases.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                {tcError !== null ? (
                  <p className="field-error" role="alert" data-testid="result-submit-testcase-error">
                    {tcError}
                  </p>
                ) : null}
              </label>
              <label>
                Status <span className="required-star" aria-hidden="true">*</span>
                <select
                  value={status}
                  onChange={(e) => {
                    const nextStatus = normalizeRunStatusValue(e.target.value);
                    setStatus(nextStatus);
                    if (testCaseId !== "") {
                      setRowStatusDraft((prev) => ({ ...prev, [testCaseId]: nextStatus }));
                    }
                    setShowValidationPayload(false);
                  }}
                  data-testid="result-submit-status"
                >
                  {RESULT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {formatRunStatusLabel(s)}
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
              Submit
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
