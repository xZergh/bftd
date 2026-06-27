import { and, asc, eq, inArray } from "drizzle-orm";
import { testCases, testPlanPlanLinks, testPlanTestCaseLinks, testPlans } from "../../db/schema";
import { AppError } from "../errors";

type Db = ReturnType<typeof import("../../db/client").createDb>;

export type FlattenedPlanMember = {
  testCaseId: string;
  sourceTestPlanId: string;
};

export type TestPlanMemberStats = {
  directTestCaseCount: number;
  childPlanCount: number;
  flattenedTestCaseCount: number;
  flattenedManualCount: number;
  flattenedAutomatedCount: number;
};

async function getPlanRow(db: Db, planId: string) {
  const rows = await db.select().from(testPlans).where(eq(testPlans.id, planId));
  return rows[0] ?? null;
}

async function collectDescendantPlanIds(db: Db, rootPlanId: string): Promise<Set<string>> {
  const out = new Set<string>();
  const queue = [rootPlanId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (out.has(current)) {
      continue;
    }
    out.add(current);
    const children = await db
      .select({ childId: testPlanPlanLinks.childTestPlanId })
      .from(testPlanPlanLinks)
      .where(eq(testPlanPlanLinks.parentTestPlanId, current));
    for (const child of children) {
      if (!out.has(child.childId)) {
        queue.push(child.childId);
      }
    }
  }
  return out;
}

/** Returns true if adding child under parent would create a cycle. */
export async function wouldCreatePlanCycle(db: Db, parentPlanId: string, childPlanId: string): Promise<boolean> {
  if (parentPlanId === childPlanId) {
    return true;
  }
  const descendantsOfChild = await collectDescendantPlanIds(db, childPlanId);
  return descendantsOfChild.has(parentPlanId);
}

export async function flattenTestPlanMembers(db: Db, planId: string): Promise<FlattenedPlanMember[]> {
  const root = await getPlanRow(db, planId);
  if (!root) {
    throw new AppError("ENTITY_NOT_FOUND", "Test plan not found.", "Use a valid testPlanId.", { testPlanId: planId });
  }

  const out = new Map<string, string>();

  async function walk(currentPlanId: string, visiting: Set<string>) {
    if (visiting.has(currentPlanId)) {
      throw new AppError(
        "PLAN_CYCLE",
        "Test plan nesting contains a cycle.",
        "Remove circular sub-plan links before executing this plan.",
        { testPlanId: currentPlanId }
      );
    }
    visiting.add(currentPlanId);

    const directLinks = await db
      .select({ testCaseId: testPlanTestCaseLinks.testCaseId })
      .from(testPlanTestCaseLinks)
      .where(eq(testPlanTestCaseLinks.testPlanId, currentPlanId));
    for (const link of directLinks) {
      if (!out.has(link.testCaseId)) {
        out.set(link.testCaseId, currentPlanId);
      }
    }

    const childLinks = await db
      .select({ childPlanId: testPlanPlanLinks.childTestPlanId })
      .from(testPlanPlanLinks)
      .where(eq(testPlanPlanLinks.parentTestPlanId, currentPlanId))
      .orderBy(asc(testPlanPlanLinks.sortOrder), asc(testPlanPlanLinks.childTestPlanId));

    for (const child of childLinks) {
      await walk(child.childPlanId, new Set(visiting));
    }
  }

  await walk(planId, new Set());
  return [...out.entries()].map(([testCaseId, sourceTestPlanId]) => ({ testCaseId, sourceTestPlanId }));
}

export async function computeTestPlanMemberStats(db: Db, planId: string): Promise<TestPlanMemberStats> {
  const directCases = await db
    .select({ id: testPlanTestCaseLinks.id })
    .from(testPlanTestCaseLinks)
    .where(eq(testPlanTestCaseLinks.testPlanId, planId));
  const childPlans = await db
    .select({ id: testPlanPlanLinks.id })
    .from(testPlanPlanLinks)
    .where(eq(testPlanPlanLinks.parentTestPlanId, planId));

  const flattened = await flattenTestPlanMembers(db, planId);
  if (flattened.length === 0) {
    return {
      directTestCaseCount: directCases.length,
      childPlanCount: childPlans.length,
      flattenedTestCaseCount: 0,
      flattenedManualCount: 0,
      flattenedAutomatedCount: 0
    };
  }

  const caseRows = await db
    .select({ id: testCases.id, type: testCases.type })
    .from(testCases)
    .where(
      inArray(
        testCases.id,
        flattened.map((f) => f.testCaseId)
      )
    );

  let manual = 0;
  let automated = 0;
  for (const row of caseRows) {
    if (row.type === "automated") {
      automated += 1;
    } else {
      manual += 1;
    }
  }

  return {
    directTestCaseCount: directCases.length,
    childPlanCount: childPlans.length,
    flattenedTestCaseCount: flattened.length,
    flattenedManualCount: manual,
    flattenedAutomatedCount: automated
  };
}

export async function listChildTestPlans(db: Db, parentPlanId: string) {
  const rows = await db
    .select({
      linkId: testPlanPlanLinks.id,
      sortOrder: testPlanPlanLinks.sortOrder,
      plan: testPlans
    })
    .from(testPlanPlanLinks)
    .innerJoin(testPlans, eq(testPlanPlanLinks.childTestPlanId, testPlans.id))
    .where(eq(testPlanPlanLinks.parentTestPlanId, parentPlanId))
    .orderBy(asc(testPlanPlanLinks.sortOrder), asc(testPlans.name));

  return rows.map((r) => ({
    linkId: r.linkId,
    sortOrder: r.sortOrder,
    id: r.plan.id,
    name: r.plan.name,
    description: r.plan.description,
    releaseLabel: r.plan.releaseLabel,
    sprintLabel: r.plan.sprintLabel
  }));
}
