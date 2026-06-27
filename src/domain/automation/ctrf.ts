import { readFileSync } from "node:fs";
import { sanitizeAutomationMessage } from "./message-sanitize";
import type { AutomationSpecOutcome } from "./types";

export type CtrfTestStatus = "passed" | "failed" | "skipped" | "pending" | "other";

export type CtrfTest = {
  name: string;
  status: CtrfTestStatus | string;
  duration: number;
  message?: string;
  trace?: string;
  filePath?: string;
  suite?: string;
};

export type CtrfReport = {
  reportFormat?: string;
  results: {
    tool?: { name?: string };
    summary?: {
      tests?: number;
      passed?: number;
      failed?: number;
      skipped?: number;
      pending?: number;
      other?: number;
      start?: number;
      stop?: number;
    };
    tests: CtrfTest[];
  };
};

export function parseCtrfReportFile(reportPath: string): CtrfReport | null {
  try {
    const parsed = JSON.parse(readFileSync(reportPath, "utf8")) as CtrfReport;
    if (!parsed?.results?.tests || !Array.isArray(parsed.results.tests)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function normalizeSpecPath(externalId: string): string {
  return externalId.startsWith("e2e/") ? externalId : `e2e/${externalId}`;
}

export function specLookupKeys(file: string): string[] {
  const normalized = file.replace(/\\/g, "/");
  const withE2e = normalized.includes("e2e/")
    ? normalized.slice(normalized.indexOf("e2e/"))
    : normalized.startsWith("e2e/")
      ? normalized
      : `e2e/${normalized}`;
  const base = withE2e.split("/").pop() ?? withE2e;
  return [...new Set([withE2e, normalized, base, `e2e/${base}`])];
}

type FileAggregate = {
  passed: boolean;
  skipped: boolean;
  durationMs: number;
  failureMessage?: string;
  testName?: string;
  suite?: string;
};

function mapCtrfStatus(status: string): "passed" | "failed" | "skipped" {
  if (status === "passed") {
    return "passed";
  }
  if (status === "skipped" || status === "pending") {
    return "skipped";
  }
  return "failed";
}

function failureText(test: CtrfTest) {
  return sanitizeAutomationMessage(test.message ?? test.trace);
}

function mergeFileAggregate(existing: FileAggregate | undefined, test: CtrfTest): FileAggregate {
  const mapped = mapCtrfStatus(test.status);
  const durationMs = (existing?.durationMs ?? 0) + Math.round(test.duration ?? 0);
  if (!existing) {
    return {
      passed: mapped === "passed",
      skipped: mapped === "skipped",
      durationMs,
      failureMessage: mapped === "failed" ? failureText(test) : undefined,
      testName: test.name,
      suite: test.suite
    };
  }
  const passed = existing.passed && mapped === "passed";
  const skipped = existing.skipped && mapped === "skipped";
  const failed = mapped === "failed";
  return {
    passed,
    skipped,
    durationMs,
    failureMessage: failed ? failureText(test) ?? existing.failureMessage : existing.failureMessage,
    testName: failed ? test.name : existing.testName ?? test.name,
    suite: existing.suite ?? test.suite
  };
}

function aggregateCtrfByFile(tests: CtrfTest[]): Map<string, FileAggregate> {
  const byFile = new Map<string, FileAggregate>();
  for (const test of tests) {
    const file = (test.filePath ?? "").replace(/\\/g, "/");
    if (!file) {
      continue;
    }
    for (const key of specLookupKeys(file)) {
      byFile.set(key, mergeFileAggregate(byFile.get(key), test));
    }
  }
  return byFile;
}

function outcomeStatusFromAggregate(aggregate: FileAggregate | undefined): AutomationSpecOutcome["status"] {
  if (!aggregate) {
    return "failed";
  }
  if (!aggregate.passed && aggregate.skipped) {
    return "skipped";
  }
  return aggregate.passed ? "passed" : "failed";
}

/** Map CTRF tests to per-target outcomes (framework-agnostic). */
export function outcomesFromCtrf(
  report: CtrfReport | null,
  targets: Array<{ testCaseId: string; externalId: string }>,
  runnerError?: string
): AutomationSpecOutcome[] {
  const byFile = aggregateCtrfByFile(report?.results.tests ?? []);
  const globalError = runnerError;

  return targets.map((tc) => {
    const normalized = normalizeSpecPath(tc.externalId);
    const keys = specLookupKeys(normalized);
    const aggregate = keys.map((k) => byFile.get(k)).find(Boolean);
    const status = outcomeStatusFromAggregate(aggregate);
    const passed = status === "passed";
    return {
      testCaseId: tc.testCaseId,
      externalId: normalized,
      status,
      durationMs: aggregate?.durationMs ?? 0,
      failureMessage: passed
        ? undefined
        : sanitizeAutomationMessage(aggregate?.failureMessage ?? globalError),
      testName: aggregate?.testName,
      suite: aggregate?.suite
    };
  });
}

export function summaryFromCtrf(report: CtrfReport | null, outcomes: AutomationSpecOutcome[]) {
  const ctrfSummary = report?.results.summary;
  const passed = outcomes.filter((o) => o.status === "passed").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;
  const durationMs =
    ctrfSummary?.stop != null && ctrfSummary?.start != null
      ? Math.max(0, ctrfSummary.stop - ctrfSummary.start)
      : outcomes.reduce((sum, o) => sum + o.durationMs, 0);
  return {
    total: outcomes.length,
    passed,
    failed,
    durationMs,
    specs: outcomes
  };
}
