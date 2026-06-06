import { expect, type Page } from "@playwright/test";

/** Keep in sync with `src/seed/demo-qa-constants.ts`. */
export const DEMO = {
  projectKey: "demo-qa",
  requirements: {
    R1: "DEMO-R1",
    R2: "DEMO-R2",
    R3: "DEMO-R3"
  },
  manualTitles: {
    login: "Manual: successful login with valid credentials",
    idleTimeout: "Manual: idle timeout logs user out",
    passwordReset: "Manual: password reset happy path"
  },
  automatedTitle: "API: token exchange returns access token",
  runName: "Demo regression - staging",
  planName: "Demo regression plan"
} as const;

export async function expectDemoProjectRow(page: Page) {
  const row = page.locator(`tr[data-project-key="${DEMO.projectKey}"]`);
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}

export async function openDemoProjectOverview(page: Page) {
  await page.goto("/projects");
  const row = await expectDemoProjectRow(page);
  await row.getByTestId("project-name-link").click();
  await expect(page.getByTestId("project-detail-page")).toBeVisible();
}

export async function demoProjectIdFromPage(page: Page): Promise<string> {
  await page.goto("/projects");
  const row = await expectDemoProjectRow(page);
  const href = await row.getByTestId("project-name-link").getAttribute("href");
  expect(href).toMatch(/^\/projects\/.+/);
  return href!.slice("/projects/".length);
}

export async function openDemoRequirements(page: Page) {
  await openDemoProjectOverview(page);
  await page.getByTestId("project-nav-requirements").click();
  await expect(page.getByTestId("requirements-page")).toBeVisible();
}

export async function openDemoTestCases(page: Page) {
  await openDemoProjectOverview(page);
  await page.getByTestId("project-nav-test-cases").click();
  await expect(page.getByTestId("testcases-page")).toBeVisible();
}

export async function openDemoReporting(page: Page) {
  await openDemoProjectOverview(page);
  await page.getByTestId("project-nav-reporting").click();
  await expect(page.getByTestId("reporting-page")).toBeVisible();
}
