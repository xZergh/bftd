import { expect, test } from "@playwright/test";

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
    await page.getByTestId("project-create-name").fill(projectName);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-open").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(reqTitle);
    await page.getByTestId("requirement-create-submit").click();
    const rrow = page.locator(`tr[data-requirement-key="${reqKey}"]`);
    await expect(rrow).toBeVisible();

    await page.getByTestId("project-nav-project").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    await page.getByTestId("testcase-create-manual-title").fill(manualTitle);
    await page.getByTestId(`testcase-create-manual-req-${reqKey}`).check();
    await page.getByTestId("testcase-create-manual-step-name-0").fill(stepName);
    await page.getByTestId("testcase-create-manual-submit").click();

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
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
