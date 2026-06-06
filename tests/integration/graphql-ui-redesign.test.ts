import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - UI redesign API", () => {
  it("returns projectSettings enums and extended projectSummary", async () => {
    const t = await createTestAgent("tcms-ui-redesign-");

    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "UI Redesign" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const settingsRes = await t.agent.post("/graphql").send({
      query: `query($input: ProjectSettingsInput!) {
        projectSettings(input: $input) {
          requirementStatuses
          requirementPriorities
          requirementTypes
        }
      }`,
      variables: { input: { projectId } }
    });
    expect(settingsRes.body.data.projectSettings).toEqual({
      requirementStatuses: ["draft", "in_progress", "approved"],
      requirementPriorities: ["low", "medium", "high"],
      requirementTypes: ["functional", "nonfunctional"]
    });

    const summaryRes = await t.agent.post("/graphql").send({
      query: `query($input: ProjectSummaryInput!) {
        projectSummary(input: $input) {
          totalRequirements
          totalManualCases
          totalAutomatedCases
          totalPlans
          latestRunId
          latestRunName
        }
      }`,
      variables: { input: { projectId } }
    });
    expect(summaryRes.body.data.projectSummary).toEqual({
      totalRequirements: 0,
      totalManualCases: 0,
      totalAutomatedCases: 0,
      totalPlans: 0,
      latestRunId: null,
      latestRunName: null
    });

    await t.close();
  });

  it("returns link counts on requirement and testcase lists", async () => {
    const t = await createTestAgent("tcms-ui-counts-");

    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "Counts" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const reqRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id externalKey } }
      }`,
      variables: {
        input: { projectId, externalKey: "R1", title: "Req one", status: "draft", priority: "high" }
      }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    const badStatus = await t.agent.post("/graphql").send({
      query: `mutation($input: UpdateRequirementInput!) {
        updateRequirement(input: $input) { requirement { id } error { code fixHint } }
      }`,
      variables: { input: { id: requirementId, status: "invalid" } }
    });
    expect(badStatus.body.data.updateRequirement.requirement).toBeNull();
    expect(badStatus.body.data.updateRequirement.error.code).toBe("VALIDATION_ERROR");

    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } }
      }`,
      variables: {
        input: {
          projectId,
          title: "Manual one",
          requirementIds: [requirementId],
          steps: [{ name: "Step 1" }]
        }
      }
    });

    const listReq = await t.agent.post("/graphql").send({
      query: `query($input: RequirementsListInput!) {
        requirements(input: $input) { id linkedManualTestCaseCount status priority }
      }`,
      variables: { input: { projectId } }
    });
    expect(listReq.body.data.requirements[0].linkedManualTestCaseCount).toBe(1);

    const listTc = await t.agent.post("/graphql").send({
      query: `query($input: TestCasesListInput!) {
        testCases(input: $input) { id type linkedRequirementCount linkedManualTestCaseCount }
      }`,
      variables: { input: { projectId } }
    });
    expect(listTc.body.data.testCases[0].linkedRequirementCount).toBe(1);
    expect(listTc.body.data.testCases[0].linkedManualTestCaseCount).toBe(0);

    await t.close();
  });
});
