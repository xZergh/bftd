import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("HTTP API docs (OpenAPI + Swagger UI)", () => {
  it("serves OpenAPI document and Swagger UI", async () => {
    const t = await createTestAgent("tcms-docs-");

    const yamlRes = await t.agent.get("/openapi.yaml").expect(200);
    expect(yamlRes.text).toContain("openapi:");
    expect(yamlRes.text).toContain("/graphql");

    const ui = await t.agent.get("/api-docs").expect(200);
    expect(ui.text).toContain("swagger-ui");
    expect(ui.text).toContain("/openapi.yaml");

    const uiAlt = await t.agent.get("/swagger").expect(200);
    expect(uiAlt.text).toContain("swagger-ui");

    await t.close();
  });
});
