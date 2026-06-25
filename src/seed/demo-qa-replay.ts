import type { TcmsService } from "../domain/service";
import { DEMO_QA_E2E_REQUIREMENT_KEYS } from "./demo-qa-catalog";
import type { DemoQaSeedData } from "./demo-qa-seed-data";
import type { DemoQaSeedManifest } from "./demo-qa-constants";

export async function replayDemoQaSeedData(
  service: TcmsService,
  data: DemoQaSeedData
): Promise<DemoQaSeedManifest> {
  const project = await service.createProject(data.project.name, data.project.key, data.project.description);

  const reqIdByKey = new Map<string, string>();
  const reqIdsBySlot: DemoQaSeedManifest["requirementIds"] = { R1: "", R2: "", R3: "" };
  const pending = [...data.requirements];

  while (pending.length > 0) {
    const batch = pending.filter(
      (req) => !req.parentExternalKey || reqIdByKey.has(req.parentExternalKey)
    );
    if (batch.length === 0) {
      const keys = pending.map((r) => r.externalKey).join(", ");
      throw new Error(`Unresolved parentExternalKey cycle or missing parent for: ${keys}`);
    }
    for (const req of batch) {
      const parentRequirementId = req.parentExternalKey
        ? reqIdByKey.get(req.parentExternalKey)
        : undefined;
      if (req.parentExternalKey && !parentRequirementId) {
        throw new Error(`Parent requirement "${req.parentExternalKey}" not found for "${req.externalKey}".`);
      }
      const created = await service.createRequirement({
        projectId: project.id,
        externalKey: req.externalKey,
        title: req.title,
        description: req.description ?? undefined,
        releaseLabel: req.releaseLabel ?? undefined,
        sprintLabel: req.sprintLabel ?? undefined,
        status: req.status ?? undefined,
        priority: req.priority ?? undefined,
        tags: req.tags,
        requirementType: req.requirementType ?? undefined,
        parentRequirementId
      });
      reqIdByKey.set(req.externalKey, created.id);
      const idx = pending.indexOf(req);
      pending.splice(idx, 1);
    }
  }

  const slotKeys = ["R1", "R2", "R3"] as const;
  for (let i = 0; i < slotKeys.length; i++) {
    const key = DEMO_QA_E2E_REQUIREMENT_KEYS[i]!;
    const id = reqIdByKey.get(key);
    if (!id) {
      throw new Error(`E2E anchor requirement "${key}" missing from seed data.`);
    }
    reqIdsBySlot[slotKeys[i]!] = id;
  }

  const manualIdByTitle = new Map<string, string>();
  const manualIdsBySlot: DemoQaSeedManifest["manualTestCaseIds"] = {
    login: "",
    idleTimeout: "",
    passwordReset: ""
  };

  for (const manual of data.manualTestCases) {
    const requirementIds = manual.requirementExternalKeys
      .map((k) => reqIdByKey.get(k))
      .filter((id): id is string => id != null);
    const created = await service.createManualTestCase({
      projectId: project.id,
      title: manual.title,
      requirementIds,
      steps: manual.steps.map((s) => ({
        name: s.name,
        expectedResult: s.expectedResult ?? undefined
      })),
      releaseLabel: manual.releaseLabel ?? undefined,
      sprintLabel: manual.sprintLabel ?? undefined
    });
    manualIdByTitle.set(manual.title, created.id);
  }

  const manualForAnchor = (externalKey: string) =>
    data.manualTestCases.find((m) => m.requirementExternalKeys.includes(externalKey));
  const loginManual = manualForAnchor(DEMO_QA_E2E_REQUIREMENT_KEYS[0]!);
  const idleManual = manualForAnchor(DEMO_QA_E2E_REQUIREMENT_KEYS[1]!);
  const resetManual = manualForAnchor(DEMO_QA_E2E_REQUIREMENT_KEYS[2]!);
  if (loginManual) manualIdsBySlot.login = manualIdByTitle.get(loginManual.title)!;
  if (idleManual) manualIdsBySlot.idleTimeout = manualIdByTitle.get(idleManual.title)!;
  if (resetManual) manualIdsBySlot.passwordReset = manualIdByTitle.get(resetManual.title)!;

  let automatedTestCaseId = "";
  for (const automated of data.automatedTestCases) {
    const manualTestCaseIds = automated.manualTitles
      .map((t) => manualIdByTitle.get(t))
      .filter((id): id is string => id != null);
    const created = await service.createAutomatedTestCase({
      projectId: project.id,
      title: automated.title,
      manualTestCaseIds,
      releaseLabel: automated.releaseLabel ?? undefined,
      sprintLabel: automated.sprintLabel ?? undefined
    });
    if (!automatedTestCaseId) {
      automatedTestCaseId = created.id;
    }
  }

  let testPlanId = "";
  for (const plan of data.plans) {
    const created = await service.createTestPlan({
      projectId: project.id,
      name: plan.name,
      description: plan.description ?? undefined,
      releaseLabel: plan.releaseLabel ?? undefined,
      sprintLabel: plan.sprintLabel ?? undefined
    });
    testPlanId = created.id;
    const allCases = await service.listTestCases({ projectId: project.id });
    for (const title of plan.testCaseTitles) {
      const tc = allCases.find((t) => t.title === title);
      if (tc) {
        await service.linkTestPlanTestCase({ testPlanId: created.id, testCaseId: tc.id });
      }
    }
  }

  let runId = "";
  for (const run of data.runs) {
    const created = await service.createTestRun({
      projectId: project.id,
      name: run.name,
      releaseLabel: run.releaseLabel ?? undefined,
      sprintLabel: run.sprintLabel ?? undefined,
      environment: run.environment ?? undefined,
      buildVersion: run.buildVersion ?? undefined,
      trigger: run.trigger ?? undefined
    });
    runId = created.id;
    const allCases = await service.listTestCases({ projectId: project.id });
    for (const result of run.results) {
      const tc = allCases.find((t) => t.title === result.testCaseTitle);
      if (tc) {
        await service.submitTestResult({
          runId: created.id,
          testCaseId: tc.id,
          status: result.status,
          durationMs: result.durationMs
        });
      }
    }
  }

  return {
    projectId: project.id,
    projectKey: project.key,
    requirementIds: reqIdsBySlot,
    manualTestCaseIds: manualIdsBySlot,
    automatedTestCaseId,
    testPlanId,
    runId
  };
}
