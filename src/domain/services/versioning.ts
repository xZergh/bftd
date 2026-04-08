import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { AppError } from "../errors";
import {
  automatedManualLinks,
  requirementTestCaseLinks,
  testCases,
  testCaseSteps,
  testCaseVersionSteps,
  testCaseVersions
} from "../../db/schema";

type Db = ReturnType<typeof import("../../db/client").createDb>;

/** Drizzle better-sqlite3 DB or transaction callback argument (sync API). */
export type SqliteWriteScope = Db;

function now() {
  return new Date();
}

export type TestCaseLinksSnapshot = {
  requirementIds: string[];
  manualTestCaseIds: string[];
};

function loadLinksSnapshotSync(scope: SqliteWriteScope, testCaseId: string, type: "manual" | "automated"): TestCaseLinksSnapshot {
  if (type === "manual") {
    const rows = scope
      .select({ requirementId: requirementTestCaseLinks.requirementId })
      .from(requirementTestCaseLinks)
      .where(eq(requirementTestCaseLinks.manualTestCaseId, testCaseId))
      .all();
    return { requirementIds: rows.map((r) => r.requirementId), manualTestCaseIds: [] };
  }
  const rows = scope
    .select({ manualTestCaseId: automatedManualLinks.manualTestCaseId })
    .from(automatedManualLinks)
    .where(eq(automatedManualLinks.automatedTestCaseId, testCaseId))
    .all();
  return { requirementIds: [], manualTestCaseIds: rows.map((r) => r.manualTestCaseId) };
}

/**
 * Append an immutable testcase version row using Drizzle's synchronous SQLite API.
 * Safe to call inside `db.transaction((tx) => { ... })` (non-async callback).
 */
export function appendTestCaseVersionSync(scope: SqliteWriteScope, testCaseId: string): void {
  const rows = scope.select().from(testCases).where(eq(testCases.id, testCaseId)).all();
  if (rows.length === 0) return;
  const tc = rows[0];
  const existing = scope
    .select({ versionSeq: testCaseVersions.versionSeq })
    .from(testCaseVersions)
    .where(eq(testCaseVersions.testCaseId, testCaseId))
    .all();
  const nextSeq = existing.length === 0 ? 1 : Math.max(...existing.map((v) => v.versionSeq)) + 1;
  const links = loadLinksSnapshotSync(scope, testCaseId, tc.type);
  const versionId = randomUUID();
  scope
    .insert(testCaseVersions)
    .values({
      id: versionId,
      testCaseId,
      versionSeq: nextSeq,
      createdAt: now(),
      title: tc.title,
      type: tc.type,
      externalId: tc.externalId,
      releaseLabel: tc.releaseLabel,
      sprintLabel: tc.sprintLabel,
      isTombstone: tc.isDeleted,
      linksJson: JSON.stringify(links)
    })
    .run();

  const steps = scope
    .select()
    .from(testCaseSteps)
    .where(eq(testCaseSteps.testCaseId, testCaseId))
    .orderBy(asc(testCaseSteps.stepOrder))
    .all();
  if (steps.length > 0) {
    scope
      .insert(testCaseVersionSteps)
      .values(
        steps.map((s) => ({
          id: randomUUID(),
          versionId,
          stepOrder: s.stepOrder,
          name: s.name,
          expectedResult: s.expectedResult,
          parentStepId: s.parentStepId,
          sourceStepId: s.sourceStepId,
          metaJson: s.metaJson
        }))
      )
      .run();
  }
}

export async function appendTestCaseVersion(db: Db, testCaseId: string) {
  appendTestCaseVersionSync(db, testCaseId);
}

export async function listTestCaseVersionHistory(
  db: Db,
  input: { testCaseId: string; includeDeleted?: boolean }
) {
  const tc = await db.select().from(testCases).where(eq(testCases.id, input.testCaseId));
  if (tc.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Test case not found.", "Use a valid testcase id.", { testCaseId: input.testCaseId });
  }
  if (tc[0].isDeleted && !input.includeDeleted) {
    throw new AppError(
      "ENTITY_NOT_FOUND",
      "Test case is deleted.",
      "Pass includeDeleted to read version history for deleted test cases.",
      { testCaseId: input.testCaseId }
    );
  }
  const versions = await db
    .select()
    .from(testCaseVersions)
    .where(eq(testCaseVersions.testCaseId, input.testCaseId))
    .orderBy(asc(testCaseVersions.versionSeq));
  const out = [];
  for (const v of versions) {
    const steps = await db
      .select()
      .from(testCaseVersionSteps)
      .where(eq(testCaseVersionSteps.versionId, v.id))
      .orderBy(asc(testCaseVersionSteps.stepOrder));
    out.push({
      ...v,
      links: JSON.parse(v.linksJson) as TestCaseLinksSnapshot,
      steps
    });
  }
  return out;
}

export async function tombstoneTestCase(db: Db, input: { testCaseId: string }) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, input.testCaseId));
  if (rows.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Test case not found.", "Use a valid testcase id.", { testCaseId: input.testCaseId });
  }
  await db
    .update(testCases)
    .set({ isDeleted: true, deletedAt: now(), updatedAt: now() })
    .where(eq(testCases.id, input.testCaseId));
  await appendTestCaseVersion(db, input.testCaseId);
  return { success: true as const };
}

export async function restoreTestCase(db: Db, input: { testCaseId: string }) {
  const rows = await db.select().from(testCases).where(eq(testCases.id, input.testCaseId));
  if (rows.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Test case not found.", "Use a valid testcase id.", { testCaseId: input.testCaseId });
  }
  await db
    .update(testCases)
    .set({ isDeleted: false, deletedAt: null, updatedAt: now() })
    .where(eq(testCases.id, input.testCaseId));
  await appendTestCaseVersion(db, input.testCaseId);
  return { success: true as const };
}
