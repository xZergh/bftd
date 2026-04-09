import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL Explorer (GET /graphql)", () => {
  it("serves Explorer HTML for browser-style GET requests", async () => {
    const t = await createTestAgent("tcms-gql-explorer-");

    const res = await t.agent
      .get("/graphql")
      .set("Accept", "text/html,application/xhtml+xml")
      .expect(200);

    expect(res.text).toContain("TCMS GraphQL");
    expect(res.text).toMatch(/Explorer|graphql/i);

    await t.close();
  });
});
