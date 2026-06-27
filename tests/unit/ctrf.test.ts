import { describe, expect, it } from "vitest";
import { outcomesFromCtrf, type CtrfReport } from "../../src/domain/automation/ctrf";

describe("CTRF report parsing", () => {
  it("maps CTRF tests to per-target outcomes by spec file path", () => {
    const report: CtrfReport = {
      reportFormat: "CTRF",
      results: {
        tool: { name: "playwright" },
        summary: { tests: 2, passed: 1, failed: 1, start: 1000, stop: 2500 },
        tests: [
          {
            name: "creates requirement",
            status: "passed",
            duration: 400,
            filePath: "e2e/fe-c.spec.ts",
            suite: "Requirements"
          },
          {
            name: "shows validation error",
            status: "failed",
            duration: 600,
            filePath: "e2e/fe-d.spec.ts",
            suite: "Test cases",
            message: "Expected button to be visible"
          }
        ]
      }
    };

    const outcomes = outcomesFromCtrf(report, [
      { testCaseId: "tc-1", externalId: "fe-c.spec.ts" },
      { testCaseId: "tc-2", externalId: "e2e/fe-d.spec.ts" }
    ]);

    expect(outcomes).toHaveLength(2);
    expect(outcomes[0]).toMatchObject({
      testCaseId: "tc-1",
      externalId: "e2e/fe-c.spec.ts",
      status: "passed",
      durationMs: 400,
      testName: "creates requirement",
      suite: "Requirements"
    });
    expect(outcomes[1]).toMatchObject({
      testCaseId: "tc-2",
      externalId: "e2e/fe-d.spec.ts",
      status: "failed",
      durationMs: 600,
      failureMessage: "Expected button to be visible",
      testName: "shows validation error"
    });
  });

  it("marks missing spec results as failed with runner error", () => {
    const outcomes = outcomesFromCtrf(
      null,
      [{ testCaseId: "tc-1", externalId: "fe-z.spec.ts" }],
      "Playwright exited with code 1"
    );

    expect(outcomes[0]).toMatchObject({
      status: "failed",
      failureMessage: "Playwright exited with code 1"
    });
  });
});
