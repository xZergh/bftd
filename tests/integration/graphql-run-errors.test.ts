import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL run errors", () => {
  it("surfaces AppError for missing run aggregate instead of masking as unexpected", async () => {
    const t = await createTestAgent("tcms-run-err-");
    try {
      const missingRunId = "00000000-0000-4000-8000-000000000099";
      const agg = await t.agent.post("/graphql").send({
        query: `query($input: RunAggregateInput!) {
          runAggregate(input: $input) { total }
        }`,
        variables: { input: { runId: missingRunId } }
      });

      expect(agg.body.errors?.[0]?.message).toBe("Test run not found.");
      expect(agg.body.errors?.[0]?.extensions?.code).toBe("ENTITY_NOT_FOUND");
      expect(agg.body.errors?.[0]?.extensions?.fixHint).toContain("valid run id");
    } finally {
      await t.close();
    }
  });
});
