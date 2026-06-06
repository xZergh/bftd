import { expect, test } from "@playwright/test";
import { DEMO, expectDemoPlanSeeded, openDemoPlans, openDemoRuns, openDemoTestCases } from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-J plans (DEMO-QA)", () => {
  test("seeded demo regression plan appears in DEMO-QA table", async ({ page }) => {
    await openDemoPlans(page);
    await expectDemoPlanSeeded(page);
    await expect(page.locator('[data-testid="plan-row"]')).toHaveCount(1);
  });

  test("create plan, link testcase, and create run with selected plan", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const planName = `Plan ${suffix}`;
    const runName = `Run ${suffix}`;

    await openDemoTestCases(page);
    const manualRow = page.locator('[data-testid="testcase-row"]').filter({ hasText: DEMO.manualTitles.login });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await page.getByTestId("project-nav-plans").click();
    await expect(page.getByTestId("plans-page")).toBeVisible();
    await page.getByTestId("plan-create-name").fill(planName);
    await page.getByTestId("plan-create-submit").click();
    const planRow = page.locator('[data-testid="plan-row"]').filter({ hasText: planName });
    await expect(planRow).toBeVisible();
    await planRow.click();
    await expect(page.getByTestId("plan-manage-panel")).toBeVisible();
    const planCaseCheckbox = page.getByTestId(`plan-case-${manualId}`);
    await planCaseCheckbox.click();
    await expect(planCaseCheckbox).toBeChecked({ timeout: 10000 });

    await openDemoRuns(page);
    await page.getByTestId("run-create-name").fill(runName);
    await page.getByTestId("run-create-test-plan-id").selectOption({ label: planName });
    await page.getByTestId("run-create-submit").click();

    await expect(page.getByTestId("run-row").filter({ hasText: runName })).toBeVisible();
  });
});
