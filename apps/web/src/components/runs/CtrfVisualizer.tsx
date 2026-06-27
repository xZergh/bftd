import { useEffect, useMemo, useState } from "react";
import { formatRunStatusLabel } from "./runStatusFormat";
import { sanitizeAutomationMessage } from "../../utils/sanitizeAutomationMessage";

type CtrfTest = {
  name: string;
  status: string;
  duration?: number;
  message?: string;
  trace?: string;
  snippet?: string;
  filePath?: string;
  suite?: string;
  tags?: string[];
  attachments?: Array<{ name?: string; contentType?: string; path?: string }>;
};

type CtrfReport = {
  results?: {
    tool?: { name?: string };
    summary?: {
      tests?: number;
      passed?: number;
      failed?: number;
      skipped?: number;
      pending?: number;
      start?: number;
      stop?: number;
    };
    tests?: CtrfTest[];
  };
};

type LinkedSpec = {
  externalId: string;
  status: string;
  durationMs: number;
  testName?: string | null;
  failureMessage?: string | null;
  suite?: string | null;
};

type StatusFilter = "all" | "passed" | "failed" | "skipped";

type VisualizerRow = {
  externalId: string;
  status: string;
  durationMs: number;
  testName: string;
  suite?: string | null;
  failureMessage?: string | null;
  ctrfTest?: CtrfTest;
};

function specFileLabel(externalId: string) {
  const normalized = externalId.replace(/\\/g, "/");
  const e2eIdx = normalized.indexOf("e2e/");
  if (e2eIdx >= 0) {
    return normalized.slice(e2eIdx);
  }
  return normalized.split("/").pop() ?? normalized;
}

function lookupKeys(fileOrExternalId: string): string[] {
  const normalized = fileOrExternalId.replace(/\\/g, "/");
  const withE2e = normalized.includes("e2e/")
    ? normalized.slice(normalized.indexOf("e2e/"))
    : normalized.startsWith("e2e/")
      ? normalized
      : `e2e/${normalized}`;
  const base = withE2e.split("/").pop() ?? withE2e;
  return [...new Set([withE2e, normalized, base, `e2e/${base}`])];
}

function matchesExternalId(test: CtrfTest, externalId: string): boolean {
  const file = (test.filePath ?? "").replace(/\\/g, "/");
  if (!file) {
    return false;
  }
  const keys = lookupKeys(externalId);
  return keys.some((key) => file.endsWith(key) || file.includes(`/${key}`));
}

function normalizeFilterStatus(status: string): StatusFilter {
  if (status === "passed") {
    return "passed";
  }
  if (status === "skipped" || status === "pending") {
    return "skipped";
  }
  return "failed";
}

function failureDetail(row: VisualizerRow) {
  const fromCtrf = row.ctrfTest
    ? sanitizeAutomationMessage(row.ctrfTest.trace ?? row.ctrfTest.message ?? row.ctrfTest.snippet)
    : undefined;
  return fromCtrf ?? sanitizeAutomationMessage(row.failureMessage);
}

function rowsFromLinkedSpecs(linkedSpecs: LinkedSpec[], tests: CtrfTest[]): VisualizerRow[] {
  return linkedSpecs.map((spec) => {
    const ctrfTest = tests.find((test) => matchesExternalId(test, spec.externalId));
    return {
      externalId: spec.externalId,
      status: spec.status,
      durationMs: spec.durationMs,
      testName: spec.testName ?? ctrfTest?.name ?? "Unnamed test",
      suite: spec.suite ?? ctrfTest?.suite,
      failureMessage: spec.failureMessage,
      ctrfTest
    };
  });
}

function rowsFromCtrfTests(tests: CtrfTest[]): VisualizerRow[] {
  return tests.map((test) => ({
    externalId: test.filePath ? specFileLabel(test.filePath) : test.name,
    status: test.status,
    durationMs: test.duration ?? 0,
    testName: test.name,
    suite: test.suite,
    failureMessage: sanitizeAutomationMessage(test.message ?? test.trace),
    ctrfTest: test
  }));
}

type CtrfVisualizerProps = {
  ctrfReportUrl: string;
  reportGeneratedAt: string;
  linkedSpecs?: LinkedSpec[];
};

