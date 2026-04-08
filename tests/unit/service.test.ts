import { describe, expect, it } from "vitest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createDb } from "../../src/db/client";
import { initSqlite } from "../../src/db/init";
import { TcmsService } from "../../src/domain/service";

function createService() {
  const dir = mkdtempSync(join(tmpdir(), "tcms-unit-"));
  const dbPath = join(dir, "db.sqlite");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);
  return { service, dir };
}

describe("TcmsService", () => {
  it("blocks manual testcase without requirement parent", async () => {
    const { service } = createService();
    const p = await service.createProject("Demo App");

    await expect(
      service.createManualTestCase({
        projectId: p.id,
        title: "Manual case",
        requirementIds: []
      })
    ).rejects.toMatchObject({
      code: "REQUIREMENT_PARENT_REQUIRED"
    });
  });

  it("blocks automated testcase without manual links", async () => {
    const { service } = createService();
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
