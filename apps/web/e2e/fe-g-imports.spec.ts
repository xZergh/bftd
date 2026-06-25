import { expect, test } from "@playwright/test";
import { openEmptyImports, openEmptyRequirements } from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-G imports (DEMO-QA-EMPTY)", () => {
  test("requirements import: paste JSON array, assert created count", async ({ page }) => {
    const suffix = `${Date.now()}-a`;

    await openEmptyImports(page);

    const payload = JSON.stringify([{ externalKey: `IMP-${suffix}`, title: `Imported req ${suffix}` }]);
    await page.getByTestId("import-req-json").fill(payload);
    await page.getByTestId("import-req-submit").click();

    await expect(page.getByTestId("import-req-result-created")).toHaveText("1", { timeout: 10000 });
    await expect(page.getByTestId("import-req-result-updated")).toHaveText("0");
    await expect(page.getByTestId("import-req-result-skipped")).toHaveText("0");
    await expect(page.locator('[data-testid="import-errors-block"]')).toHaveCount(0);

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.locator(`tr[data-requirement-key="IMP-${suffix}"]`)).toBeVisible();
  });

  test("requirements import: mixed valid and invalid rows show error index", async ({ page }) => {
    const suffix = `${Date.now()}-b`;

    await openEmptyImports(page);

    const payload = JSON.stringify([
      { externalKey: `OK-${suffix}`, title: "Valid row" },
      { externalKey: `BAD-${suffix}`, title: "" }
    ]);
    await page.getByTestId("import-req-json").fill(payload);
    await page.getByTestId("import-req-submit").click();

    await expect(page.getByTestId("import-req-result-created")).toHaveText("1", { timeout: 10000 });
    await expect(page.getByTestId("import-req-result-skipped")).toHaveText("1");
    const errRow = page.locator('tr[data-testid="import-error-row"][data-import-error-index="1"]');
    await expect(errRow).toHaveCount(1);
    await expect(errRow.getByTestId("import-error-index")).toHaveText("1");
    await expect(errRow.locator("code")).toContainText("INVALID_IMPORT_SCHEMA");
  });

  test("invalid JSON shows parse error", async ({ page }) => {
    await openEmptyImports(page);

    await page.getByTestId("import-req-json").fill("[ not json");
    await page.getByTestId("import-req-submit").click();
    await expect(page.getByTestId("import-req-parse-error")).toContainText("Invalid JSON");
  });

  test("design links import after requirement exists", async ({ page }) => {
    const suffix = `${Date.now()}-d`;
    const reqKey = `REQ-${suffix}`;

    await openEmptyRequirements(page);
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(`Requirement ${suffix}`);
    await page.getByTestId("requirement-create-submit").click();
    await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

    await page.getByTestId("project-nav-imports").click();
    await page.getByTestId("import-tab-design").click();

    await page.getByTestId("import-design-provider").fill("penpot");
    const linkPayload = JSON.stringify([
      {
        requirementKey: reqKey,
        shareUrl: `https://design.example/penpot/${suffix}`,
        title: `Imported link ${suffix}`
      }
    ]);
    await page.getByTestId("import-design-json").fill(linkPayload);
    await page.getByTestId("import-design-submit").click();

    await expect(page.getByTestId("import-design-result")).toBeVisible({ timeout: 10000 });
    const createdNum = Number.parseInt((await page.getByTestId("import-design-result-created").textContent()) ?? "0", 10);
    const updatedNum = Number.parseInt((await page.getByTestId("import-design-result-updated").textContent()) ?? "0", 10);
    expect(createdNum + updatedNum).toBeGreaterThanOrEqual(1);
    await expect(page.getByTestId("import-panel-design").locator('[data-testid="import-errors-block"]')).toHaveCount(0);
  });
});
