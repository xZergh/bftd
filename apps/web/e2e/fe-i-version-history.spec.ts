import { expect, test } from "@playwright/test";
import { DEMO, createDemoManualTestCase, openDemoTestCases } from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-I version history (DEMO-QA)", () => {
  test("history renders for a testcase; new version after title save", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const manualTitle = `Manual TC ${suffix}`;
    const stepName = `Step one ${suffix}`;
    const manualTitleV2 = `${manualTitle} v2`;

    await openDemoTestCases(page);
    await createDemoManualTestCase(page, {
      title: manualTitle,
      reqKey: DEMO.requirements.R2,
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
