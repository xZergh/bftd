import { AppError } from "../domain/errors";
import { TcmsService } from "../domain/service";
import {
  automatedInput,
  importRequirementDesignLinksInput,
  kpiDashboardInput,
  manualInput,
  projectInput,
  projectSummaryInput,
  recalcKpiInput,
  requirementDesignLinkInput,
  requirementDesignLinksQueryInput,
  requirementInput,
  requirementsImportInput,
  resultInput,
  runInput,
  runTraceabilityInput,
  trrImportInput,
  unlinkRequirementDesignLinkInput
} from "./inputs";

type Context = { service: TcmsService };

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

export const resolvers = {
  Query: {
    projectSummary: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = projectSummaryInput.parse(args.input);
      return ctx.service.getProjectSummary(input);
    },
    runTraceabilityReport: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = runTraceabilityInput.parse(args.input);
      return ctx.service.getRunTraceabilityReport(input);
    },
    kpiDashboard: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = kpiDashboardInput.parse(args.input);
      return ctx.service.getKpiDashboard(input);
    },
    requirementDesignLinks: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      const input = requirementDesignLinksQueryInput.parse(args.input);
      return ctx.service.getRequirementDesignLinks(input);
    }
  },
  Mutation: {
    createProject: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = projectInput.parse(args.input);
        const project = await ctx.service.createProject(input.name);
        return { project, error: null };
      } catch (error) {
        return { project: null, error: formatError(error) };
      }
    },
    createRequirement: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = requirementInput.parse(args.input);
        const requirement = await ctx.service.createRequirement(input);
        return { requirement, error: null };
      } catch (error) {
        return { requirement: null, error: formatError(error) };
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
    createTestRun: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = runInput.parse(args.input);
        const run = await ctx.service.createTestRun(input);
        return { run, error: null };
      } catch (error) {
        return { run: null, error: formatError(error) };
      }
    },
    submitTestResult: async (_root: unknown, args: { input: unknown }, ctx: Context) => {
      try {
        const input = resultInput.parse(args.input);
        const result = await ctx.service.submitTestResult(input);
        return { result, error: null };
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
      return ctx.service.recalculateKpiSnapshots(input);
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
  AppError: {
    context: (root: { context: unknown }) => (root.context ? JSON.stringify(root.context) : null)
  }
};
