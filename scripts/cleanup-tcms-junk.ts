/**
 * Remove local junk from tcms.sqlite (empty E2E ghost projects, throwaway runs).
 *
 * Usage:
 *   npx tsx scripts/cleanup-tcms-junk.ts [--db-path data/tcms.sqlite] [--dry-run]
 */
import { eq, inArray, not } from "drizzle-orm";
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { deleteProjectCascade } from "../src/domain/services/project-purge";
import {
  kpiRunSnapshots,
  projects,
  runTestCaseAssignments,
  runTraceabilityEdges,
  runTraceabilitySnapshots,
  testResults,
  testRuns
} from "../src/db/schema";

const TCMS_PROJECT_ID = "637d3ba8-f3ed-4651-a10a-51a5d4b24d3c";

const GHOST_NAME_PREFIXES = ["Picker A ", "Picker B ", "Archive test ", "R1 create "];

function parseArgs(argv: string[]) {
  let dbPath = process.env.DB_PATH ?? "data/tcms.sqlite";
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--db-path") {
      dbPath = argv[i + 1] ?? dbPath;
      i += 1;
    } else if (argv[i] === "--dry-run") {
      dryRun = true;
    }
  }
  return { dbPath, dryRun };
}

async function deleteRunsCascade(db: ReturnType<typeof createDb>, runIds: string[]) {
  if (runIds.length === 0) {
    return;
  }
  const snapshotRows = await db
    .select({ id: runTraceabilitySnapshots.id })
    .from(runTraceabilitySnapshots)
    .where(inArray(runTraceabilitySnapshots.runId, runIds));
  const snapshotIds = snapshotRows.map((s) => s.id);
  if (snapshotIds.length > 0) {
    await db.delete(runTraceabilityEdges).where(inArray(runTraceabilityEdges.runSnapshotId, snapshotIds));
    await db.delete(runTraceabilitySnapshots).where(inArray(runTraceabilitySnapshots.id, snapshotIds));
  }
  await db.delete(testResults).where(inArray(testResults.runId, runIds));
  await db.delete(runTestCaseAssignments).where(inArray(runTestCaseAssignments.runId, runIds));
  await db.delete(kpiRunSnapshots).where(inArray(kpiRunSnapshots.runId, runIds));
  await db.delete(testRuns).where(inArray(testRuns.id, runIds));
}

async function main() {
  const { dbPath, dryRun } = parseArgs(process.argv.slice(2));
  initSqlite(dbPath);
  const db = createDb(dbPath);

  const allProjects = await db.select({ id: projects.id, name: projects.name }).from(projects);
  const ghostProjects = allProjects.filter(
    (p) => p.id !== TCMS_PROJECT_ID && GHOST_NAME_PREFIXES.some((prefix) => p.name.startsWith(prefix))
  );

  const tcmsRuns = await db
    .select({ id: testRuns.id, name: testRuns.name })
    .from(testRuns)
    .where(eq(testRuns.projectId, TCMS_PROJECT_ID));

  console.log(`Database: ${dbPath}`);
  console.log(`Dry run: ${dryRun}`);
  console.log(`Ghost projects to delete (${ghostProjects.length}):`);
  for (const p of ghostProjects) {
    console.log(`  - ${p.name} (${p.id})`);
  }
  console.log(`TCMS runs to delete (${tcmsRuns.length}):`);
  for (const r of tcmsRuns) {
    console.log(`  - ${r.name} (${r.id})`);
  }

  if (dryRun) {
    console.log("\nNo changes made (dry run).");
    return;
  }

  for (const p of ghostProjects) {
    await deleteProjectCascade(db, p.id);
    console.log(`Deleted project: ${p.name}`);
  }

  await deleteRunsCascade(
    db,
    tcmsRuns.map((r) => r.id)
  );
  console.log(`Deleted ${tcmsRuns.length} runs from TCMS project.`);

  const remaining = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(not(eq(projects.id, TCMS_PROJECT_ID)));
  console.log(`\nRemaining non-TCMS projects: ${remaining.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
