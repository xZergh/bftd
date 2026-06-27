/**
 * Runs automated tests for a test run via a pluggable framework adapter (MVP: Playwright),
 * submits per-case results (with manual rollup), and attaches a run-level report.
 *
 * Usage:
 *   npx tsx scripts/run-plan-automation.ts --run-id <uuid> [--db-path <path>]
 *     [--framework playwright] [--automated-ids id1,id2]
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { eq, inArray } from "drizzle-orm";
import { defaultReportDir } from "../src/domain/automation/spawn-runner";
import { getAutomationAdapter } from "../src/domain/automation/registry";
import { attachAutomationReport } from "../src/domain/services/run-automation";
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { TcmsService } from "../src/domain/service";
import { runTestCaseAssignments, testCases } from "../src/db/schema";

function parseArgs(argv: string[]) {
  let runId = "";
  let dbPath = process.env.DB_PATH ?? join(process.cwd(), "data", "tcms.sqlite");
  let framework = "playwright";
  let automatedIds: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--run-id") {
      runId = argv[i + 1] ?? "";
      i += 1;
    } else if (argv[i] === "--db-path") {
      dbPath = argv[i + 1] ?? dbPath;
      i += 1;
    } else if (argv[i] === "--framework") {
      framework = argv[i + 1] ?? framework;
      i += 1;
    } else if (argv[i] === "--automated-ids") {
      const raw = argv[i + 1] ?? "";
      automatedIds = raw.split(",").map((s) => s.trim()).filter(Boolean);
      i += 1;
    }
  }
  if (!runId) {
    throw new Error("Missing --run-id");
  }
  return { runId, dbPath, framework, automatedIds };
}

async function main() {
  const { runId, dbPath, framework, automatedIds } = parseArgs(process.argv.slice(2));
  if (!existsSync(dbPath)) {
    throw new Error(`Database not found: ${dbPath}`);
  }
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);

  let automated: Array<{ id: string; externalId: string | null }> = [];

  if (automatedIds.length > 0) {
    const rows = await db
      .select({ id: testCases.id, externalId: testCases.externalId, type: testCases.type })
      .from(testCases)
      .where(inArray(testCases.id, automatedIds));
    automated = rows.filter((tc) => tc.type === "automated" && tc.externalId);
  } else {
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
    automated = caseRows.filter((tc) => tc.type === "automated" && tc.externalId);
  }

  const targets = automated
    .filter((tc): tc is { id: string; externalId: string } => typeof tc.externalId === "string" && tc.externalId.length > 0)
    .map((tc) => ({ testCaseId: tc.id, externalId: tc.externalId }));

  if (targets.length === 0) {
    console.log(JSON.stringify({ ok: true, runId, message: "No automated specs to run." }));
    return;
  }

  const adapter = getAutomationAdapter(framework);
  const result = await adapter.execute({
    repoRoot: process.cwd(),
    runId,
    targets,
    reportDir: defaultReportDir()
  });

  for (const outcome of result.outcomes) {
    await service.submitTestResult({
      runId,
      testCaseId: outcome.testCaseId,
      status: outcome.status,
      durationMs: outcome.durationMs,
      attachments: [{ kind: `${adapter.id}_spec`, ref: outcome.externalId }]
    });
  }

  await attachAutomationReport(db, runId, result.report);

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        framework: adapter.id,
        automated: targets.length,
        passed: result.report.summary.passed,
        failed: result.report.summary.failed,
        reportRef: result.report.attachment.ref
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
