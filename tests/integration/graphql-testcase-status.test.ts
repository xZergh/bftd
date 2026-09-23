import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - testcase status", () => {
  async function seedManual(t: Awaited<ReturnType<typeof createTestAgent>>) {
    const p = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "Status App" } }
    });
    const projectId = p.body.data.createProject.project.id as string;
    const r = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "ST-1", title: "Status req" } }
    });
    const requirementId = r.body.data.createRequirement.requirement.id as string;
    const tc = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id status } error { code message } }
      }`,
      variables: {
        input: { projectId, title: "Manual with status", requirementIds: [requirementId], steps: [{ name: "Step 1" }] }
      }
    });
    return { projectId, requirementId, tc };
  }

  it("defaults new manual testcases to draft", async () => {
    const t = await createTestAgent("tcms-int-");
    const { tc } = await seedManual(t);
    expect(tc.body.data.createManualTestCase.error).toBeNull();
    expect(tc.body.data.createManualTestCase.testCase.status).toBe("draft");
  });

  it("defaults TRR-imported automated testcases to draft", async () => {
    const t = await createTestAgent("tcms-int-");
    const { projectId, tc } = await seedManual(t);
    const manualId = tc.body.data.createManualTestCase.testCase.id as string;

    const imp = await t.agent.post("/graphql").send({
      query: `mutation($input: ImportAutomatedFromTrrInput!) {
        importAutomatedFromTrr(input: $input) { createdCount }
      }`,
      variables: {
        input: {
          projectId,
          automatedTests: [{ externalId: "AUTO-ST-1", title: "Imported", linkedManualCaseIds: [manualId], steps: [] }]
        }
      }
    });
    expect(imp.body.data.importAutomatedFromTrr.createdCount).toBe(1);

    const list = await t.agent.post("/graphql").send({
      query: `query($p: ID!) { testCases(input: { projectId: $p, type: "automated" }) { externalId status } }`,
      variables: { p: projectId }
    });
    expect(list.body.data.testCases.find((c: { externalId: string }) => c.externalId === "AUTO-ST-1").status).toBe(
      "draft"
    );
  });

  it("updates status and persists it through the list query", async () => {
    const t = await createTestAgent("tcms-int-");
    const { projectId, tc } = await seedManual(t);
    const id = tc.body.data.createManualTestCase.testCase.id as string;

    const upd = await t.agent.post("/graphql").send({
      query: `mutation($input: UpdateManualTestCaseInput!) {
        updateManualTestCase(input: $input) { testCase { id status } error { code message fixHint } }
      }`,
      variables: { input: { id, status: "ready" } }
    });
    expect(upd.body.data.updateManualTestCase.error).toBeNull();
    expect(upd.body.data.updateManualTestCase.testCase.status).toBe("ready");

    const list = await t.agent.post("/graphql").send({
      query: `query($p: ID!) { testCases(input: { projectId: $p }) { id status } }`,
      variables: { p: projectId }
    });
    expect(list.body.data.testCases.find((c: { id: string }) => c.id === id).status).toBe("ready");
  });

  it("rejects an unknown status with an actionable fixHint", async () => {
    const t = await createTestAgent("tcms-int-");
    const { tc } = await seedManual(t);
    const id = tc.body.data.createManualTestCase.testCase.id as string;

    const bad = await t.agent.post("/graphql").send({
      query: `mutation($input: UpdateManualTestCaseInput!) {
        updateManualTestCase(input: $input) { testCase { id } error { code message fixHint } }
      }`,
      variables: { input: { id, status: "totally-made-up" } }
    });
    expect(bad.body.data.updateManualTestCase.testCase).toBeNull();
    expect(bad.body.data.updateManualTestCase.error.code).toBe("VALIDATION_ERROR");
    // The hint must enumerate the allowed values so a client can self-correct.
    expect(bad.body.data.updateManualTestCase.error.fixHint).toContain("draft");
    expect(bad.body.data.updateManualTestCase.error.fixHint).toContain("ready");
    expect(bad.body.data.updateManualTestCase.error.fixHint).toContain("deprecated");
  });

  it("exposes testCaseStatuses via projectSettings", async () => {
    const t = await createTestAgent("tcms-int-");
    const { projectId } = await seedManual(t);
    const res = await t.agent.post("/graphql").send({
      query: `query($p: ID!) { projectSettings(input: { projectId: $p }) { testCaseStatuses } }`,
      variables: { p: projectId }
    });
    expect(res.body.data.projectSettings.testCaseStatuses).toEqual(["draft", "ready", "deprecated"]);
  });

  it("does not conflate status with the delete lifecycle", async () => {
    const t = await createTestAgent("tcms-int-");
    const { tc } = await seedManual(t);
    const id = tc.body.data.createManualTestCase.testCase.id as string;

    await t.agent.post("/graphql").send({
      query: `mutation($input: UpdateManualTestCaseInput!) {
        updateManualTestCase(input: $input) { testCase { status } }
      }`,
      variables: { input: { id, status: "deprecated" } }
    });
    const after = await t.agent.post("/graphql").send({
      query: `query($id: ID!) { testCase(input: { id: $id, includeDeleted: true }) { status isDeleted } }`,
      variables: { id }
    });
    // "deprecated" is an authoring state; the case is still very much not deleted.
    expect(after.body.data.testCase.status).toBe("deprecated");
    expect(after.body.data.testCase.isDeleted).toBe(false);
  });
});
