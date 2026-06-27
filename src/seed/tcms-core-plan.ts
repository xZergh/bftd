import type { TcmsService } from "../domain/service";
import { slugifyProjectKey } from "../domain/services/projects";
import { TCMS_PROJECT_KEY } from "./tcms-project-constants";
import { TCMS_R1_MANUAL_TEST_TITLES } from "./tcms-r1-test-cases";
import {
  TCMS_R1_01_AUTO_EXTERNAL_ID,
  TCMS_R1_02_AUTO_EXTERNAL_ID,
  TCMS_R1_03_AUTO_EXTERNAL_ID,
  TCMS_R1_04_AUTO_EXTERNAL_ID,
  TCMS_R1_05_AUTO_EXTERNAL_ID
} from "./tcms-r1-automation";

export const TCMS_CORE_PLAN_R1 = "CORE · Projects R1";

export type TcmsCorePlanSeedResult = {
  projectId: string;
  planId: string;
};

/** Idempotent: single CORE plan with R1 manual + automated members. */
export async function seedTcmsCorePlans(service: TcmsService): Promise<TcmsCorePlanSeedResult | null> {
  const tcmsKey = slugifyProjectKey(TCMS_PROJECT_KEY);
  const project = await service.getProject({ key: tcmsKey });
  if (project === null) {
    return null;
  }

  const manualCases = await service.listTestCases({ projectId: project.id, type: "manual", includeDeleted: true });
  const automatedCases = await service.listTestCases({ projectId: project.id, type: "automated", includeDeleted: true });

  const r1ManualIds = manualCases
    .filter((tc) =>
      Object.values(TCMS_R1_MANUAL_TEST_TITLES).includes(
        tc.title as (typeof TCMS_R1_MANUAL_TEST_TITLES)[keyof typeof TCMS_R1_MANUAL_TEST_TITLES]
      )
    )
    .map((tc) => tc.id);

  const r1AutoExternalIds = [
    TCMS_R1_01_AUTO_EXTERNAL_ID,
    TCMS_R1_02_AUTO_EXTERNAL_ID,
    TCMS_R1_03_AUTO_EXTERNAL_ID,
    TCMS_R1_04_AUTO_EXTERNAL_ID,
    TCMS_R1_05_AUTO_EXTERNAL_ID
  ];
  const r1AutoIds = automatedCases.filter((tc) => r1AutoExternalIds.includes(tc.externalId ?? "")).map((tc) => tc.id);

  const plans = await service.listTestPlans({ projectId: project.id });
  let plan = plans.find((p) => p.name === TCMS_CORE_PLAN_R1);
  if (plan === undefined) {
    plan = await service.createTestPlan({
      projectId: project.id,
      name: TCMS_CORE_PLAN_R1,
      description: "CORE epic R1 manual tests and linked Playwright automation.",
      releaseLabel: "MVP",
      sprintLabel: "MVP-1"
    });
  }

  for (const testCaseId of r1ManualIds) {
    await service.linkTestPlanTestCase({ testPlanId: plan.id, testCaseId });
  }
  for (const testCaseId of r1AutoIds) {
    await service.linkTestPlanTestCase({ testPlanId: plan.id, testCaseId });
  }

  return { projectId: project.id, planId: plan.id };
}
