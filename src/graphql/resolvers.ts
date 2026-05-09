import { AppError } from "../domain/errors";
import { TcmsService } from "../domain/service";
import {
  archiveProjectInput,
  automatedInput,
  importRequirementDesignLinksInput,
  kpiDashboardInput,
  linkAutomatedManualInput,
  linkRequirementManualInput,
  linkTestPlanTestCaseInput,
  listProjectsInput,
  manualInput,
  projectByInput,
  projectInput,
  projectSummaryInput,
  recalcKpiInput,
  requirementByInput,
  requirementDesignLinkInput,
  requirementDesignLinksQueryInput,
  requirementInput,
  requirementsImportInput,
  requirementsListInput,
  resultInput,
  restoreTestCaseInput,
  runAggregateInput,
  runInput,
  runTraceabilityInput,
  traceabilityGraphInput,
  testCaseByInput,
  testCasesListInput,
  testCaseVersionHistoryInput,
  testRunByInput,
  testPlanByInput,
  testPlansListInput,
  testRunsListInput,
  tombstoneTestCaseInput,
  trrImportInput,
  unlinkAutomatedManualInput,
  unlinkTestPlanTestCaseInput,
  unlinkRequirementDesignLinkInput,
  unlinkRequirementManualInput,
  updateAutomatedTestCaseInput,
  updateManualTestCaseInput,
  updateProjectInput,
  updateRequirementInput,
  updateTestPlanInput,
  createTestPlanInput,
  deleteTestPlanInput,
  deleteRequirementInput,
  deleteTestCaseInput
} from "./inputs";
import { GraphQLError } from "graphql";
import { ZodError } from "zod";

type Context = { service: TcmsService };

function rethrowDomainErrorAsGraphQLError(error: unknown): never {
  if (error instanceof AppError) {
    throw new GraphQLError(error.message, {
      extensions: { code: error.code }
    });
  }
  throw error;
}

function formatError(error: unknown) {
  if (error instanceof AppError) {
    return {
      code: error.code,
      message: error.message,
      fixHint: error.fixHint,
      context: error.context ?? null
    };
  }
  if (error instanceof ZodError) {
    const msg = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return {
      code: "VALIDATION_ERROR" as const,
      message: msg || "Validation failed",
      fixHint: "Check input fields against the schema.",
      context: null
    };
  }
  return {
    code: "VALIDATION_ERROR",
    message: "Unhandled server error",
    fixHint: "Check request payload and try again.",
    context: null
  };
}

