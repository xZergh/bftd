import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - imports", () => {
  it("imports Agile requirements with idempotent upsert", async () => {
    const t = await createTestAgent("tcms-int-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "Import App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const payload = {
      query: `mutation($input: ImportRequirementsInput!) {
        importRequirements(input: $input) { createdCount updatedCount skippedCount warnings { index } }
      }`,
      variables: {
        input: {
          projectId,
          requirements: [
            { externalKey: "APP-10", title: "Req 10", description: "A" },
            { externalKey: "APP-11", title: "Req 11" }
          ]
        }
      }
    };
    const first = await t.agent.post("/graphql").send(payload);
    expect(first.body.data.importRequirements.createdCount).toBe(2);
    expect(first.body.data.importRequirements.warnings.length).toBe(1);
    const second = await t.agent.post("/graphql").send(payload);
    expect(second.body.data.importRequirements.createdCount).toBe(0);
    expect(second.body.data.importRequirements.updatedCount).toBe(2);
    await t.close();
  });

  it("imports TRR automated tests with identity fallback and deterministic errors", async () => {
    const t = await createTestAgent("tcms-int-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "TRR App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;
    const reqRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) { createRequirement(input: $input) { requirement { id } } }`,
      variables: { input: { projectId, externalKey: "REQ-1", title: "Req 1" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;
    const manualRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) { createManualTestCase(input: $input) { testCase { id } } }`,
      variables: { input: { projectId, title: "Manual for TRR", requirementIds: [requirementId] } }
    });
    const manualId = manualRes.body.data.createManualTestCase.testCase.id as string;

    const mutation = `mutation($input: ImportAutomatedFromTrrInput!) {
      importAutomatedFromTrr(input: $input) { createdCount updatedCount skippedCount errors { code } }
    }`;

    const invalid = await t.agent.post("/graphql").send({
      query: mutation,
      variables: {
        input: { projectId, automatedTests: [{ title: "Missing identity", linkedManualCaseIds: [manualId], steps: [] }] }
      }
    });
    expect(invalid.body.data.importAutomatedFromTrr.errors[0].code).toBe("TRR_IMPORT_INVALID");

    const first = await t.agent.post("/graphql").send({
      query: mutation,
      variables: {
        input: {
          projectId,
          automatedTests: [
            {
              externalId: "AUTO-EXT-1",
              title: "Imported Auto",
              linkedManualCaseIds: [manualId],
              steps: [{ order: 1, name: "Open page", expectedResult: "Loaded" }]
            }
          ]
        }
      }
    });
    expect(first.body.data.importAutomatedFromTrr.createdCount).toBe(1);

    const second = await t.agent.post("/graphql").send({
      query: mutation,
      variables: {
        input: {
          projectId,
          automatedTests: [
            {
              externalId: "AUTO-EXT-1",
              title: "Imported Auto v2",
              linkedManualCaseIds: [manualId],
              steps: [{ order: 1, name: "Open page v2", expectedResult: "Loaded v2" }]
            }
          ]
        }
      }
    });
    expect(second.body.data.importAutomatedFromTrr.updatedCount).toBe(1);
    await t.close();
  });
});
