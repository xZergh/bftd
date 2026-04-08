import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - Phase A reads and project lifecycle", () => {
  it("lists projects, resolves by key, archives, and reads requirements/testcases/runs", async () => {
    const t = await createTestAgent("tcms-phase-a-");

    const create = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id key name isArchived } error { code } }
      }`,
      variables: { input: { name: "Phase A Project", key: "phase-a" } }
    });
    expect(create.body.data.createProject.error).toBeNull();
    const projectId = create.body.data.createProject.project.id as string;
    const projectKey = create.body.data.createProject.project.key as string;
    expect(projectKey).toBe("phase-a");

    const list = await t.agent.post("/graphql").send({
      query: `query { projects(input: {}) { id key name } }`
    });
    expect(list.body.data.projects.some((p: { id: string }) => p.id === projectId)).toBe(true);

    const byKey = await t.agent.post("/graphql").send({
      query: `query($input: ProjectByInput!) { project(input: $input) { id key } }`,
      variables: { input: { key: "phase-a" } }
    });
    expect(byKey.body.data.project.id).toBe(projectId);

    const reqRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id externalKey } error { code } }
      }`,
      variables: { input: { projectId, externalKey: "PA-1", title: "Requirement 1" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } error { code } }
      }`,
      variables: {
        input: {
          projectId,
          title: "Manual PA",
          requirementIds: [requirementId],
          steps: [{ name: "Do", expectedResult: "Done" }]
        }
      }
    });

    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) {
        createTestRun(input: $input) { run { id name environment } error { code } }
      }`,
      variables: {
        input: { projectId, name: "Run A", environment: "ci", buildVersion: "1.0.0", trigger: "manual" }
      }
    });

    const reqs = await t.agent.post("/graphql").send({
      query: `query($input: RequirementsListInput!) {
        requirements(input: $input) { id externalKey tags }
      }`,
      variables: { input: { projectId } }
    });
    expect(reqs.body.data.requirements.length).toBe(1);

    const cases = await t.agent.post("/graphql").send({
      query: `query($input: TestCasesListInput!) {
        testCases(input: $input) { id type title steps { name } }
      }`,
      variables: { input: { projectId, type: "manual" } }
    });
    expect(cases.body.data.testCases.length).toBe(1);
    expect(cases.body.data.testCases[0].steps.length).toBeGreaterThanOrEqual(1);

    const runs = await t.agent.post("/graphql").send({
      query: `query($input: TestRunsListInput!) { testRuns(input: $input) { id name environment } }`,
      variables: { input: { projectId } }
    });
    expect(runs.body.data.testRuns.length).toBe(1);
    expect(runs.body.data.testRuns[0].environment).toBe("ci");

    const runId = runs.body.data.testRuns[0].id as string;
    const runDetail = await t.agent.post("/graphql").send({
      query: `query($input: TestRunByInput!) {
        testRun(input: $input) { run { id } results { id } }
      }`,
      variables: { input: { runId } }
    });
    expect(runDetail.body.data.testRun.run.id).toBe(runId);
    expect(runDetail.body.data.testRun.results.length).toBe(0);

    const agg = await t.agent.post("/graphql").send({
      query: `query($input: RunAggregateInput!) {
        runAggregate(input: $input) { total passRatePct }
      }`,
      variables: { input: { runId } }
    });
    expect(agg.body.data.runAggregate.total).toBe(0);

    await t.agent.post("/graphql").send({
      query: `mutation($input: ArchiveProjectInput!) {
        archiveProject(input: $input) { project { isArchived } error { code } }
      }`,
      variables: { input: { id: projectId, archived: true } }
    });

    const listed = await t.agent.post("/graphql").send({
      query: `query { projects(input: {}) { id } }`
    });
    expect(listed.body.data.projects.some((p: { id: string }) => p.id === projectId)).toBe(false);

    const listedAll = await t.agent.post("/graphql").send({
      query: `query { projects(input: { includeArchived: true }) { id isArchived } }`
    });
    const archived = listedAll.body.data.projects.find((p: { id: string }) => p.id === projectId);
    expect(archived?.isArchived).toBe(true);

    await t.close();
  });
});
