import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - core", () => {
  it("creates project and returns summary", async () => {
    const t = await createTestAgent("tcms-int-");

    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id key name } error { code message fixHint } }
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
      variables: {
        input: { projectId, title: "Manual bad", requirementIds: [], steps: [{ name: "S1" }] }
      }
    });

    expect(res.body.data.createManualTestCase.testCase).toBeNull();
    expect(res.body.data.createManualTestCase.error.code).toBe("REQUIREMENT_PARENT_REQUIRED");
    expect(res.body.data.createManualTestCase.error.fixHint).toContain("requirement id");
    await t.close();
  });
});
