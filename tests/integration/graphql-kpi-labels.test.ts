import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - KPI and labels", () => {
  it("returns formula-driven KPI dashboard with metadata alignment", async () => {
    const t = await createTestAgent("tcms-int-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "KPI App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const req1 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "R-1", title: "Req 1" } }
    });
    const req2 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "R-2", title: "Req 2" } }
    });
    const reqId1 = req1.body.data.createRequirement.requirement.id as string;
    const reqId2 = req2.body.data.createRequirement.requirement.id as string;

    const m1 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) { createManualTestCase(input: $input) { testCase { id } } }`,
      variables: {
        input: { projectId, title: "Manual 1", requirementIds: [reqId1], steps: [{ name: "S1" }] }
      }
    });
    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) { createManualTestCase(input: $input) { testCase { id } } }`,
      variables: {
        input: { projectId, title: "Manual 2", requirementIds: [reqId2], steps: [{ name: "S1" }] }
      }
    });
    const manual1 = m1.body.data.createManualTestCase.testCase.id as string;

    const auto = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) { createAutomatedTestCase(input: $input) { testCase { id } } }`,
      variables: { input: { projectId, title: "Auto KPI", manualTestCaseIds: [manual1] } }
    });
    const autoId = auto.body.data.createAutomatedTestCase.testCase.id as string;

    const run = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) { createTestRun(input: $input) { run { id } } }`,
      variables: { input: { projectId, name: "KPI Run" } }
    });
    const runId = run.body.data.createTestRun.run.id as string;
    await t.agent.post("/graphql").send({
      query: `mutation($input: SubmitTestResultInput!) { submitTestResult(input: $input) { result { id } } }`,
      variables: { input: { runId, testCaseId: autoId, status: "passed", durationMs: 50 } }
    });

    const dash = await t.agent.post("/graphql").send({
      query: `query($input: KpiDashboardInput!) {
        kpiDashboard(input: $input) {
          projectId
          coverageFormulaInfo { formulaId }
          current { totalRequirements totalManualCases totalTestRuns coverage { formulaId } }
        }
      }`,
      variables: { input: { projectId } }
    });
    expect(dash.body.data.kpiDashboard.projectId).toBe(projectId);
    expect(dash.body.data.kpiDashboard.current.totalRequirements).toBe(2);
    expect(dash.body.data.kpiDashboard.current.totalManualCases).toBe(2);
    expect(dash.body.data.kpiDashboard.current.totalTestRuns).toBe(1);
    expect(dash.body.data.kpiDashboard.current.coverage.length).toBe(4);
    await t.close();
  });

  it("supports release/sprint labels and summary filtering", async () => {
    const t = await createTestAgent("tcms-int-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "Labels App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const req1 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "LBL-1", title: "Req 1", releaseLabel: "R1", sprintLabel: "S1" } }
    });
    const req2 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "LBL-2", title: "Req 2", releaseLabel: "R2", sprintLabel: "S2" } }
    });

    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) { createManualTestCase(input: $input) { testCase { id } } }`,
      variables: {
        input: {
          projectId,
          title: "Manual R1S1",
          requirementIds: [req1.body.data.createRequirement.requirement.id],
          steps: [{ name: "S1" }],
          releaseLabel: "R1",
          sprintLabel: "S1"
        }
      }
    });
    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) { createManualTestCase(input: $input) { testCase { id } } }`,
      variables: {
        input: {
          projectId,
          title: "Manual R2S2",
          requirementIds: [req2.body.data.createRequirement.requirement.id],
          steps: [{ name: "S1" }],
          releaseLabel: "R2",
          sprintLabel: "S2"
        }
      }
    });

    const summaryFiltered = await t.agent.post("/graphql").send({
      query: `query($input: ProjectSummaryInput!) {
        projectSummary(input: $input) { totalRequirements totalManualCases totalAutomatedCases }
      }`,
      variables: { input: { projectId, releaseLabel: "R1", sprintLabel: "S1" } }
    });
    expect(summaryFiltered.body.data.projectSummary.totalRequirements).toBe(1);
    expect(summaryFiltered.body.data.projectSummary.totalManualCases).toBe(1);
    await t.close();
  });
});
