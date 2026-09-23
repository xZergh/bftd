import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - design links", () => {
  it("supports Penpot requirement link upsert/query/import idempotency", async () => {
    const t = await createTestAgent("tcms-int-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "Penpot App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;
    const reqRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id externalKey } }
      }`,
      variables: { input: { projectId, externalKey: "PEN-1", title: "Pen Req" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    const upsertQuery = `mutation($input: RequirementDesignLinkInput!) {
      upsertRequirementDesignLink(input: $input) {
        link { id requirementId provider shareUrl title }
        error { code message fixHint }
      }
    }`;
    const linkInput = {
      projectId,
      requirementId,
      provider: "penpot",
      designProjectId: "penpot-proj-1",
      designFileId: "file-1",
      designPageId: "page-1",
      designNodeId: "node-1",
      shareUrl: "https://design.example/penpot/file-1?page=page-1&node=node-1",
      title: "Login screen"
    };

    const first = await t.agent.post("/graphql").send({ query: upsertQuery, variables: { input: linkInput } });
    const firstId = first.body.data.upsertRequirementDesignLink.link.id as string;
    const second = await t.agent
      .post("/graphql")
      .send({ query: upsertQuery, variables: { input: { ...linkInput, title: "Login screen v2" } } });
    expect(second.body.data.upsertRequirementDesignLink.link.id).toBe(firstId);
    expect(second.body.data.upsertRequirementDesignLink.link.title).toBe("Login screen v2");

    const qRes = await t.agent.post("/graphql").send({
      query: `query($input: RequirementDesignLinksQueryInput!) {
        requirementDesignLinks(input: $input) { id requirementId provider shareUrl title }
      }`,
      variables: { input: { projectId, requirementId } }
    });
    expect(qRes.body.data.requirementDesignLinks.length).toBe(1);

    const importRes = await t.agent.post("/graphql").send({
      query: `mutation($input: ImportRequirementDesignLinksInput!) {
        importRequirementDesignLinks(input: $input) { createdCount updatedCount skippedCount }
      }`,
      variables: {
        input: {
          projectId,
          provider: "penpot",
          links: [
            {
              requirementKey: "PEN-1",
              designProjectId: "penpot-proj-1",
              designFileId: "file-1",
              designPageId: "page-1",
              designNodeId: "node-1",
              shareUrl: "https://design.example/penpot/file-1?page=page-1&node=node-1",
              title: "Login screen import"
            }
          ]
        }
      }
    });
    expect(importRes.body.data.importRequirementDesignLinks.createdCount).toBe(0);
    expect(importRes.body.data.importRequirementDesignLinks.updatedCount).toBe(1);

    const invalidProvider = await t.agent.post("/graphql").send({
      query: upsertQuery,
      variables: { input: { ...linkInput, provider: "figma-free" } }
    });
    expect(invalidProvider.body.data.upsertRequirementDesignLink.error.code).toBe("VALIDATION_ERROR");
    await t.close();
  });
});

describe("GraphQL integration - figma design provider", () => {
  it("accepts provider 'figma' and rejects unknown providers", async () => {
    const t = await createTestAgent("tcms-int-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "Figma Pilot App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;
    const reqRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } }
      }`,
      variables: { input: { projectId, externalKey: "FIG-1", title: "Figma Req" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    const upsertQuery = `mutation($input: RequirementDesignLinkInput!) {
      upsertRequirementDesignLink(input: $input) {
        link { id provider designNodeId shareUrl }
        error { code message fixHint }
      }
    }`;

    const ok = await t.agent.post("/graphql").send({
      query: upsertQuery,
      variables: {
        input: {
          projectId,
          requirementId,
          provider: "figma",
          designFileId: "eBcz4f34xUVWCVoT7J9ILx",
          designNodeId: "4342:9188",
          shareUrl: "https://www.figma.com/design/eBcz4f34xUVWCVoT7J9ILx/Shifts-Breakdown?node-id=4342-9188",
          title: "UI Components"
        }
      }
    });
    expect(ok.body.data.upsertRequirementDesignLink.error).toBeNull();
    expect(ok.body.data.upsertRequirementDesignLink.link.provider).toBe("figma");
    expect(ok.body.data.upsertRequirementDesignLink.link.designNodeId).toBe("4342:9188");

    const bad = await t.agent.post("/graphql").send({
      query: upsertQuery,
      variables: {
        input: {
          projectId,
          requirementId,
          provider: "sketch",
          shareUrl: "https://example.com/x",
          title: "Nope"
        }
      }
    });
    expect(bad.body.data.upsertRequirementDesignLink.link).toBeNull();
    expect(bad.body.data.upsertRequirementDesignLink.error.code).toBe("VALIDATION_ERROR");
    expect(bad.body.data.upsertRequirementDesignLink.error.fixHint).toContain("figma");
  });
});
