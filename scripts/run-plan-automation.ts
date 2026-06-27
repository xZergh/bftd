/**
 * Runs Playwright specs for automated test cases assigned to a plan run,
 * then submits results (with manual rollup) to TCMS.
 *
 * Usage: npx tsx scripts/run-plan-automation.ts --run-id <uuid> [--db-path <path>]
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { TcmsService } from "../src/domain/service";
import { runTestCaseAssignments, testCases, testRuns } from "../src/db/schema";

function parseArgs(argv: string[]) {
  let runId = "";
  let dbPath = process.env.DB_PATH ?? join(process.cwd(), "data", "tcms.sqlite");
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-id") {
      runId = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--db-path") {
      dbPath = argv[i + 1] ?? dbPath;
      i += 1;
    }
  }
  if (!runId) {
    throw new Error("Missing --run-id");
  }
  return { runId, dbPath };
}

async function main() {
  const { runId, dbPath } = parseArgs(process.argv.slice(2));
  if (!existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`);
  }
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);

  const runRows = await db.select().from(testRuns).where(eq(testRuns.id, runId));
  if (runRows.length === 0) {
    throw new Error(`Run not found: ${runId}`);
  }

  const assignments = await db
    .select({ testCaseId: runTestCaseAssignments.testCaseId })
    .from(runTestCaseAssignments)
    .where(eq(runTestCaseAssignments.runId, runId));

  const caseRows = await db
    .select({ id: testCases.id, type: testCases.type, externalId: testCases.externalId })
    .from(testCases)
    .where(
      inArray(
        testCases.id,
        assignments.map((a) => a.testCaseId)
      )
    );

  const automated = caseRows.filter((tc) => tc.type === "automated");
  const specPaths = [
    ...new Set(
      automated
        .map((tc) => tc.externalId)
        .filter((id): id is string => typeof id === "string" && id.length > 0)
    )
  ];

  if (specPaths.length === 0) {
    console.log(JSON.stringify({ ok: true, runId, message: "No automated specs to run." }));
    return;
  }

  const webDir = join(process.cwd(), "apps", "web");
  const specArgs = specPaths.map((p) => (p.startsWith("e2e/") ? p : `e2e/${p}`));

  const exitCode = await new Promise<number>((resolve, reject) => {
    const npx = process.platform === "win32" ? "npx.cmd" : "npx";
    const child = spawn(npx, ["playwright", "test", ...specArgs, "--reporter=json"], {
      cwd: webDir,
      env: { ...process.env },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      process.stderr.write(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      void (async () => {
        try {
          await ingestPlaywrightJson(service, runId, automated, stdout);
        } catch (err) {
          console.error(err);
        }
        resolve(code ?? 1);
      })();
    });
  });

  process.exitCode = exitCode === 0 ? 0 : 1;
}

type AutomatedRow = { id: string; externalId: string | null };

async function ingestPlaywrightJson(service: TcmsService, runId: string, automated: AutomatedRow[], stdout: string) {
  const jsonStart = stdout.indexOf("{");
  if (jsonStart < 0) {
    console.warn("No Playwright JSON report in stdout; submitting failed for all automated cases.");
    for (const tc of automated) {
      await service.submitTestResult({
        runId,
        testCaseId: tc.id,
        status: "failed",
        durationMs: 0,
        attachments: [{ kind: "runner", ref: "missing-json-report" }]
      });
    }
    return;
  }

  const report = JSON.parse(stdout.slice(jsonStart)) as {
    suites?: Array<{
      file?: string;
      specs?: Array<{ ok?: boolean; tests?: Array<{ results?: Array<{ duration?: number; status?: string }> }> }>;
    }>;
  };

  const byFile = new Map<string, { ok: boolean; durationMs: number }>();

  for (const suite of report.suites ?? []) {
    const file = suite.file?.replace(/\\/g, "/") ?? "";
    const rel = file.includes("e2e/") ? file.slice(file.indexOf("e2e/")) : file;
    let ok = true;
    let durationMs = 0;
    for (const spec of suite.specs ?? []) {
      if (spec.ok === false) {
        ok = false;
      }
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          durationMs += result.duration ?? 0;
          if (result.status && result.status !== "passed") {
            ok = false;
          }
        }
      }
    }
    if (rel) {
      byFile.set(rel, { ok, durationMs: Math.round(durationMs) });
    }
  }

  for (const tc of automated) {
    const key = tc.externalId ?? "";
    const normalized = key.startsWith("e2e/") ? key : `e2e/${key}`;
    const outcome = byFile.get(normalized) ?? byFile.get(key);
    const status = outcome?.ok === true ? "passed" : "failed";
    await service.submitTestResult({
      runId,
      testCaseId: tc.id,
      status,
      durationMs: outcome?.durationMs ?? 0,
      attachments: [{ kind: "playwright_spec", ref: normalized }]
    });
  }

  console.log(JSON.stringify({ ok: true, runId, automated: automated.length, files: [...byFile.keys()] }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
