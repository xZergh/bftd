import { and, eq, inArray } from "drizzle-orm";
import { AppError } from "../errors";
import {
  automatedManualLinks,
  projects,
  requirementTestCaseLinks,
  requirements,
  testCases
} from "../../db/schema";

type Db = ReturnType<typeof import("../../db/client").createDb>;

export type TraceabilityGraphNodeKind = "REQUIREMENT" | "MANUAL" | "AUTOMATED";

export async function getTraceabilityGraph(
  db: Db,
  input: { projectId: string }
): Promise<{
  projectId: string;
  nodes: Array<{ id: string; kind: TraceabilityGraphNodeKind; title: string }>;
  edges: Array<{ id: string; kind: "REQ_MANUAL" | "MANUAL_AUTO"; sourceId: string; targetId: string }>;
  coverageByRequirementStatus: Array<{
    status: string;
    requirementCount: number;
    withManualLinkCount: number;
  }>;
}> {
  const proj = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, input.projectId));
  if (proj.length === 0) {
    throw new AppError("ENTITY_NOT_FOUND", "Project not found.", "Use a valid projectId.", { projectId: input.projectId });
  }

  const reqRows = await db
    .select({
      id: requirements.id,
      title: requirements.title,
      status: requirements.status
    })
    .from(requirements)
    .where(eq(requirements.projectId, input.projectId));

  const caseRows = await db
    .select({
      id: testCases.id,
      title: testCases.title,
      type: testCases.type
    })
    .from(testCases)
    .where(and(eq(testCases.projectId, input.projectId), eq(testCases.isDeleted, false)));

  const reqManual = await db
    .select({
      id: requirementTestCaseLinks.id,
      requirementId: requirementTestCaseLinks.requirementId,
      manualTestCaseId: requirementTestCaseLinks.manualTestCaseId
    })
    .from(requirementTestCaseLinks)
    .innerJoin(requirements, eq(requirements.id, requirementTestCaseLinks.requirementId))
    .where(eq(requirements.projectId, input.projectId));

  const activeManualIds = new Set(caseRows.filter((c) => c.type === "manual").map((c) => c.id));
  const manualIds = [...activeManualIds];
  const reqManualActive = reqManual.filter((l) => activeManualIds.has(l.manualTestCaseId));
  const autoLinksFixed =
    manualIds.length === 0
      ? []
      : await db
          .select({
            id: automatedManualLinks.id,
            automatedTestCaseId: automatedManualLinks.automatedTestCaseId,
            manualTestCaseId: automatedManualLinks.manualTestCaseId
          })
          .from(automatedManualLinks)
          .where(inArray(automatedManualLinks.manualTestCaseId, manualIds));

  const nodes: Array<{ id: string; kind: TraceabilityGraphNodeKind; title: string }> = [];
  const nodeIds = new Set<string>();

  for (const r of reqRows) {
    const id = `req:${r.id}`;
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({ id, kind: "REQUIREMENT", title: r.title });
    }
  }
  for (const c of caseRows) {
    const id = c.type === "manual" ? `man:${c.id}` : `auto:${c.id}`;
    if (!nodeIds.has(id)) {
      nodeIds.add(id);
      nodes.push({
        id,
        kind: c.type === "manual" ? "MANUAL" : "AUTOMATED",
        title: c.title
      });
    }
  }

  const edges: Array<{ id: string; kind: "REQ_MANUAL" | "MANUAL_AUTO"; sourceId: string; targetId: string }> = [];
  for (const l of reqManualActive) {
    edges.push({
      id: `rm:${l.id}`,
      kind: "REQ_MANUAL",
      sourceId: `req:${l.requirementId}`,
      targetId: `man:${l.manualTestCaseId}`
    });
  }
  for (const l of autoLinksFixed) {
    edges.push({
      id: `ma:${l.id}`,
      kind: "MANUAL_AUTO",
      sourceId: `man:${l.manualTestCaseId}`,
      targetId: `auto:${l.automatedTestCaseId}`
    });
  }

  const reqWithManual = new Set(reqManualActive.map((x) => x.requirementId));
  const statusBuckets = new Map<string, { total: number; withManual: number }>();
  for (const r of reqRows) {
    const st = r.status?.trim() || "unknown";
    const b = statusBuckets.get(st) ?? { total: 0, withManual: 0 };
    b.total += 1;
    if (reqWithManual.has(r.id)) {
      b.withManual += 1;
    }
    statusBuckets.set(st, b);
  }

  const coverageByRequirementStatus = [...statusBuckets.entries()]
    .map(([status, v]) => ({
      status,
      requirementCount: v.total,
      withManualLinkCount: v.withManual
    }))
    .sort((a, b) => a.status.localeCompare(b.status));

  return {
    projectId: input.projectId,
    nodes,
    edges,
    coverageByRequirementStatus
  };
}