function mapProject(p: {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return { ...p, description: p.description ?? null };
}

function mapRequirement(r: {
  id: string;
  projectId: string;
  externalKey: string;
  title: string;
  description: string | null;
  releaseLabel: string | null;
  sprintLabel: string | null;
  requirementType: string | null;
  status: string | null;
  priority: string | null;
  tags: string[];
  parentRequirementId: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: r.id,
    projectId: r.projectId,
    externalKey: r.externalKey,
    title: r.title,
    description: r.description,
    releaseLabel: r.releaseLabel,
    sprintLabel: r.sprintLabel,
    requirementType: r.requirementType,
    status: r.status,
    priority: r.priority,
    tags: r.tags ?? [],
    parentRequirementId: r.parentRequirementId,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

export const resolvers = {
  Query: {
    projects: async (_root: unknown, args: { input?: unknown }, ctx: Context) => {
      const input = listProjectsInput.optional().parse(args.input ?? {});
      const rows = await ctx.service.listProjects(input);
      return rows.map(mapProject);
    },
    project: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = projectByInput.parse(args.input);
      const p = await ctx.service.getProject({ id: input.id, key: input.key });
      return p ? mapProject(p) : null;
    },
    projectSummary: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = projectSummaryInput.parse(args.input);
      return ctx.service.getProjectSummary(input);
    },
    requirements: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = requirementsListInput.parse(args.input);
      const rows = await ctx.service.listRequirements(input);
      return rows.map(mapRequirement);
    },
    requirement: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = requirementByInput.parse(args.input);
      const r = await ctx.service.getRequirement(input);
      return r ? mapRequirement(r as Parameters<typeof mapRequirement>[0]) : null;
    },
    testCases: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testCasesListInput.parse(args.input);
      const rows = await ctx.service.listTestCases({
        projectId: input.projectId,
        type: input.type as "manual" | "automated" | undefined,
        includeDeleted: input.includeDeleted
      });
      return rows;
    },
    testCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testCaseByInput.parse(args.input);
      return ctx.service.getTestCase(input);
    },
    testRuns: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testRunsListInput.parse(args.input);
      return ctx.service.listTestRuns(input);
    },
    testPlans: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testPlansListInput.parse(args.input);
      return ctx.service.listTestPlans(input);
    },
    testRun: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testRunByInput.parse(args.input);
      const detail = await ctx.service.getTestRun(input);
      if (!detail) return null;
      const { results: resList, ...run } = detail as typeof detail & {
        results: Array<Record<string, unknown> & { attachments?: unknown }>;
      };
      const results = resList.map((r) => ({
        ...r,
        attachments: Array.isArray(r.attachments) ? r.attachments : []
      }));
      return { run, results };
    },
    testPlan: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testPlanByInput.parse(args.input);
      return ctx.service.getTestPlan(input);
    },
    runAggregate: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = runAggregateInput.parse(args.input);
      return ctx.service.getRunAggregate(input);
    },
    runTraceabilityReport: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = runTraceabilityInput.parse(args.input);
      return ctx.service.getRunTraceabilityReport(input);
    },
    traceabilityGraph: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = traceabilityGraphInput.parse(args.input);
      try {
        return await ctx.service.getTraceabilityGraph(input);
      } catch (e) {
        rethrowDomainErrorAsGraphQLError(e);
      }
    },
    kpiDashboard: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = kpiDashboardInput.parse(args.input);
      try {
        return await ctx.service.getKpiDashboard(input);
      } catch (e) {
        rethrowDomainErrorAsGraphQLError(e);
      }
    },
    requirementDesignLinks: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = requirementDesignLinksQueryInput.parse(args.input);
      return ctx.service.getRequirementDesignLinks(input);
    },
    testCaseVersionHistory: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testCaseVersionHistoryInput.parse(args.input);
      const rows = await ctx.service.listTestCaseVersionHistory(input);
      return rows.map((v) => ({
        ...v,
        requirementIds: v.links.requirementIds,
        manualTestCaseIds: v.links.manualTestCaseIds,
        steps: v.steps.map((s: { metaJson: string | null }) => ({
          ...s,
          metaJson: s.metaJson ?? null
        }))
      }));
    }
  },
  Mutation: {
    createProject: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = projectInput.parse(args.input);
        const project = await ctx.service.createProject(input.name, input.key, input.description);
        return { project: mapProject(project), error: null };
      } catch (error) {
        return { project: null, error: formatError(error) };
      }
    },
    updateProject: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = updateProjectInput.parse(args.input);
        const project = await ctx.service.updateProject(input);
        return { project: mapProject(project), error: null };
      } catch (error) {
        return { project: null, error: formatError(error) };
      }
    },
    archiveProject: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = archiveProjectInput.parse(args.input);
        const project = await ctx.service.archiveProject(input);
        return { project: project ? mapProject(project) : null, error: null };
      } catch (error) {
        return { project: null, error: formatError(error) };
      }
    },
    createRequirement: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = requirementInput.parse(args.input);
        const requirement = await ctx.service.createRequirement(input);
        return { requirement: mapRequirement(requirement as Parameters<typeof mapRequirement>[0]), error: null };
      } catch (error) {
        return { requirement: null, error: formatError(error) };
      }
    },
    updateRequirement: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = updateRequirementInput.parse(args.input);
        const requirement = await ctx.service.updateRequirement(input);
        return { requirement: requirement ? mapRequirement(requirement as Parameters<typeof mapRequirement>[0]) : null, error: null };
      } catch (error) {
        return { requirement: null, error: formatError(error) };
      }
    },
    deleteRequirement: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = deleteRequirementInput.parse(args.input);
        await ctx.service.deleteRequirement(input);
        return { success: true };
      } catch (error) {
        if (error instanceof AppError) {
          throw new GraphQLError(error.message, {
            extensions: {
              code: error.code,
              fixHint: error.fixHint,
              context: error.context != null ? JSON.stringify(error.context) : null
            }
          });
        }
        throw error;
      }
    },
    createManualTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = manualInput.parse(args.input);
        const testCase = await ctx.service.createManualTestCase(input);
        return { testCase, error: null };
      } catch (error) {
        return { testCase: null, error: formatError(error) };
      }
    },
    createAutomatedTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = automatedInput.parse(args.input);
        const testCase = await ctx.service.createAutomatedTestCase(input);
        return { testCase, error: null };
      } catch (error) {
        return { testCase: null, error: formatError(error) };
      }
    },
    updateManualTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = updateManualTestCaseInput.parse(args.input);
        const testCase = await ctx.service.updateManualTestCase(input);
        return { testCase, error: null };
      } catch (error) {
        return { testCase: null, error: formatError(error) };
      }
    },
    updateAutomatedTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = updateAutomatedTestCaseInput.parse(args.input);
        const testCase = await ctx.service.updateAutomatedTestCase(input);
        return { testCase, error: null };
      } catch (error) {
        return { testCase: null, error: formatError(error) };
      }
    },
    deleteManualTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = deleteTestCaseInput.parse(args.input);
      await ctx.service.deleteManualTestCase(input);
      return { success: true };
    },
    deleteAutomatedTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = deleteTestCaseInput.parse(args.input);
      const r = await ctx.service.deleteAutomatedTestCase(input);
      return { success: true, tombstoned: r.tombstoned };
    },
    linkRequirementManualTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = linkRequirementManualInput.parse(args.input);
      return ctx.service.linkRequirementManualTestCase(input);
    },
    unlinkRequirementManualTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = unlinkRequirementManualInput.parse(args.input);
      await ctx.service.unlinkRequirementManualTestCase(input);
      return { success: true };
    },
    linkAutomatedManualTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = linkAutomatedManualInput.parse(args.input);
      return ctx.service.linkAutomatedManualTestCase(input);
    },
    unlinkAutomatedManualTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = unlinkAutomatedManualInput.parse(args.input);
      await ctx.service.unlinkAutomatedManualTestCase(input);
      return { success: true };
    },
    tombstoneTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = tombstoneTestCaseInput.parse(args.input);
      await ctx.service.tombstoneTestCase(input);
      return { success: true };
    },
    restoreTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = restoreTestCaseInput.parse(args.input);
      await ctx.service.restoreTestCase(input);
      return { success: true };
    },
    createTestRun: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = runInput.parse(args.input);
        const run = await ctx.service.createTestRun(input);
        return { run, error: null };
      } catch (error) {
        return { run: null, error: formatError(error) };
      }
    },
    createTestPlan: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = createTestPlanInput.parse(args.input);
        const testPlan = await ctx.service.createTestPlan(input);
        return { testPlan, error: null };
      } catch (error) {
        return { testPlan: null, error: formatError(error) };
      }
    },
    updateTestPlan: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = updateTestPlanInput.parse(args.input);
        const testPlan = await ctx.service.updateTestPlan(input);
        return { testPlan, error: null };
      } catch (error) {
        return { testPlan: null, error: formatError(error) };
      }
    },
    deleteTestPlan: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = deleteTestPlanInput.parse(args.input);
      await ctx.service.deleteTestPlan(input);
      return { success: true };
    },
    linkTestPlanTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = linkTestPlanTestCaseInput.parse(args.input);
      return ctx.service.linkTestPlanTestCase(input);
    },
    unlinkTestPlanTestCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = unlinkTestPlanTestCaseInput.parse(args.input);
      await ctx.service.unlinkTestPlanTestCase(input);
      return { success: true };
    },
    submitTestResult: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = resultInput.parse(args.input);
        const result = await ctx.service.submitTestResult(input);
        let attachments = input.attachments ?? [];
        if (result.attachmentsJson) {
          try {
            attachments = JSON.parse(result.attachmentsJson) as typeof attachments;
          } catch {
            /* keep input attachments */
          }
        }
        return {
          result: {
            id: result.id,
            runId: result.runId,
            testCaseId: result.testCaseId,
            status: result.status,
            durationMs: result.durationMs,
            createdAt: result.createdAt,
            attachments
          },
          error: null
        };
      } catch (error) {
        return { result: null, error: formatError(error) };
      }
    },
    importRequirements: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = requirementsImportInput.parse(args.input);
      return ctx.service.importRequirements(input);
    },
    importAutomatedFromTrr: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = trrImportInput.parse(args.input);
      return ctx.service.importAutomatedFromTrr(input);
    },
    recalculateKpiSnapshots: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = recalcKpiInput.parse(args.input);
      try {
        return await ctx.service.recalculateKpiSnapshots(input);
      } catch (e) {
        rethrowDomainErrorAsGraphQLError(e);
      }
    },
    upsertRequirementDesignLink: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = requirementDesignLinkInput.parse(args.input);
        const link = await ctx.service.upsertRequirementDesignLink(input);
        return { link, error: null };
      } catch (error) {
        return { link: null, error: formatError(error) };
      }
    },
    unlinkRequirementDesignLink: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = unlinkRequirementDesignLinkInput.parse(args.input);
      return ctx.service.unlinkRequirementDesignLink(input);
    },
    importRequirementDesignLinks: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = importRequirementDesignLinksInput.parse(args.input);
      return ctx.service.importRequirementDesignLinks(input);
    }
  },
  TestRunDetail: {
    run: (root: { run: unknown }) => root.run
  },
  TestCase: {
    steps: async (parent: { id: string; steps?: unknown[] }, _args: unknown, ctx: Context) => {
      if (Array.isArray(parent.steps)) return parent.steps;
      const full = await ctx.service.getTestCase({ id: parent.id, includeDeleted: true });
      return full?.steps ?? [];
    }
  },
  TestPlan: {
    testCases: async (parent: { id: string; testCases?: unknown[] }, _args: unknown, ctx: Context) => {
      if (Array.isArray(parent.testCases)) return parent.testCases;
      const full = await ctx.service.getTestPlan({ id: parent.id });
      return full?.testCases ?? [];
    }
  },
  AppError: {
    context: (root: { context: unknown }) => (root.context ? JSON.stringify(root.context) : null)
  }
};
