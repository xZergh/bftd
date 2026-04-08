import { describe, expect, it } from "vitest";
import { createTestService } from "../helpers/test-service";

describe("TcmsService", () => {
  it("blocks manual testcase without requirement parent", async () => {
    const { service } = createTestService("tcms-unit-");
    const p = await service.createProject("Demo App");

    await expect(
      service.createManualTestCase({
        projectId: p.id,
        title: "Manual case",
        requirementIds: [],
        steps: [{ name: "Step 1" }]
      })
    ).rejects.toMatchObject({
      code: "REQUIREMENT_PARENT_REQUIRED"
    });
  });

  it("blocks automated testcase without manual links", async () => {
    const { service } = createTestService("tcms-unit-");
    const p = await service.createProject("Demo App");

    await expect(
      service.createAutomatedTestCase({
        projectId: p.id,
        title: "Automated case",
        manualTestCaseIds: []
      })
    ).rejects.toMatchObject({
      code: "MANUAL_LINK_REQUIRED"
    });
  });
});
