import { expect, test } from "@playwright/test";
import { createManualTestCase, openEmptyRequirements, openEmptyTestCases } from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-I version history (DEMO-QA-EMPTY)", () => {
  test("history renders for a testcase; new version after title save", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const reqKey = `REQ-${suffix}`;
    const manualTitle = `Manual TC ${suffix}`;
    const stepName = `Step one ${suffix}`;
    const manualTitleV2 = `${manualTitle} v2`;

    await openEmptyRequirements(page);
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(`Requirement ${suffix}`);
    await page.getByTestId("requirement-create-submit").click();
    await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

    await openEmptyTestCases(page);
    await createManualTestCase(page, {
      title: manualTitle,
      reqKey,
      stepName
    });

    const manualRow = page.locator('[data-testid="testcase-row"]').filter({ hasText: manualTitle });
    await manualRow.getByTestId("testcase-open").click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();

    const history = page.getByTestId("testcase-version-history");
    await expect(history).toBeVisible();
    const rows = page.getByTestId("testcase-version-row");
    await expect(rows.first()).toBeVisible();
    await expect(rows).toHaveCount(1);

    await page.getByTestId("testcase-edit-title").fill(manualTitleV2);
    await expect(page.getByTestId("form-save-status")).toHaveAttribute("data-save-state", "saved", {
      timeout: 20_000
    });

    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0).getByTestId("testcase-version-title")).toHaveText(manualTitleV2);
    await expect(rows.nth(0).getByTestId("testcase-version-seq")).toHaveText("2");
    await expect(rows.nth(1).getByTestId("testcase-version-title")).toHaveText(manualTitle);
    await expect(rows.nth(1).getByTestId("testcase-version-seq")).toHaveText("1");
  });
});
