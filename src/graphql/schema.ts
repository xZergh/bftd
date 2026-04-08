import { createSchema } from "graphql-yoga";
import { z } from "zod";
import { AppError } from "../domain/errors";
import { TcmsService } from "../domain/service";

type Context = { service: TcmsService };

const projectInput = z.object({ name: z.string().min(1) });
const requirementInput = z.object({
  projectId: z.string().min(1),
  externalKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional()
});
const manualInput = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  requirementIds: z.array(z.string().min(1))
});
const automatedInput = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  manualTestCaseIds: z.array(z.string().min(1))
});
const runInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1)
});
const resultInput = z.object({
  runId: z.string().min(1),
  testCaseId: z.string().min(1),
  status: z.enum(["passed", "failed", "skipped", "blocked"]),
  durationMs: z.number().int().nonnegative().optional()
});
const requirementsImportInput = z.object({
  projectId: z.string().min(1),
  requirements: z.array(
    z.object({
      externalKey: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional()
    })
  )
});
const trrImportInput = z.object({
  projectId: z.string().min(1),
  automatedTests: z.array(
    z.object({
      internalTestCaseId: z.string().optional(),
      externalId: z.string().optional(),
      title: z.string().optional(),
      linkedManualCaseIds: z.array(z.string()).optional(),
      steps: z
        .array(
          z.object({
            order: z.number().int(),
            name: z.string(),
            expectedResult: z.string().optional(),
            sourceStepId: z.string().optional()
          })
        )
        .optional()
    })
  )
});
const kpiDashboardInput = z.object({
  projectId: z.string().min(1)
});
const recalcKpiInput = z.object({
  projectId: z.string().min(1),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
});
const requirementDesignLinkInput = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().optional(),
  requirementKey: z.string().optional(),
  provider: z.string().min(1),
  designProjectId: z.string().optional(),
  designFileId: z.string().optional(),
  designPageId: z.string().optional(),
  designNodeId: z.string().optional(),
  shareUrl: z.string().min(1),
  title: z.string().optional(),
  lastSyncedAt: z.string().optional()
});
const unlinkRequirementDesignLinkInput = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  provider: z.string().min(1),
  shareUrl: z.string().min(1)
});
const requirementDesignLinksQueryInput = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().optional()
});
const importRequirementDesignLinksInput = z.object({
  projectId: z.string().min(1),
  provider: z.string().min(1),
  links: z.array(
    z.object({
      requirementId: z.string().optional(),
      requirementKey: z.string().optional(),
      designProjectId: z.string().optional(),
      designFileId: z.string().optional(),
      designPageId: z.string().optional(),
      designNodeId: z.string().optional(),
      shareUrl: z.string().optional(),
      title: z.string().optional(),
      lastSyncedAt: z.string().optional()
    })
  )
});

function formatError(error: unknown) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      fixHint: error.fixHint,
      context: error.context ?? null
    };
  }
  return {
    code: "VALIDATION_ERROR",
    message: "Unhandled server error",
    fixHint: "Check request payload and try again.",
    context: null
  };
}

