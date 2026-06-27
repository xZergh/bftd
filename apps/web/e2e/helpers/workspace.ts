import { expect, type Page } from "@playwright/test";

export async function createRequirementOnListPage(page: Page, input: { key: string; title: string }) {
  await page.getByTestId("requirement-open-create-panel").click();
  await expect(page.getByTestId("requirement-create-panel")).toBeVisible();
  await page.getByTestId("requirement-create-key").fill(input.key);
  await page.getByTestId("requirement-create-title").fill(input.title);
  await page.getByTestId("requirement-create-submit").click();
  await expect(page.locator(`tr[data-requirement-key="${input.key}"]`)).toBeVisible();
}

export async function createManualTestCaseOnListPage(
  page: Page,
  input: { title: string; reqKey: string; stepName: string }
) {
  await page.getByTestId("testcase-open-create-panel").click();
  await expect(page.getByTestId("testcase-create-panel")).toBeVisible();
  await page.getByTestId("testcase-create-title").fill(input.title);
  await page.getByTestId(`testcase-create-manual-req-${input.reqKey}`).check();
  await page.getByTestId("testcase-create-manual-step-name-0").fill(input.stepName);
  await page.getByTestId("testcase-create-submit").click();
}

export async function createPlanOnListPage(page: Page, input: { name: string }) {
  await page.getByTestId("plan-open-create-panel").click();
  await expect(page.getByTestId("plan-create-panel")).toBeVisible();
  await page.getByTestId("plan-create-name").fill(input.name);
  await page.getByTestId("plan-create-submit").click();
}

export async function createRunOnListPage(page: Page, input: { name: string; planName?: string }) {
  await page.getByTestId("run-open-create-panel").click();
  await expect(page.getByTestId("run-create-panel")).toBeVisible();
  await page.getByTestId("run-create-name").fill(input.name);
  if (input.planName !== undefined) {
    await page.getByTestId("run-create-test-plan-id").selectOption({ label: input.planName });
  }
  await page.getByTestId("run-create-submit").click();
}