export function CtrfVisualizer({ ctrfReportUrl, reportGeneratedAt, linkedSpecs }: CtrfVisualizerProps) {
  const [report, setReport] = useState<CtrfReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const url = `${ctrfReportUrl}${ctrfReportUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(reportGeneratedAt)}`;
    void fetch(url, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Could not load CTRF report (${res.status})`);
        }
        return res.json() as Promise<CtrfReport>;
      })
      .then((json) => {
        if (!cancelled) {
          setReport(json);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setReport(null);
          setError(err instanceof Error ? err.message : "Could not load CTRF report.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ctrfReportUrl, reportGeneratedAt]);

  const tests = report?.results?.tests ?? [];
  const rows = useMemo(() => {
    if (linkedSpecs && linkedSpecs.length > 0) {
      return rowsFromLinkedSpecs(linkedSpecs, tests);
    }
    return rowsFromCtrfTests(tests);
  }, [linkedSpecs, tests]);

  const stats = useMemo(() => {
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    for (const row of rows) {
      const status = normalizeFilterStatus(row.status);
      if (status === "passed") {
        passed += 1;
      } else if (status === "skipped") {
        skipped += 1;
      } else {
        failed += 1;
      }
    }
    return { total: rows.length, passed, failed, skipped };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && normalizeFilterStatus(row.status) !== filter) {
        return false;
      }
      if (!q) {
        return true;
      }
      const haystack = [row.testName, row.suite, row.externalId, row.failureMessage, row.ctrfTest?.message]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [filter, query, rows]);

  const groupedRows = useMemo(() => {
    const groups = new Map<string, VisualizerRow[]>();
    for (const row of filteredRows) {
      const key = specFileLabel(row.externalId);
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        groups.set(key, [row]);
      }
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filteredRows]);

  const summary = report?.results?.summary;
  const durationMs =
    summary?.stop != null && summary?.start != null
      ? Math.max(0, summary.stop - summary.start)
      : rows.reduce((sum, row) => sum + row.durationMs, 0);

  if (loading) {
    return (
      <p className="projects-empty" data-testid="run-report-ctrf-loading">
        Loading CTRF report…
      </p>
    );
  }

  if (error) {
    return (
      <p className="projects-empty" data-testid="run-report-ctrf-error">
        {error}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="projects-empty" data-testid="run-report-ctrf-empty">
        No tests found in CTRF report.
      </p>
    );
  }

  return (
    <section className="run-report-ctrf-visualizer" data-testid="run-report-ctrf-visualizer">
      <div className="ctrf-viz-summary" data-testid="run-report-ctrf-summary">
        <span className="ctrf-viz-stat">
          <strong>{stats.total}</strong> tests
        </span>
        <span className="ctrf-viz-stat ctrf-viz-stat--passed">
          <strong>{stats.passed}</strong> passed
        </span>
        <span className="ctrf-viz-stat ctrf-viz-stat--failed">
          <strong>{stats.failed}</strong> failed
        </span>
        <span className="ctrf-viz-stat">
          <strong>{stats.skipped}</strong> skipped
        </span>
        <span className="ctrf-viz-stat">
          <strong>{durationMs}</strong> ms
        </span>
        {report?.results?.tool?.name ? (
          <span className="ctrf-viz-stat">
            tool: <strong>{report.results.tool.name}</strong>
          </span>
        ) : null}
      </div>

      <div className="ctrf-viz-toolbar">
        <div className="ctrf-viz-filters" role="group" aria-label="Filter tests by status">
          {(["all", "failed", "passed", "skipped"] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={filter === value ? "ctrf-viz-filter ctrf-viz-filter--active" : "ctrf-viz-filter"}
              onClick={() => setFilter(value)}
              data-testid={`run-report-ctrf-filter-${value}`}
            >
              {value === "all" ? "All" : formatRunStatusLabel(value)}
            </button>
          ))}
        </div>
        <label className="ctrf-viz-search">
          <span className="sr-only">Search tests</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tests…"
            data-testid="run-report-ctrf-search"
          />
        </label>
      </div>

      <div className="ctrf-viz-groups">
        {groupedRows.map(([file, fileRows]) => {
          const failedCount = fileRows.filter((row) => normalizeFilterStatus(row.status) === "failed").length;
          return (
            <details
              key={file}
              className="ctrf-viz-group run-collapsible"
              open={failedCount > 0 || fileRows.length <= 2 || undefined}
              data-testid={`run-report-ctrf-group-${file}`}
            >
              <summary className="run-collapsible__summary ctrf-viz-group-summary">
                <span className="run-collapsible__chevron" aria-hidden="true">
                  ▸
                </span>
                <span className="ctrf-viz-group-title">{file}</span>
                <span className="run-collapsible__subtitle">
                  {fileRows.length} test{fileRows.length === 1 ? "" : "s"}
                  {failedCount > 0 ? ` · ${failedCount} failed` : ""}
                </span>
              </summary>
              <ul className="ctrf-viz-test-list run-collapsible__body">
                {fileRows.map((row) => {
                  const detail = failureDetail(row);
                  const statusClass = normalizeFilterStatus(row.status);
                  return (
                    <li
                      key={`${file}:${row.externalId}:${row.testName}`}
                      className="ctrf-viz-test"
                    >
                      <div className="ctrf-viz-test-header">
                        <span className={`ctrf-viz-status ctrf-viz-status--${statusClass}`}>
                          {formatRunStatusLabel(row.status)}
                        </span>
                        <span className="ctrf-viz-test-name">{row.testName}</span>
                        <span className="ctrf-viz-test-duration">{row.durationMs} ms</span>
                      </div>
                      {row.suite ? <p className="ctrf-viz-test-suite">{row.suite}</p> : null}
                      {row.ctrfTest?.tags && row.ctrfTest.tags.length > 0 ? (
                        <p className="ctrf-viz-test-tags">{row.ctrfTest.tags.join(" ")}</p>
                      ) : null}
                      {statusClass === "failed" && detail ? (
                        <details className="ctrf-viz-failure-details">
                          <summary>Failure details</summary>
                          <pre className="ctrf-viz-failure-pre">{detail}</pre>
                        </details>
                      ) : null}
                      {row.ctrfTest?.attachments && row.ctrfTest.attachments.length > 0 ? (
                        <ul className="ctrf-viz-attachments">
                          {row.ctrfTest.attachments.map((attachment) => (
                            <li key={`${attachment.name}:${attachment.path}`}>
                              {attachment.name ?? "attachment"}
                              {attachment.path ? `: ${attachment.path}` : ""}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </details>
          );
        })}
      </div>
    </section>
  );
}
