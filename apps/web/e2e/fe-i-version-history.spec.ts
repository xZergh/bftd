import { expect, test } from "@playwright/test";
import { createManualTestCaseOnListPage, createRequirementOnListPage } from "./helpers/workspace";

test.describe.configure({ mode: "serial" });

test.describe("FE-I version history", () => {
  test("history renders for a testcase; new version after title save", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectName = `FE-I ${suffix}`;
    const projectKey = `fe-i-${suffix}`;
    const reqKey = `REQ-${suffix}`;
    const reqTitle = `Requirement ${suffix}`;
    const manualTitle = `Manual TC ${suffix}`;
    const stepName = `Step one ${suffix}`;
    const manualTitleV2 = `${manualTitle} v2`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(projectName);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();
    await createRequirementOnListPage(page, { key: reqKey, title: reqTitle });

    await page.getByTestId("project-nav-overview").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    await createManualTestCaseOnListPage(page, { title: manualTitle, reqKey, stepName });

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    await manualRow.click();
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
