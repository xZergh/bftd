import { expect, test } from "@playwright/test";
import { createManualTestCaseOnListPage, createPlanOnListPage, createRequirementOnListPage, createRunOnListPage } from "./helpers/workspace";

test.describe("FE-J plans", () => {
  test("create plan, link testcase, and create run with selected plan", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-j-${suffix}`;
    const reqKey = `REQ-${suffix}`;
    const manualTitle = `Manual ${suffix}`;
    const planName = `Plan ${suffix}`;
    const runName = `Run ${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(`FE-J ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-name-link").click();

    await page.getByTestId("project-nav-requirements").click();
    await createRequirementOnListPage(page, { key: reqKey, title: `Req ${suffix}` });

    await page.getByTestId("project-nav-test-cases").click();
    await createManualTestCaseOnListPage(page, { title: manualTitle, reqKey, stepName: "Step 1" });

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await page.getByTestId("project-nav-plans").click();
    await expect(page.getByTestId("plans-page")).toBeVisible();
    await createPlanOnListPage(page, { name: planName });
    const planRow = page.locator(`tr[data-testid="plan-row"]`).filter({ hasText: planName });
    await expect(planRow).toBeVisible();
    await planRow.click();
    await expect(page.getByTestId("plan-manage-panel")).toBeVisible();
    const planCaseCheckbox = page.getByTestId(`plan-case-member-${manualId}`);
    await planCaseCheckbox.click();
    await expect(planCaseCheckbox).toBeChecked({ timeout: 10000 });

    await page.getByTestId("project-nav-runs").click();
    await createRunOnListPage(page, { name: runName, planName });

    await expect(page.getByTestId("run-detail-page")).toBeVisible();
    await expect(page.getByTestId("run-detail-name")).toHaveText(runName);
  });
});
