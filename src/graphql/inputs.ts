import { z } from "zod";

export const projectInput = z.object({ name: z.string().min(1), key: z.string().optional() });
export const requirementInput = z.object({
  projectId: z.string().min(1),
  externalKey: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional(),
  requirementType: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parentRequirementId: z.string().optional()
});
export const manualStepInput = z.object({
  name: z.string().min(1),
  expectedResult: z.string().optional()
});
export const manualInput = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1),
  requirementIds: z.array(z.string().min(1)),
  steps: z.array(manualStepInput).min(1),
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
  sprintLabel: z.string().optional(),
  environment: z.string().optional(),
  buildVersion: z.string().optional(),
  trigger: z.string().optional(),
  finishedAt: z
    .union([z.string(), z.date()])
    .optional()
    .transform((v) => (v instanceof Date ? v.toISOString() : v))
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
  durationMs: z.number().int().nonnegative().optional(),
  attachments: z.array(z.object({ kind: z.string(), ref: z.string() })).optional()
});
export const requirementsImportInput = z
  .object({
    projectId: z.string().optional(),
    projectKey: z.string().optional(),
    releaseLabel: z.string().optional(),
    sprintLabel: z.string().optional(),
    requirements: z.array(
      z.object({
        externalKey: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        releaseLabel: z.string().optional(),
        sprintLabel: z.string().optional(),
        requirementType: z.string().optional(),
        status: z.string().optional(),
        priority: z.string().optional(),
        tags: z.array(z.string()).optional(),
        parentExternalKey: z.string().optional()
      })
    )
  })
  .refine((v) => !!(v.projectId ?? v.projectKey), {
    message: "Provide projectId or projectKey",
    path: ["projectId"]
  });
export const trrImportInput = z
  .object({
    projectId: z.string().optional(),
    projectKey: z.string().optional(),
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
              sourceStepId: z.string().optional(),
              parentStepId: z.string().optional(),
              metaJson: z.string().optional()
            })
          )
          .optional()
      })
    )
  })
  .refine((v) => !!(v.projectId ?? v.projectKey), {
    message: "Provide projectId or projectKey",
    path: ["projectId"]
  });
export const kpiDashboardInput = z.object({
  projectId: z.string().min(1),
  releaseLabel: z.string().optional(),
  sprintLabel: z.string().optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional()
});
export const recalcKpiInput = z.object({
  projectId: z.string().min(1),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  fullRebuild: z.boolean().optional()
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

export const listProjectsInput = z.object({ includeArchived: z.boolean().optional() });
export const projectByInput = z
  .object({ id: z.string().optional(), key: z.string().optional() })
  .refine((v) => !!(v.id ?? v.key), { message: "Provide id or key", path: ["id"] });
export const updateProjectInput = z
  .object({
    id: z.string().optional(),
    key: z.string().optional(),
    name: z.string().optional(),
    keyNew: z.string().optional()
  })
  .refine((v) => !!(v.id ?? v.key), { message: "Provide id or key", path: ["id"] });
export const archiveProjectInput = z
  .object({
    id: z.string().optional(),
    key: z.string().optional(),
    archived: z.boolean()
  })
  .refine((v) => !!(v.id ?? v.key), { message: "Provide id or key", path: ["id"] });
export const requirementsListInput = z.object({ projectId: z.string().min(1) });
export const requirementByInput = z.object({ id: z.string().min(1), projectId: z.string().optional() });
export const updateRequirementInput = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  description: z.string().nullable().optional(),
  releaseLabel: z.string().nullable().optional(),
  sprintLabel: z.string().nullable().optional(),
  requirementType: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  tags: z.array(z.string()).optional(),
  parentRequirementId: z.string().nullable().optional()
});
export const deleteRequirementInput = z.object({ id: z.string().min(1) });
export const testCasesListInput = z.object({
  projectId: z.string().min(1),
  type: z.enum(["manual", "automated"]).optional(),
  includeDeleted: z.boolean().optional()
});
export const testCaseByInput = z.object({
  id: z.string().min(1),
  projectId: z.string().optional(),
  includeDeleted: z.boolean().optional()
});
export const updateManualTestCaseInput = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  releaseLabel: z.string().nullable().optional(),
  sprintLabel: z.string().nullable().optional(),
  steps: z.array(manualStepInput).optional()
});
export const updateAutomatedTestCaseInput = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  externalId: z.string().nullable().optional(),
  releaseLabel: z.string().nullable().optional(),
  sprintLabel: z.string().nullable().optional(),
  manualTestCaseIds: z.array(z.string().min(1)).optional()
});
export const deleteTestCaseInput = z.object({ id: z.string().min(1) });
export const linkRequirementManualInput = z.object({
  projectId: z.string().min(1),
  requirementId: z.string().min(1),
  manualTestCaseId: z.string().min(1)
});
export const unlinkRequirementManualInput = z.object({
  requirementId: z.string().min(1),
  manualTestCaseId: z.string().min(1)
});
export const linkAutomatedManualInput = z.object({
  projectId: z.string().min(1),
  automatedTestCaseId: z.string().min(1),
  manualTestCaseId: z.string().min(1)
});
export const unlinkAutomatedManualInput = z.object({
  automatedTestCaseId: z.string().min(1),
  manualTestCaseId: z.string().min(1)
});
export const testCaseVersionHistoryInput = z.object({
  testCaseId: z.string().min(1),
  includeDeleted: z.boolean().optional()
});
export const tombstoneTestCaseInput = z.object({ testCaseId: z.string().min(1) });
export const restoreTestCaseInput = z.object({ testCaseId: z.string().min(1) });
export const testRunsListInput = z.object({ projectId: z.string().min(1) });
export const testRunByInput = z.object({ runId: z.string().min(1), projectId: z.string().optional() });
export const runAggregateInput = z.object({ runId: z.string().min(1) });
