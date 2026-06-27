import { AppError } from "../domain/errors";
import { TcmsService } from "../domain/service";
import {
  archiveProjectInput,
  automatedInput,
  importRequirementDesignLinksInput,
  kpiDashboardInput,
  linkAutomatedManualInput,
  linkRequirementManualInput,
  linkTestPlanPlanInput,
  linkTestPlanTestCaseInput,
  launchPlanAutomationInput,
  executeRunAutomationInput,
  runAutomationPreviewInput,
  listProjectsInput,
  manualInput,
  projectByInput,
  projectInput,
  projectSummaryInput,
  projectSettingsInput,
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
  unlinkTestPlanPlanInput,
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
  deleteEpicInput,
  deleteTestCaseInput,
  epicByInput,
  epicInput,
  epicsListInput,
  updateEpicInput
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
    message: error instanceof Error ? error.message : "Unhandled server error",
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

function mapEpic(
  e: {
    id: string;
    projectId: string;
    externalKey: string;
    title: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  counts?: { requirementCount: number; testCaseCount: number }
) {
  return {
    id: e.id,
    projectId: e.projectId,
    externalKey: e.externalKey,
    title: e.title,
    description: e.description,
    requirementCount: counts?.requirementCount ?? 0,
    testCaseCount: counts?.testCaseCount ?? 0,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt
  };
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
  epicId?: string | null;
  epic?: Parameters<typeof mapEpic>[0] | null;
  linkedManualTestCaseCount?: number;
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
    epicId: r.epicId ?? null,
    epic: r.epic ? mapEpic(r.epic) : null,
    linkedManualTestCaseCount: r.linkedManualTestCaseCount ?? 0,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  };
}

function mapTestCaseListRow(r: {
  id: string;
  projectId: string;
  type: string;
  title: string;
  externalKey: string | null;
  externalId: string | null;
  description: string | null;
  preconditions: string | null;
  notes: string | null;
  automationNotes: string | null;
  automationStatus: string | null;
  releaseLabel: string | null;
  sprintLabel: string | null;
  epicId?: string | null;
  epic?: Parameters<typeof mapEpic>[0] | null;
  isDeleted: boolean;
  deletedAt: Date | null;
  linkedRequirementCount?: number;
  linkedManualTestCaseCount?: number;
  createdAt: Date;
  updatedAt: Date;
  steps?: unknown[];
}) {
  return {
    id: r.id,
    projectId: r.projectId,
    type: r.type,
    title: r.title,
    externalKey: r.externalKey,
    externalId: r.externalId,
    description: r.description,
    preconditions: r.preconditions,
    notes: r.notes,
    automationNotes: r.automationNotes,
    automationStatus: r.automationStatus,
    releaseLabel: r.releaseLabel,
    sprintLabel: r.sprintLabel,
    epicId: r.epicId ?? null,
    epic: r.epic ? mapEpic(r.epic) : null,
    isDeleted: r.isDeleted,
    deletedAt: r.deletedAt,
    linkedRequirementCount: r.linkedRequirementCount ?? 0,
    linkedManualTestCaseCount: r.linkedManualTestCaseCount ?? 0,
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
    projectSettings: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = projectSettingsInput.parse(args.input);
      try {
        return await ctx.service.getProjectSettings(input);
      } catch (e) {
        rethrowDomainErrorAsGraphQLError(e);
      }
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
    epics: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = epicsListInput.parse(args.input);
      const [rows, counts] = await Promise.all([
        ctx.service.listEpics(input),
        ctx.service.getEpicUsageCounts(input.projectId)
      ]);
      return rows.map((row) => mapEpic(row, counts.get(row.id)));
    },
    epic: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = epicByInput.parse(args.input);
      const row = await ctx.service.getEpic(input);
      if (!row) {
        return null;
      }
      const counts = await ctx.service.getEpicUsageCounts(row.projectId);
      return mapEpic(row, counts.get(row.id));
    },
    testCases: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testCasesListInput.parse(args.input);
      const rows = await ctx.service.listTestCases({
        projectId: input.projectId,
        type: input.type as "manual" | "automated" | undefined,
        includeDeleted: input.includeDeleted,
        requirementId: input.requirementId
      });
      return rows.map(mapTestCaseListRow);
    },
    testCase: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = testCaseByInput.parse(args.input);
      const tc = await ctx.service.getTestCase(input);
      return tc ? mapTestCaseListRow({ ...tc, linkedRequirementCount: 0, linkedManualTestCaseCount: 0 }) : null;
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
    runAutomationPreview: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = runAutomationPreviewInput.parse(args.input);
        const preview = await ctx.service.previewRunAutomation(input);
        return {
          manualCount: preview.manualCount,
          automatedCount: preview.automatedCount,
          specPaths: preview.specPaths,
          targets: preview.targets,
          error: null
        };
      } catch (error) {
        return {
          manualCount: 0,
          automatedCount: 0,
          specPaths: [],
          targets: [],
          error: formatError(error)
        };
      }
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
    createEpic: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = epicInput.parse(args.input);
        const epic = await ctx.service.createEpic(input);
        return { epic: mapEpic(epic), error: null };
      } catch (error) {
        return { epic: null, error: formatError(error) };
      }
    },
    updateEpic: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = updateEpicInput.parse(args.input);
        const epic = await ctx.service.updateEpic(input);
        return { epic: epic ? mapEpic(epic) : null, error: null };
      } catch (error) {
        return { epic: null, error: formatError(error) };
      }
    },
    deleteEpic: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = deleteEpicInput.parse(args.input);
        await ctx.service.deleteEpic(input);
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
        const { executeAutomation, ...runFields } = input;
        const run = await ctx.service.createTestRun(runFields);
        if (executeAutomation && runFields.testPlanId) {
          await ctx.service.spawnAutomationForRun({ runId: run.id, projectId: runFields.projectId });
        }
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
    linkTestPlanPlan: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = linkTestPlanPlanInput.parse(args.input);
      return ctx.service.linkTestPlanPlan(input);
    },
    unlinkTestPlanPlan: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = unlinkTestPlanPlanInput.parse(args.input);
      await ctx.service.unlinkTestPlanPlan(input);
      return { success: true };
    },
    launchPlanAutomation: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = launchPlanAutomationInput.parse(args.input);
        const launched = await ctx.service.launchPlanAutomation(input);
        return {
          run: launched.run,
          automatedCount: launched.automatedCount,
          specPaths: launched.specPaths,
          error: null
        };
      } catch (error) {
        return { run: null, automatedCount: 0, specPaths: [], error: formatError(error) };
      }
    },
    executeRunAutomation: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = executeRunAutomationInput.parse(args.input);
        const result = await ctx.service.executeRunAutomation(input);
        return {
          manualCount: result.manualCount,
          automatedCount: result.automatedCount,
          specPaths: result.specPaths,
          targets: result.targets,
          started: result.started,
          error: null
        };
      } catch (error) {
        return {
          manualCount: 0,
          automatedCount: 0,
          specPaths: [],
          targets: [],
          started: false,
          error: formatError(error)
        };
      }
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
    },
    purgeArchivedProjects: async (_root: unknown, _args: unknown, ctx: Context) => {
      try {
        const result = await ctx.service.purgeArchivedProjects();
        return { ...result, error: null };
      } catch (error) {
        return { deletedCount: 0, deletedProjectKeys: [], error: formatError(error) };
      }
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
    },
    childPlans: async (parent: { id: string; childPlans?: unknown[] }, _args: unknown, ctx: Context) => {
      if (Array.isArray(parent.childPlans)) return parent.childPlans;
      const full = await ctx.service.getTestPlan({ id: parent.id });
      return full?.childPlans ?? [];
    },
    memberStats: async (parent: { id: string; memberStats?: unknown }, _args: unknown, ctx: Context) => {
      if (parent.memberStats && typeof parent.memberStats === "object") return parent.memberStats;
      const full = await ctx.service.getTestPlan({ id: parent.id });
      return (
        full?.memberStats ?? {
          directTestCaseCount: 0,
          childPlanCount: 0,
          flattenedTestCaseCount: 0,
          flattenedManualCount: 0,
          flattenedAutomatedCount: 0
        }
      );
    }
  },
  AppError: {
    context: (root: { context: unknown }) => (root.context ? JSON.stringify(root.context) : null)
  }
};
