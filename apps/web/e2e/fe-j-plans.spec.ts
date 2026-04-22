import { expect, test } from "@playwright/test";

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
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(`Req ${suffix}`);
    await page.getByTestId("requirement-create-submit").click();

    await page.getByTestId("project-nav-test-cases").click();
    await page.getByTestId("testcase-create-type").selectOption("manual");
    await page.getByTestId("testcase-create-title").fill(manualTitle);
    await page.getByTestId(`testcase-create-manual-req-${reqKey}`).check();
    await page.getByTestId("testcase-create-manual-step-name-0").fill("Step 1");
    await page.getByTestId("testcase-create-submit").click();

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await page.getByTestId("project-nav-plans").click();
    await expect(page.getByTestId("plans-page")).toBeVisible();
    await page.getByTestId("plan-create-name").fill(planName);
    await page.getByTestId("plan-create-submit").click();
    const planRow = page.locator(`tr[data-testid="plan-row"]`).filter({ hasText: planName });
    await expect(planRow).toBeVisible();
    await planRow.getByTestId("plan-manage").click();
    await expect(page.getByTestId("plan-manage-panel")).toBeVisible();
    const planCaseCheckbox = page.getByTestId(`plan-case-${manualId}`);
    await planCaseCheckbox.click();
    await expect(planCaseCheckbox).toBeChecked({ timeout: 10000 });

    await page.getByTestId("project-nav-runs").click();
    await page.getByTestId("run-create-name").fill(runName);
    await page.getByTestId("run-create-test-plan-id").selectOption({ label: planName });
    await page.getByTestId("run-create-submit").click();

    await expect(page.getByTestId("run-row").filter({ hasText: runName })).toBeVisible();
  });
});
