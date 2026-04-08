import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - traceability link mutations", () => {
  it("links and unlinks requirement↔manual and automated↔manual with version history", async () => {
    const t = await createTestAgent("tcms-trace-links-");

    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "Trace Link App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const r1 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "TL-1", title: "Req 1" } }
    });
    const r2 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "TL-2", title: "Req 2" } }
    });
    const req1 = r1.body.data.createRequirement.requirement.id as string;
    const req2 = r2.body.data.createRequirement.requirement.id as string;

    const m1 = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) { createManualTestCase(input: $input) { testCase { id } } }`,
      variables: {
        input: { projectId, title: "Manual TL", requirementIds: [req1], steps: [{ name: "A" }] }
      }
    });
    const manualId = m1.body.data.createManualTestCase.testCase.id as string;

    const link2 = await t.agent.post("/graphql").send({
      query: `mutation($input: LinkRequirementManualInput!) {
        linkRequirementManualTestCase(input: $input) { linked }
      }`,
      variables: { input: { projectId, requirementId: req2, manualTestCaseId: manualId } }
    });
    expect(link2.body.data.linkRequirementManualTestCase.linked).toBe(true);

    const auto = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) {
        createAutomatedTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Auto TL", manualTestCaseIds: [manualId] } }
    });
    const autoId = auto.body.data.createAutomatedTestCase.testCase.id as string;

    const unlinkAuto = await t.agent.post("/graphql").send({
      query: `mutation($input: UnlinkAutomatedManualInput!) {
        unlinkAutomatedManualTestCase(input: $input) { success }
      }`,
      variables: { input: { automatedTestCaseId: autoId, manualTestCaseId: manualId } }
    });
    expect(unlinkAuto.body.data.unlinkAutomatedManualTestCase.success).toBe(true);

    const linkAuto = await t.agent.post("/graphql").send({
      query: `mutation($input: LinkAutomatedManualInput!) {
        linkAutomatedManualTestCase(input: $input) { linked }
      }`,
      variables: { input: { projectId, automatedTestCaseId: autoId, manualTestCaseId: manualId } }
    });
    expect(linkAuto.body.data.linkAutomatedManualTestCase.linked).toBe(true);

    const unlinkReq = await t.agent.post("/graphql").send({
      query: `mutation($input: UnlinkRequirementManualInput!) {
        unlinkRequirementManualTestCase(input: $input) { success }
      }`,
      variables: { input: { requirementId: req2, manualTestCaseId: manualId } }
    });
    expect(unlinkReq.body.data.unlinkRequirementManualTestCase.success).toBe(true);

    const hist = await t.agent.post("/graphql").send({
      query: `query($input: TestCaseVersionHistoryInput!) {
        testCaseVersionHistory(input: $input) { versionSeq requirementIds manualTestCaseIds }
      }`,
      variables: { input: { testCaseId: manualId } }
    });
    const versions = hist.body.data.testCaseVersionHistory as Array<{
      versionSeq: number;
      requirementIds: string[];
      manualTestCaseIds: string[];
    }>;
    expect(versions.length).toBeGreaterThanOrEqual(3);

    await t.close();
  });
});
