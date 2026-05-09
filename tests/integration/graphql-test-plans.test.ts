import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - test plans", () => {
  it("supports plan CRUD, linking testcases, and run creation with optional testPlanId", async () => {
    const t = await createTestAgent("tcms-plan-");

    const createProject = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } error { code } }
      }`,
      variables: { input: { name: "Plan project" } }
    });
    const projectId = createProject.body.data.createProject.project.id as string;

    const createRequirement = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } error { code } }
      }`,
      variables: { input: { projectId, externalKey: "PLAN-REQ-1", title: "Plan req" } }
    });
    const requirementId = createRequirement.body.data.createRequirement.requirement.id as string;

    const createManual = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } error { code } }
      }`,
      variables: {
        input: {
          projectId,
          title: "Manual in plan",
          requirementIds: [requirementId],
          steps: [{ name: "Step 1", expectedResult: "OK" }]
        }
      }
    });
    const manualId = createManual.body.data.createManualTestCase.testCase.id as string;

    const createAutomated = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) {
        createAutomatedTestCase(input: $input) { testCase { id } error { code } }
      }`,
      variables: { input: { projectId, title: "Automated in plan", manualTestCaseIds: [manualId] } }
    });
    const automatedId = createAutomated.body.data.createAutomatedTestCase.testCase.id as string;

    const createPlan = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestPlanInput!) {
        createTestPlan(input: $input) { testPlan { id name releaseLabel sprintLabel } error { code } }
      }`,
      variables: {
        input: {
          projectId,
          name: "Plan 1",
          description: "Initial plan",
          releaseLabel: "R1",
          sprintLabel: "S1"
        }
      }
    });
    expect(createPlan.body.data.createTestPlan.error).toBeNull();
    const testPlanId = createPlan.body.data.createTestPlan.testPlan.id as string;

    const linkManual = await t.agent.post("/graphql").send({
      query: `mutation($input: LinkTestPlanTestCaseInput!) {
        linkTestPlanTestCase(input: $input) { linked }
      }`,
      variables: { input: { testPlanId, testCaseId: manualId } }
    });
    expect(linkManual.body.data.linkTestPlanTestCase.linked).toBe(true);

    const linkAuto = await t.agent.post("/graphql").send({
      query: `mutation($input: LinkTestPlanTestCaseInput!) {
        linkTestPlanTestCase(input: $input) { linked }
      }`,
      variables: { input: { testPlanId, testCaseId: automatedId } }
    });
    expect(linkAuto.body.data.linkTestPlanTestCase.linked).toBe(true);

    const listPlans = await t.agent.post("/graphql").send({
      query: `query($input: TestPlansListInput!) {
        testPlans(input: $input) { id name testCases { id } }
      }`,
      variables: { input: { projectId } }
    });
    expect(listPlans.body.data.testPlans).toHaveLength(1);
    expect(listPlans.body.data.testPlans[0].testCases).toHaveLength(2);

    const updatePlan = await t.agent.post("/graphql").send({
      query: `mutation($input: UpdateTestPlanInput!) {
        updateTestPlan(input: $input) { testPlan { id name description } error { code } }
      }`,
      variables: { input: { id: testPlanId, name: "Plan 1 updated", description: "Updated" } }
    });
    expect(updatePlan.body.data.updateTestPlan.error).toBeNull();
    expect(updatePlan.body.data.updateTestPlan.testPlan.name).toBe("Plan 1 updated");

    const createRunWithPlan = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) {
        createTestRun(input: $input) { run { id testPlanId } error { code } }
      }`,
      variables: { input: { projectId, name: "Run from plan", testPlanId } }
    });
    expect(createRunWithPlan.body.data.createTestRun.error).toBeNull();
    expect(createRunWithPlan.body.data.createTestRun.run.testPlanId).toBe(testPlanId);
    const runWithPlanId = createRunWithPlan.body.data.createTestRun.run.id as string;

    const pendingAgg = await t.agent.post("/graphql").send({
      query: `query($input: RunAggregateInput!) {
        runAggregate(input: $input) { total notRun passed failed skipped blocked }
      }`,
      variables: { input: { runId: runWithPlanId } }
    });
    expect(pendingAgg.body.data.runAggregate.total).toBe(2);
    expect(pendingAgg.body.data.runAggregate.notRun).toBe(2);

    const runDetail = await t.agent.post("/graphql").send({
      query: `query($input: TestRunByInput!) {
        testRun(input: $input) { results { testCaseId status } }
      }`,
      variables: { input: { runId: runWithPlanId, projectId } }
    });
    expect(runDetail.body.data.testRun.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ testCaseId: manualId, status: "not_run" }),
        expect.objectContaining({ testCaseId: automatedId, status: "not_run" })
      ])
    );

    const createRunWithoutPlan = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) {
        createTestRun(input: $input) { run { id testPlanId } error { code } }
      }`,
      variables: { input: { projectId, name: "Run without plan" } }
    });
    expect(createRunWithoutPlan.body.data.createTestRun.error).toBeNull();
    expect(createRunWithoutPlan.body.data.createTestRun.run.testPlanId).toBeNull();

    const unlinkManual = await t.agent.post("/graphql").send({
      query: `mutation($input: UnlinkTestPlanTestCaseInput!) {
        unlinkTestPlanTestCase(input: $input) { success }
      }`,
      variables: { input: { testPlanId, testCaseId: manualId } }
    });
    expect(unlinkManual.body.data.unlinkTestPlanTestCase.success).toBe(true);

    const planDetail = await t.agent.post("/graphql").send({
      query: `query($input: TestPlanByInput!) {
        testPlan(input: $input) { id testCases { id } }
      }`,
      variables: { input: { id: testPlanId, projectId } }
    });
    expect(planDetail.body.data.testPlan.testCases).toHaveLength(1);

    const deletePlan = await t.agent.post("/graphql").send({
      query: `mutation($input: DeleteTestPlanInput!) {
        deleteTestPlan(input: $input) { success }
      }`,
      variables: { input: { id: testPlanId } }
    });
    expect(deletePlan.body.data.deleteTestPlan.success).toBe(true);

    await t.close();
  });

  it("accepts not-run status aliases when submitting a result", async () => {
    const t = await createTestAgent("tcms-plan-status-");

    const createProject = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } error { code } }
      }`,
      variables: { input: { name: "Plan status project" } }
    });
    const projectId = createProject.body.data.createProject.project.id as string;

    const createRequirement = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } error { code } }
      }`,
      variables: { input: { projectId, externalKey: "PLAN-REQ-S", title: "Plan req status" } }
    });
    const requirementId = createRequirement.body.data.createRequirement.requirement.id as string;

    const createManual = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } error { code } }
      }`,
      variables: {
        input: {
          projectId,
          title: "Manual status",
          requirementIds: [requirementId],
          steps: [{ name: "Step 1", expectedResult: "OK" }]
        }
      }
    });
    const manualId = createManual.body.data.createManualTestCase.testCase.id as string;

    const createRun = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) {
        createTestRun(input: $input) { run { id } error { code } }
      }`,
      variables: { input: { projectId, name: "Alias run" } }
    });
    const runId = createRun.body.data.createTestRun.run.id as string;

    const submitAliasSpaced = await t.agent.post("/graphql").send({
      query: `mutation($input: SubmitTestResultInput!) {
        submitTestResult(input: $input) { result { status } error { code message } }
      }`,
      variables: { input: { runId, testCaseId: manualId, status: "not run", durationMs: 0 } }
    });
    expect(submitAliasSpaced.body.data.submitTestResult.error).toBeNull();
    expect(submitAliasSpaced.body.data.submitTestResult.result.status).toBe("not_run");

    const submitAliasCamel = await t.agent.post("/graphql").send({
      query: `mutation($input: SubmitTestResultInput!) {
        submitTestResult(input: $input) { result { status } error { code message } }
      }`,
      variables: { input: { runId, testCaseId: manualId, status: "notRun", durationMs: 0 } }
    });
    expect(submitAliasCamel.body.data.submitTestResult.error).toBeNull();
    expect(submitAliasCamel.body.data.submitTestResult.result.status).toBe("not_run");

    await t.close();
  });
});
