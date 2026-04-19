/** Shapes aligned with `contracts/graphql-schema.snapshot.graphql` (MVP). */

export type ProjectListItem = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isArchived: boolean;
};

export type RequirementListItem = {
  id: string;
  externalKey: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type TestCaseListItem = {
  id: string;
  type: string;
  title: string;
  externalId: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TestRunListItem = {
  id: string;
  projectId: string;
  name: string;
  releaseLabel: string | null;
  sprintLabel: string | null;
  environment: string | null;
  buildVersion: string | null;
  trigger: string | null;
  createdAt: string;
  finishedAt: string | null;
};

export type KpiCoverageFormulaInfo = {
  formulaId: string;
  label: string;
  description: string;
  numeratorLabel: string;
  denominatorLabel: string;
  expression: string;
  scope: string;
};

export type KpiCoverageMetricValue = {
  formulaId: string;
  valuePct: number;
  numerator: number;
  denominator: number;
};

export type KpiCurrentSnapshot = {
  totalRequirements: number;
  totalManualCases: number;
  totalTestRuns: number;
  requirementsWithManualLinks: number;
  requirementsWithAutomatedLinksViaManual: number;
  automatedCasesReachableFromRequirements: number;
  orphanManualCases: number;
  orphanAutomatedCases: number;
  coverage: KpiCoverageMetricValue[];
};

export type KpiDashboardPayload = {
  projectId: string;
  generatedAt: string;
  coverageFormulaInfo: KpiCoverageFormulaInfo[];
  current: KpiCurrentSnapshot;
};

export type TraceabilityCoverageByStatusRow = {
  status: string;
  requirementCount: number;
  withManualLinkCount: number;
};

export type TraceabilityGraphPayload = {
  projectId: string;
  nodes: Array<{ id: string; kind: string; title: string }>;
  edges: Array<{ id: string; kind: string; sourceId: string; targetId: string }>;
  coverageByRequirementStatus: TraceabilityCoverageByStatusRow[];
};

export type RunTraceabilityEdge = {
  requirementId: string;
  manualTestCaseId: string;
  automatedTestCaseId: string | null;
};

export type RunTraceabilityReportPayload = {
  runId: string;
  projectId: string;
  capturedAt: string;
  edges: RunTraceabilityEdge[];
};
