import { z } from "zod";

export const projectInput = z.object({ name: z.string().min(1) });
export const requirementInput = z.object({
  projectId: z.string().min(1),
  externalKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional()
});
export const manualInput = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  requirementIds: z.array(z.string().min(1)),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional()
});
export const automatedInput = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  manualTestCaseIds: z.array(z.string().min(1)),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional()
});
export const runInput = z.object({
  projectId: z.string().min(1),
  name: z.string().min(1),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional()
});
export const projectSummaryInput = z.object({
  projectId: z.string().min(1),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional()
});
export const runTraceabilityInput = z.object({
  runId: z.string().min(1),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional()
});
export const resultInput = z.object({
  runId: z.string().min(1),
  testCaseId: z.string().min(1),
  status: z.enum(["passed", "failed", "skipped", "blocked"]),
  durationMs: z.number().int().nonnegative().optional()
});
export const requirementsImportInput = z.object({
  projectId: z.string().min(1),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional(),
  requirements: z.array(
    z.object({
      externalKey: z.string().optional(),
      title: z.string().optional(),
      description: z.string().optional(),
      releaseLabel: z.string().optional(),
      sprintLabel: z.string().optional()
    })
  )
});
export const trrImportInput = z.object({
  projectId: z.string().min(1),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional(),
  automatedTests: z.array(
    z.object({
      internalTestCaseId: z.string().optional(),
      externalId: z.string().optional(),
      title: z.string().optional(),
      releaseLabel: z.string().optional(),
      sprintLabel: z.string().optional(),
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
export const kpiDashboardInput = z.object({
  projectId: z.string().min(1),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional()
});
export const recalcKpiInput = z.object({
  projectId: z.string().min(1),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
});
export const requirementDesignLinkInput = z.object({
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
export const unlinkRequirementDesignLinkInput = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  provider: z.string().min(1),
  shareUrl: z.string().min(1)
});
export const requirementDesignLinksQueryInput = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().optional()
});
export const importRequirementDesignLinksInput = z.object({
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