export function buildSchema() {
  return createSchema<Context>({
    typeDefs: /* GraphQL */ `
      type AppError {
        code: String!
        message: String!
        fixHint: String!
        context: String
      }

      type Project {
        id: ID!
        name: String!
      }

      type Requirement {
        id: ID!
        projectId: ID!
        externalKey: String!
        title: String!
      }

      type TestCase {
        id: ID!
        projectId: ID!
        type: String!
        title: String!
      }

      type TestRun {
        id: ID!
        projectId: ID!
        name: String!
      }

      type TestResult {
        id: ID!
        runId: ID!
        testCaseId: ID!
        status: String!
        durationMs: Int!
      }

      type TraceabilityEdge {
        requirementId: ID!
        manualTestCaseId: ID!
        automatedTestCaseId: ID
      }

      type RunTraceabilityReport {
        runId: ID!
        projectId: ID!
        capturedAt: String!
        edges: [TraceabilityEdge!]!
      }

      type ProjectSummary {
        totalRequirements: Int!
        totalManualCases: Int!
        totalAutomatedCases: Int!
      }

      type ImportErrorItem {
        index: Int!
        code: String!
        message: String!
        fixHint: String!
      }

      type ImportWarningItem {
        index: Int!
        message: String!
      }

      type ImportRequirementsResult {
        createdCount: Int!
        updatedCount: Int!
        skippedCount: Int!
        errors: [ImportErrorItem!]!
        warnings: [ImportWarningItem!]!
      }

      type ImportAutomatedFromTrrResult {
        createdCount: Int!
        updatedCount: Int!
        skippedCount: Int!
        errors: [ImportErrorItem!]!
      }

      type CoverageFormulaInfo {
        formulaId: String!
        label: String!
        description: String!
        numeratorLabel: String!
        denominatorLabel: String!
        expression: String!
        scope: String!
      }

      type CoverageMetricValue {
        formulaId: String!
        valuePct: Float!
        numerator: Int!
        denominator: Int!
      }

      type KpiCurrent {
        totalRequirements: Int!
        totalManualCases: Int!
        totalTestRuns: Int!
        requirementsWithManualLinks: Int!
        requirementsWithAutomatedLinksViaManual: Int!
        automatedCasesReachableFromRequirements: Int!
        orphanManualCases: Int!
        orphanAutomatedCases: Int!
        coverage: [CoverageMetricValue!]!
      }

      type KpiRunPoint {
        runId: ID!
        runStartedAt: String!
        totalTests: Int!
        passed: Int!
        failed: Int!
        skipped: Int!
        blocked: Int!
        passRatePct: Float!
      }

      type KpiDailyPoint {
        date: String!
        coverage: [CoverageMetricValue!]!
        totalTestRuns: Int!
      }

      type KpiDashboard {
        projectId: ID!
        generatedAt: String!
        coverageFormulaInfo: [CoverageFormulaInfo!]!
        current: KpiCurrent!
        perRun: [KpiRunPoint!]!
        dailyTrend: [KpiDailyPoint!]!
      }

      type RecalculateKpiResult {
        projectId: ID!
        fromDate: String
        toDate: String
        projectSnapshotsUpdated: Int!
        runSnapshotsUpdated: Int!
        dailySnapshotsUpdated: Int!
        completedAt: String!
      }

      type RequirementDesignLink {
        id: ID!
        projectId: ID!
        requirementId: ID!
        provider: String!
        designProjectId: String
        designFileId: String
        designPageId: String
        designNodeId: String
        shareUrl: String!
        title: String
        lastSyncedAt: String
      }

      type RequirementDesignLinkPayload {
        link: RequirementDesignLink
        error: AppError
      }

      type UnlinkResult {
        success: Boolean!
      }

      type ImportRequirementDesignLinksResult {
        createdCount: Int!
        updatedCount: Int!
        skippedCount: Int!
        errors: [ImportErrorItem!]!
      }

      input CreateProjectInput {
        name: String!
      }

      input CreateRequirementInput {
        projectId: ID!
        externalKey: String!
        title: String!
        description: String
      }

      input CreateManualTestCaseInput {
        projectId: ID!
        title: String!
        requirementIds: [ID!]!
      }

      input CreateAutomatedTestCaseInput {
        projectId: ID!
        title: String!
        manualTestCaseIds: [ID!]!
      }

      input CreateTestRunInput {
        projectId: ID!
        name: String!
      }

      input SubmitTestResultInput {
        runId: ID!
        testCaseId: ID!
        status: String!
        durationMs: Int
      }

      input RequirementImportItemInput {
        externalKey: String
        title: String
        description: String
      }

      input ImportRequirementsInput {
        projectId: ID!
        requirements: [RequirementImportItemInput!]!
      }

      input TrrStepInput {
        order: Int!
        name: String!
        expectedResult: String
        sourceStepId: String
      }

      input TrrAutomatedTestInput {
        internalTestCaseId: ID
        externalId: String
        title: String
        linkedManualCaseIds: [ID!]
        steps: [TrrStepInput!]
      }

      input ImportAutomatedFromTrrInput {
        projectId: ID!
        automatedTests: [TrrAutomatedTestInput!]!
      }

      input KpiDashboardInput {
        projectId: ID!
      }

      input RecalculateKpiInput {
        projectId: ID!
        fromDate: String
        toDate: String
      }

      input RequirementDesignLinkInput {
        projectId: ID!
        requirementId: ID
        requirementKey: String
        provider: String!
        designProjectId: String
        designFileId: String
        designPageId: String
        designNodeId: String
        shareUrl: String!
        title: String
        lastSyncedAt: String
      }

      input UnlinkRequirementDesignLinkInput {
        projectId: ID!
        requirementId: ID!
        provider: String!
        shareUrl: String!
      }

      input RequirementDesignLinksQueryInput {
        projectId: ID!
        requirementId: ID
      }

      input ImportRequirementDesignLinkItemInput {
        requirementId: ID
        requirementKey: String
        designProjectId: String
        designFileId: String
        designPageId: String
        designNodeId: String
        shareUrl: String
        title: String
        lastSyncedAt: String
      }

      input ImportRequirementDesignLinksInput {
        projectId: ID!
        provider: String!
        links: [ImportRequirementDesignLinkItemInput!]!
      }

      type CreateProjectPayload {
        project: Project
        error: AppError
      }

      type CreateRequirementPayload {
        requirement: Requirement
        error: AppError
      }

      type CreateTestCasePayload {
        testCase: TestCase
        error: AppError
      }

      type CreateTestRunPayload {
        run: TestRun
        error: AppError
      }

      type SubmitTestResultPayload {
        result: TestResult
        error: AppError
      }

      type Query {
        projectSummary(projectId: ID!): ProjectSummary!
        runTraceabilityReport(runId: ID!): RunTraceabilityReport!
        kpiDashboard(input: KpiDashboardInput!): KpiDashboard!
        requirementDesignLinks(input: RequirementDesignLinksQueryInput!): [RequirementDesignLink!]!
      }

      type Mutation {
        createProject(input: CreateProjectInput!): CreateProjectPayload!
        createRequirement(input: CreateRequirementInput!): CreateRequirementPayload!
        createManualTestCase(input: CreateManualTestCaseInput!): CreateTestCasePayload!
        createAutomatedTestCase(input: CreateAutomatedTestCaseInput!): CreateTestCasePayload!
        createTestRun(input: CreateTestRunInput!): CreateTestRunPayload!
        submitTestResult(input: SubmitTestResultInput!): SubmitTestResultPayload!
        importRequirements(input: ImportRequirementsInput!): ImportRequirementsResult!
        importAutomatedFromTrr(input: ImportAutomatedFromTrrInput!): ImportAutomatedFromTrrResult!
        recalculateKpiSnapshots(input: RecalculateKpiInput!): RecalculateKpiResult!
        upsertRequirementDesignLink(input: RequirementDesignLinkInput!): RequirementDesignLinkPayload!
        unlinkRequirementDesignLink(input: UnlinkRequirementDesignLinkInput!): UnlinkResult!
        importRequirementDesignLinks(input: ImportRequirementDesignLinksInput!): ImportRequirementDesignLinksResult!
      }
    `,
    resolvers: {
      Query: {
        projectSummary: async (_root, args, ctx) => ctx.service.getProjectSummary(args.projectId),
        runTraceabilityReport: async (_root, args, ctx) =>
          ctx.service.getRunTraceabilityReport(args.runId),
        kpiDashboard: async (_root, args, ctx) => {
          const input = kpiDashboardInput.parse(args.input);
          return ctx.service.getKpiDashboard(input);
        },
        requirementDesignLinks: async (_root, args, ctx) => {
          const input = requirementDesignLinksQueryInput.parse(args.input);
          return ctx.service.getRequirementDesignLinks(input);
        }
      },
      Mutation: {
        createProject: async (_root, args, ctx) => {
          try {
            const input = projectInput.parse(args.input);
            const project = await ctx.service.createProject(input.name);
            return { project, error: null };
          } catch (error) {
            return { project: null, error: formatError(error) };
          }
        },
        createRequirement: async (_root, args, ctx) => {
          try {
            const input = requirementInput.parse(args.input);
            const requirement = await ctx.service.createRequirement(input);
            return { requirement, error: null };
          } catch (error) {
            return { requirement: null, error: formatError(error) };
          }
        },
        createManualTestCase: async (_root, args, ctx) => {
          try {
            const input = manualInput.parse(args.input);
            const testCase = await ctx.service.createManualTestCase(input);
            return { testCase, error: null };
          } catch (error) {
            return { testCase: null, error: formatError(error) };
          }
        },
        createAutomatedTestCase: async (_root, args, ctx) => {
          try {
            const input = automatedInput.parse(args.input);
            const testCase = await ctx.service.createAutomatedTestCase(input);
            return { testCase, error: null };
          } catch (error) {
            return { testCase: null, error: formatError(error) };
          }
        },
        createTestRun: async (_root, args, ctx) => {
          try {
            const input = runInput.parse(args.input);
            const run = await ctx.service.createTestRun(input);
            return { run, error: null };
          } catch (error) {
            return { run: null, error: formatError(error) };
          }
        },
        submitTestResult: async (_root, args, ctx) => {
          try {
            const input = resultInput.parse(args.input);
            const result = await ctx.service.submitTestResult(input);
            return { result, error: null };
          } catch (error) {
            return { result: null, error: formatError(error) };
          }
        },
        importRequirements: async (_root, args, ctx) => {
          const input = requirementsImportInput.parse(args.input);
          return ctx.service.importRequirements(input);
        },
        importAutomatedFromTrr: async (_root, args, ctx) => {
          const input = trrImportInput.parse(args.input);
          return ctx.service.importAutomatedFromTrr(input);
        },
        recalculateKpiSnapshots: async (_root, args, ctx) => {
          const input = recalcKpiInput.parse(args.input);
          return ctx.service.recalculateKpiSnapshots(input);
        },
        upsertRequirementDesignLink: async (_root, args, ctx) => {
          try {
            const input = requirementDesignLinkInput.parse(args.input);
            const link = await ctx.service.upsertRequirementDesignLink(input);
            return { link, error: null };
          } catch (error) {
            return { link: null, error: formatError(error) };
          }
        },
        unlinkRequirementDesignLink: async (_root, args, ctx) => {
          const input = unlinkRequirementDesignLinkInput.parse(args.input);
          return ctx.service.unlinkRequirementDesignLink(input);
        },
        importRequirementDesignLinks: async (_root, args, ctx) => {
          const input = importRequirementDesignLinksInput.parse(args.input);
          return ctx.service.importRequirementDesignLinks(input);
        }
      },
      AppError: {
        context: (root: { context: unknown }) =>
          root.context ? JSON.stringify(root.context) : null
      }
    }
  });
}
