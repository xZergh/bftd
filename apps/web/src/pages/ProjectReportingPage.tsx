import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "urql";
import {
  KpiDashboardQuery,
  RunTraceabilityReportQuery,
  TestRunsListQuery,
  TraceabilityGraphQuery
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import type {
  KpiCoverageFormulaInfo,
  KpiCoverageMetricValue,
  KpiDashboardPayload,
  RunTraceabilityEdge,
  RunTraceabilityReportPayload,
  TestRunListItem,
  TraceabilityCoverageByStatusRow,
  TraceabilityGraphPayload
} from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

function formatCoveragePct(valuePct: number): string {
  const r = Math.round(valuePct * 100) / 100;
  return `${r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)}%`;
}

export function ProjectReportingPage() {
  const { projectId } = useParams();
  const { setTransportMessage } = useShellErrors();
  const paused = projectId === undefined || projectId === "";

  const [kpiResult] = useQuery({
    query: KpiDashboardQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [graphResult] = useQuery({
    query: TraceabilityGraphQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [runsResult] = useQuery({
    query: TestRunsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const runs: TestRunListItem[] = runsResult.data?.testRuns ?? [];
  const [selectedRunId, setSelectedRunId] = useState("");

  const runIdsKey = runs.map((r: TestRunListItem) => r.id).join(",");

  useEffect(() => {
    const rs = runsResult.data?.testRuns;
    if (!rs?.length) {
      setSelectedRunId("");
      return;
    }
    setSelectedRunId((prev) => {
      if (prev && rs.some((r: TestRunListItem) => r.id === prev)) {
        return prev;
      }
      return rs[0].id;
    });
    // runIdsKey encodes run id set; avoid effect churn from urql `data` object identity.
  }, [runIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps -- sync select to list contents

  const [traceReportResult] = useQuery({
    query: RunTraceabilityReportQuery,
    variables: { runId: selectedRunId },
    pause: paused || selectedRunId === "",
    requestPolicy: "network-only"
  });

  useEffect(() => {
    if (!kpiResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(kpiResult.error));
  }, [kpiResult.error, setTransportMessage]);

  useEffect(() => {
    if (!graphResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(graphResult.error));
  }, [graphResult.error, setTransportMessage]);

  useEffect(() => {
    if (!runsResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(runsResult.error));
  }, [runsResult.error, setTransportMessage]);

  useEffect(() => {
    if (!traceReportResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(traceReportResult.error));
  }, [traceReportResult.error, setTransportMessage]);

  const kpi = kpiResult.data?.kpiDashboard as KpiDashboardPayload | undefined;
  const graph = graphResult.data?.traceabilityGraph as TraceabilityGraphPayload | undefined;
  const traceReport = traceReportResult.data?.runTraceabilityReport as RunTraceabilityReportPayload | undefined;

  const formulaRows = useMemo(() => {
    const info: KpiCoverageFormulaInfo[] = kpi?.coverageFormulaInfo ?? [];
    const cov: KpiCoverageMetricValue[] = kpi?.current?.coverage ?? [];
    return info.map((f: KpiCoverageFormulaInfo) => ({
      formulaId: f.formulaId,
      label: f.label,
      numeratorLabel: f.numeratorLabel,
      denominatorLabel: f.denominatorLabel,
      metric: cov.find((c: KpiCoverageMetricValue) => c.formulaId === f.formulaId)
    }));
  }, [kpi]);

  if (paused) {
    return null;
  }

  return (
    <section className="projects-page" data-testid="reporting-page">
      <div className="project-detail-header">
        <h2 id="reporting-heading">Reporting</h2>
        <div className="project-detail-header-links">
          <Link to={`/projects/${projectId}`} data-testid="reporting-back-project">
            ← Project
          </Link>
          <Link to={`/projects/${projectId}/requirements`} data-testid="project-nav-requirements">
            Requirements
          </Link>
          <Link to={`/projects/${projectId}/test-cases`} data-testid="project-nav-test-cases">
            Test cases
          </Link>
          <Link to={`/projects/${projectId}/runs`} data-testid="project-nav-runs">
            Runs
          </Link>
        </div>
      </div>

      <section className="reporting-section" aria-labelledby="kpi-dashboard-heading">
        <h3 id="kpi-dashboard-heading">KPI dashboard</h3>
        {kpiResult.fetching && !kpi ? <p>Loading KPI…</p> : null}
        {kpi ? (
          <>
            <p className="reporting-meta">
              Generated{" "}
              <time dateTime={kpi.generatedAt} data-testid="kpi-generated-at">
                {kpi.generatedAt}
              </time>
            </p>
            <table className="projects-table reporting-kpi-table">
              <thead>
                <tr>
                  <th scope="col">Coverage metric</th>
                  <th scope="col">Value</th>
                  <th scope="col">Numerator / denominator</th>
                </tr>
              </thead>
              <tbody>
                {formulaRows.map(
                  (row: {
                    formulaId: string;
                    label: string;
                    numeratorLabel: string;
                    denominatorLabel: string;
                    metric: KpiCoverageMetricValue | undefined;
                  }) => (
                    <tr key={row.formulaId} data-testid="kpi-coverage-row" data-formula-id={row.formulaId}>
                      <td data-testid="kpi-formula-label">{row.label}</td>
                      <td data-testid="kpi-value-pct">
                        {row.metric !== undefined ? formatCoveragePct(row.metric.valuePct) : "—"}
                      </td>
                      <td data-testid="kpi-num-den">
                        {row.metric !== undefined
                          ? `${row.metric.numerator} / ${row.metric.denominator} (${row.numeratorLabel} / ${row.denominatorLabel})`
                          : "—"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
            <dl className="reporting-current-dl" data-testid="kpi-current-summary">
              <div>
                <dt>Requirements</dt>
                <dd data-testid="kpi-current-total-requirements">{kpi.current.totalRequirements}</dd>
              </div>
              <div>
                <dt>Manual test cases</dt>
                <dd data-testid="kpi-current-total-manual">{kpi.current.totalManualCases}</dd>
              </div>
              <div>
                <dt>Test runs</dt>
                <dd data-testid="kpi-current-total-runs">{kpi.current.totalTestRuns}</dd>
              </div>
            </dl>
          </>
        ) : null}
      </section>

      <section className="reporting-section" aria-labelledby="trace-graph-heading">
        <h3 id="trace-graph-heading">Traceability graph</h3>
        {graphResult.fetching && !graph ? <p>Loading graph…</p> : null}
        {graph ? (
          <>
            <p className="reporting-meta">
              <span data-testid="trace-graph-node-count">{graph.nodes.length}</span> nodes,{" "}
              <span data-testid="trace-graph-edge-count">{graph.edges.length}</span> edges
            </p>
            <table className="projects-table">
              <thead>
                <tr>
                  <th scope="col">Requirement status</th>
                  <th scope="col">Requirements</th>
                  <th scope="col">With manual link</th>
                </tr>
              </thead>
              <tbody>
                {graph.coverageByRequirementStatus.map((row: TraceabilityCoverageByStatusRow) => (
                  <tr key={row.status} data-testid="trace-graph-coverage-row">
                    <td>{row.status}</td>
                    <td>{row.requirementCount}</td>
                    <td>{row.withManualLinkCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}
      </section>

      <section className="reporting-section" aria-labelledby="run-trace-heading">
        <h3 id="run-trace-heading">Run traceability snapshot</h3>
        {runs.length === 0 ? (
          <p data-testid="run-trace-empty">Create a test run to capture a traceability snapshot.</p>
        ) : (
          <>
            <label className="reporting-run-select-label">
              Run{" "}
              <select
                value={selectedRunId}
                onChange={(e) => setSelectedRunId(e.target.value)}
                data-testid="run-trace-select"
              >
                {runs.map((r: TestRunListItem) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            {traceReportResult.fetching && !traceReport ? <p>Loading snapshot…</p> : null}
            {traceReport ? (
              <>
                <p className="reporting-meta">
                  Captured{" "}
                  <time dateTime={traceReport.capturedAt}>{traceReport.capturedAt}</time> ·{" "}
                  <span data-testid="run-trace-edge-count">{traceReport.edges.length}</span> traceability edge(s)
                </p>
                <table className="projects-table">
                  <thead>
                    <tr>
                      <th scope="col">Requirement id</th>
                      <th scope="col">Manual testcase id</th>
                      <th scope="col">Automated testcase id</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traceReport.edges.map((e: RunTraceabilityEdge, i: number) => (
                      <tr key={`${e.requirementId}-${e.manualTestCaseId}-${i}`} data-testid="run-trace-edge-row">
                        <td>
                          <code>{e.requirementId}</code>
                        </td>
                        <td>
                          <code>{e.manualTestCaseId}</code>
                        </td>
                        <td>
                          <code>{e.automatedTestCaseId ?? "—"}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}
          </>
        )}
      </section>
    </section>
  );
}
