import { expect, test } from "@playwright/test";
import {
  createManualTestCase,
  expectDemoPlanSeeded,
  openDemoPlans,
  openEmptyPlans,
  openEmptyRequirements,
  openEmptyRuns,
  openEmptyTestCases
} from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-J plans (DEMO-QA)", () => {
  test("seeded demo regression plan appears in DEMO-QA table", async ({ page }) => {
    await openDemoPlans(page);
    await expectDemoPlanSeeded(page);
    await expect(page.locator('[data-testid="plan-row"]')).toHaveCount(1);
  });
});

test.describe("FE-J plans (DEMO-QA-EMPTY)", () => {
  test("create plan, link testcase, and create run with selected plan", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const reqKey = `REQ-${suffix}`;
    const planName = `Plan ${suffix}`;
    const runName = `Run ${suffix}`;
    const manualTitle = `Manual ${suffix}`;
    const stepName = `Step ${suffix}`;

    await openEmptyRequirements(page);
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(`Requirement ${suffix}`);
    await page.getByTestId("requirement-create-submit").click();
    await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

    await openEmptyTestCases(page);
    const { manualId } = await createManualTestCase(page, { title: manualTitle, reqKey, stepName });

    await openEmptyPlans(page);
    await page.getByTestId("plan-create-name").fill(planName);
    await page.getByTestId("plan-create-submit").click();
    const planRow = page.locator('[data-testid="plan-row"]').filter({ hasText: planName });
    await expect(planRow).toBeVisible();
    await planRow.click();
    await expect(page.getByTestId("plan-manage-panel")).toBeVisible();
    const planCaseCheckbox = page.getByTestId(`plan-case-${manualId}`);
    await planCaseCheckbox.click();
    await expect(planCaseCheckbox).toBeChecked({ timeout: 10000 });

    await openEmptyRuns(page);
    await page.getByTestId("run-create-name").fill(runName);
    await page.getByTestId("run-create-test-plan-id").selectOption({ label: planName });
    await page.getByTestId("run-create-submit").click();

    await expect(page.getByTestId("run-row").filter({ hasText: runName })).toBeVisible();
  });
});
