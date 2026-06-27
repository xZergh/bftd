import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("graphql epics", () => {
  it("creates epics, assigns requirements, and clears links on epic delete", async () => {
    const t = await createTestAgent("epics-");
    try {
      const projectRes = await t.agent.post("/graphql").send({
        query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
        variables: { input: { name: "Epic project", key: "epic-proj" } }
      });
      const projectId = projectRes.body.data.createProject.project.id as string;

      const epicRes = await t.agent.post("/graphql").send({
        query: `mutation($input: CreateEpicInput!) {
          createEpic(input: $input) { epic { id externalKey title } error { code } }
        }`,
        variables: { input: { projectId, externalKey: "EPIC-CORE", title: "Core platform" } }
      });
      expect(epicRes.body.data.createEpic.error).toBeNull();
      const epicId = epicRes.body.data.createEpic.epic.id as string;

      const reqRes = await t.agent.post("/graphql").send({
        query: `mutation($input: CreateRequirementInput!) {
          createRequirement(input: $input) { requirement { id epicId epic { externalKey } } error { code } }
        }`,
        variables: {
          input: { projectId, externalKey: "REQ-1", title: "First req", epicId }
        }
      });
      expect(reqRes.body.data.createRequirement.error).toBeNull();
      expect(reqRes.body.data.createRequirement.requirement.epic.externalKey).toBe("EPIC-CORE");

      const countsRes = await t.agent.post("/graphql").send({
        query: `query($input: EpicsListInput!) {
          epics(input: $input) { externalKey requirementCount testCaseCount }
        }`,
        variables: { input: { projectId } }
      });
      expect(countsRes.body.data.epics[0]).toMatchObject({
        externalKey: "EPIC-CORE",
        requirementCount: 1,
        testCaseCount: 0
      });

      const listRes = await t.agent.post("/graphql").send({
        query: `query($input: RequirementsListInput!) {
          requirements(input: $input) { id epicId epic { externalKey title } }
        }`,
        variables: { input: { projectId } }
      });
      expect(listRes.body.data.requirements[0].epic.title).toBe("Core platform");

      const updateRes = await t.agent.post("/graphql").send({
        query: `mutation($input: UpdateRequirementInput!) {
          updateRequirement(input: $input) { requirement { epicId } error { code } }
        }`,
        variables: { input: { id: reqRes.body.data.createRequirement.requirement.id, epicId: null } }
      });
      expect(updateRes.body.data.updateRequirement.requirement.epicId).toBeNull();

      const deleteEpicRes = await t.agent.post("/graphql").send({
        query: `mutation($input: DeleteEpicInput!) { deleteEpic(input: $input) { success } }`,
        variables: { input: { id: epicId } }
      });
      expect(deleteEpicRes.body.data.deleteEpic.success).toBe(true);

      const epicsRes = await t.agent.post("/graphql").send({
        query: `query($input: EpicsListInput!) { epics(input: $input) { id } }`,
        variables: { input: { projectId } }
      });
      expect(epicsRes.body.data.epics).toEqual([]);
    } finally {
      await t.close();
    }
  });
});
