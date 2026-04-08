import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - traceability", () => {
  it("captures run traceability snapshot and serves snapshot-backed report", async () => {
    const t = await createTestAgent("tcms-int-");

    const projectRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "App C" } }
    });
    const projectId = projectRes.body.data.createProject.project.id as string;

    const reqRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } }
      }`,
      variables: { input: { projectId, externalKey: "APP-1", title: "Req1" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    const manualRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } }
      }`,
      variables: {
        input: {
          projectId,
          title: "Manual 1",
          requirementIds: [requirementId],
          steps: [{ name: "Step 1", expectedResult: "OK" }]
        }
      }
    });
    const manualId = manualRes.body.data.createManualTestCase.testCase.id as string;

    const autoRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) {
        createAutomatedTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Auto 1", manualTestCaseIds: [manualId] } }
    });
    const autoId = autoRes.body.data.createAutomatedTestCase.testCase.id as string;
    expect(autoId).toBeTruthy();

    const runRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) {
        createTestRun(input: $input) { run { id } }
      }`,
      variables: { input: { projectId, name: "Run 1" } }
    });
    const runId = runRes.body.data.createTestRun.run.id as string;

    const reportBefore = await t.agent.post("/graphql").send({
      query: `query($input: RunTraceabilityReportInput!) {
        runTraceabilityReport(input: $input) {
          edges { requirementId manualTestCaseId automatedTestCaseId }
        }
      }`,
      variables: { input: { runId } }
    });
    expect(reportBefore.body.data.runTraceabilityReport.edges.length).toBe(1);

    await t.agent.post("/graphql").send({
      query: `mutation($input: SubmitTestResultInput!) {
        submitTestResult(input: $input) { result { status } }
      }`,
      variables: { input: { runId, testCaseId: autoId, status: "passed", durationMs: 1234 } }
    });

    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) {
        createAutomatedTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Auto 2", manualTestCaseIds: [manualId] } }
    });

    const reportAfter = await t.agent.post("/graphql").send({
      query: `query($input: RunTraceabilityReportInput!) {
        runTraceabilityReport(input: $input) {
          edges { requirementId manualTestCaseId automatedTestCaseId }
        }
      }`,
      variables: { input: { runId } }
    });
    expect(reportAfter.body.data.runTraceabilityReport.edges.length).toBe(1);

    const graphRes = await t.agent.post("/graphql").send({
      query: `query($input: TraceabilityGraphInput!) {
        traceabilityGraph(input: $input) {
          projectId
          nodes { id kind title }
          edges { id kind sourceId targetId }
          coverageByRequirementStatus { status requirementCount withManualLinkCount }
        }
      }`,
      variables: { input: { projectId } }
    });
    expect(graphRes.body.errors).toBeUndefined();
    const g = graphRes.body.data.traceabilityGraph;
    expect(g.projectId).toBe(projectId);
    expect(g.nodes.some((n: { id: string }) => n.id === `req:${requirementId}`)).toBe(true);
    expect(g.nodes.some((n: { id: string }) => n.id === `man:${manualId}`)).toBe(true);
    expect(g.nodes.some((n: { id: string }) => n.id === `auto:${autoId}`)).toBe(true);
    expect(g.edges.some((e: { kind: string }) => e.kind === "REQ_MANUAL")).toBe(true);
    expect(g.edges.some((e: { kind: string }) => e.kind === "MANUAL_AUTO")).toBe(true);
    const cov = g.coverageByRequirementStatus.find((r: { status: string }) => r.status === "draft");
    expect(cov?.withManualLinkCount).toBeGreaterThanOrEqual(1);

    const badGraph = await t.agent.post("/graphql").send({
      query: `query($input: TraceabilityGraphInput!) {
        traceabilityGraph(input: $input) { projectId }
      }`,
      variables: { input: { projectId: "missing-project-id" } }
    });
    expect(badGraph.body.errors?.[0]?.extensions?.code).toBe("ENTITY_NOT_FOUND");

    await t.close();
  });
});
