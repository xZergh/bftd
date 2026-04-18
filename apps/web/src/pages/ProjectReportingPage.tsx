import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { CoveragePie } from "../components/reporting/CoveragePie";
import { TraceabilityTree } from "../components/reporting/TraceabilityTree";
import {
  KpiDashboardQuery,
  RequirementsListQuery,
  RunTraceabilityReportQuery,
  TestCasesListQuery,
  TestRunsListQuery,
  TraceabilityGraphQuery
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import type {
  KpiCoverageFormulaInfo,
  KpiCoverageMetricValue,
  KpiDashboardPayload,
  RequirementListItem,
  RunTraceabilityEdge,
  RunTraceabilityReportPayload,
  TestCaseListItem,
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

  const [requirementsListResult] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [testCasesListResult] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", includeDeleted: true },
    pause: paused,
    requestPolicy: "network-only"
  });

  const runs: TestRunListItem[] = runsResult.data?.testRuns ?? [];
  const [selectedRunId, setSelectedRunId] = useState("");

  const runIdsKey = runs.map((r: TestRunListItem) => r.id).join(",");

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- default run selection tracks fetched testRuns list */
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
    /* eslint-enable react-hooks/set-state-in-effect */
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

  useEffect(() => {
    if (!requirementsListResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(requirementsListResult.error));
  }, [requirementsListResult.error, setTransportMessage]);

  useEffect(() => {
    if (!testCasesListResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(testCasesListResult.error));
  }, [testCasesListResult.error, setTransportMessage]);

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
  }, [kpi?.coverageFormulaInfo, kpi?.current?.coverage]); // eslint-disable-line react-hooks/exhaustive-deps -- rows derive from these slices only

  const requirementTitleById = useMemo(() => {
    const m = new Map<string, string>();
    const list: RequirementListItem[] = requirementsListResult.data?.requirements ?? [];
    for (const r of list) {
      m.set(r.id, r.title.trim().length > 0 ? r.title : r.externalKey);
    }
    return m;
  }, [requirementsListResult.data?.requirements]);

  const testCaseTitleById = useMemo(() => {
    const m = new Map<string, string>();
    const list: TestCaseListItem[] = testCasesListResult.data?.testCases ?? [];
    for (const t of list) {
      const title = t.title.trim();
      m.set(t.id, title.length > 0 ? title : t.externalId ?? t.id);
    }
    return m;
  }, [testCasesListResult.data?.testCases]);

  function snapshotReqTitle(id: string): string {
    return requirementTitleById.get(id) ?? "Unknown requirement";
  }

  function snapshotCaseTitle(id: string): string {
    return testCaseTitleById.get(id) ?? "Unknown test case";
  }

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

      <section className="reporting-section reporting-kpi-visual-vars" aria-labelledby="kpi-dashboard-heading">
        <h3 id="kpi-dashboard-heading">KPI dashboard</h3>
        {kpiResult.fetching && !kpi ? <PageLoading message="Loading KPI…" /> : null}
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
                  <th scope="col" className="reporting-kpi-th-chart">
                    <span className="sr-only">Coverage chart</span>
                  </th>
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
                      <td className="reporting-kpi-td-chart">
                        {row.metric !== undefined ? (
                          <div className="coverage-pie-wrap">
                            <CoveragePie
                              numerator={row.metric.numerator}
                              denominator={row.metric.denominator}
                              label={`${row.label}: ${row.metric.numerator} of ${row.metric.denominator}`}
                            />
                          </div>
                        ) : (
                          <div className="coverage-pie-wrap coverage-pie-wrap--empty" aria-hidden />
                        )}
                      </td>
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
        {graphResult.fetching && !graph ? <PageLoading message="Loading graph…" /> : null}
        {graph ? (
          <>
            <p className="reporting-meta">
              <span data-testid="trace-graph-node-count">{graph.nodes.length}</span> nodes,{" "}
              <span data-testid="trace-graph-edge-count">{graph.edges.length}</span> edges
            </p>
            <TraceabilityTree graph={graph} />
            <h4 className="reporting-subheading">Coverage by requirement status</h4>
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
            {traceReportResult.fetching && !traceReport ? <PageLoading message="Loading snapshot…" /> : null}
            {traceReport ? (
              <>
                <p className="reporting-meta">
                  Captured{" "}
                  <time dateTime={traceReport.capturedAt}>{traceReport.capturedAt}</time> ·{" "}
                  <span data-testid="run-trace-edge-count">{traceReport.edges.length}</span> traceability edge(s)
                </p>
                <table className="projects-table reporting-run-trace-table">
                  <thead>
                    <tr>
                      <th scope="col">Requirement</th>
                      <th scope="col">Manual test case</th>
                      <th scope="col">Automated test case</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traceReport.edges.map((e: RunTraceabilityEdge, i: number) => (
                      <tr key={`${e.requirementId}-${e.manualTestCaseId}-${i}`} data-testid="run-trace-edge-row">
                        <td data-testid="run-trace-req-title">{snapshotReqTitle(e.requirementId)}</td>
                        <td data-testid="run-trace-manual-title">{snapshotCaseTitle(e.manualTestCaseId)}</td>
                        <td data-testid="run-trace-auto-title">
                          {e.automatedTestCaseId !== null && e.automatedTestCaseId !== undefined && e.automatedTestCaseId !== ""
                            ? snapshotCaseTitle(e.automatedTestCaseId)
                            : "—"}
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
