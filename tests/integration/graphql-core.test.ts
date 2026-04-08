import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - core", () => {
  it("creates project and returns summary", async () => {
    const t = await createTestAgent("tcms-int-");

    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id name } error { code message fixHint } }
      }`,
      variables: { input: { name: "App A" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;
    expect(projectId).toBeTruthy();

    const sRes = await t.agent.post("/graphql").send({
      query: `query($input: ProjectSummaryInput!) {
        projectSummary(input: $input) { totalRequirements totalManualCases totalAutomatedCases }
      }`,
      variables: { input: { projectId } }
    });
    expect(sRes.body.data.projectSummary).toEqual({
      totalRequirements: 0,
      totalManualCases: 0,
      totalAutomatedCases: 0
    });

    await t.close();
  });

  it("lists requirements, test cases, and runs with optional release/sprint filters", async () => {
    const t = await createTestAgent("tcms-int-");

    const pRes = await t.agent.post("/graphql").send({
      query: `mutation { createProject(input: { name: "Catalog App" }) { project { id } } }`
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id externalKey } } }`,
      variables: {
        input: {
          projectId,
          externalKey: "REQ-A",
          title: "A",
          releaseLabel: "R1",
          sprintLabel: "S1"
        }
      }
    });
    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: {
        input: {
          projectId,
          externalKey: "REQ-B",
          title: "B",
          releaseLabel: "R2",
          sprintLabel: "S2"
        }
      }
    });

    const listAll = await t.agent.post("/graphql").send({
      query: `query($input: ProjectLabelFilterInput!) {
        requirements(input: $input) { id externalKey releaseLabel sprintLabel }
      }`,
      variables: { input: { projectId } }
    });
    expect(listAll.body.data.requirements).toHaveLength(2);

    const listR1 = await t.agent.post("/graphql").send({
      query: `query($input: ProjectLabelFilterInput!) {
        requirements(input: $input) { externalKey }
      }`,
      variables: { input: { projectId, releaseLabel: "R1", sprintLabel: "S1" } }
    });
    expect(listR1.body.data.requirements.map((r: { externalKey: string }) => r.externalKey)).toEqual(["REQ-A"]);

    const reqAId = listAll.body.data.requirements.find((r: { externalKey: string }) => r.externalKey === "REQ-A").id;
    await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) { createManualTestCase(input: $input) { testCase { id title releaseLabel } } }`,
      variables: {
        input: {
          projectId,
          title: "M1",
          requirementIds: [reqAId],
          releaseLabel: "R1",
          sprintLabel: "S1"
        }
      }
    });

    const casesManual = await t.agent.post("/graphql").send({
      query: `query($input: TestCasesQueryInput!) {
        testCases(input: $input) { title type }
      }`,
      variables: { input: { projectId, type: "manual" } }
    });
    expect(casesManual.body.data.testCases).toEqual([{ title: "M1", type: "manual" }]);

    await t.agent.post("/graphql").send({
      query: `mutation { createTestRun(input: { projectId: "${projectId}", name: "Run 1", releaseLabel: "R1", sprintLabel: "S1" }) { run { id } } }`
    });

    const runs = await t.agent.post("/graphql").send({
      query: `query($input: ProjectLabelFilterInput!) {
        testRuns(input: $input) { name releaseLabel sprintLabel }
      }`,
      variables: { input: { projectId, releaseLabel: "R1" } }
    });
    expect(runs.body.data.testRuns).toEqual([
      { name: "Run 1", releaseLabel: "R1", sprintLabel: "S1" }
    ]);

    await t.close();
  });

  it("returns deterministic fixHint for invalid manual testcase creation", async () => {
    const t = await createTestAgent("tcms-int-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "App B" } }
    });
    const projectId = pRes.body.data.createProject.project.id;

    const res = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) {
          testCase { id }
          error { code message fixHint }
        }
      }`,
      variables: { input: { projectId, title: "Manual bad", requirementIds: [] } }
    });

    expect(res.body.data.createManualTestCase.testCase).toBeNull();
    expect(res.body.data.createManualTestCase.error.code).toBe("REQUIREMENT_PARENT_REQUIRED");
    expect(res.body.data.createManualTestCase.error.fixHint).toContain("requirement id");
    await t.close();
  });
});
