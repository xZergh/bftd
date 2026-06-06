import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - purge archived projects", () => {
  it("purgeArchivedProjects removes archived projects and cascades data", async () => {
    const t = await createTestAgent("tcms-purge-");

    const activeRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id key } }
      }`,
      variables: { input: { name: "Active", key: "PURGE-ACTIVE" } }
    });
    expect(activeRes.body.data.createProject.project.key).toBe("purge-active");

    const archRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id key } }
      }`,
      variables: { input: { name: "Archived", key: "PURGE-ARCH" } }
    });
    const archivedId = archRes.body.data.createProject.project.id as string;

    await t.agent.post("/graphql").send({
      query: `mutation($input: ArchiveProjectInput!) {
        archiveProject(input: $input) { project { id isArchived } }
      }`,
      variables: { input: { id: archivedId, archived: true } }
    });

    const purgeRes = await t.agent.post("/graphql").send({
      query: `mutation {
        purgeArchivedProjects {
          deletedCount
          deletedProjectKeys
          error { code message }
        }
      }`
    });
    expect(purgeRes.body.data.purgeArchivedProjects.error).toBeNull();
    expect(purgeRes.body.data.purgeArchivedProjects.deletedCount).toBe(1);
    expect(purgeRes.body.data.purgeArchivedProjects.deletedProjectKeys).toEqual(["purge-arch"]);

    const listRes = await t.agent.post("/graphql").send({
      query: `query {
        projects(input: { includeArchived: true }) { key isArchived }
      }`
    });
    const keys = listRes.body.data.projects.map((p: { key: string }) => p.key);
    expect(keys).toContain("purge-active");
    expect(keys).not.toContain("purge-arch");

    await t.close();
  });
});
