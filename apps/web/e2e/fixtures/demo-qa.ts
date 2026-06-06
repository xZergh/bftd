import { expect, type Page } from "@playwright/test";

/** Keep in sync with `src/seed/demo-qa-constants.ts`. */
export const DEMO = {
  projectKey: "demo-qa",
  requirements: {
    R1: "DEMO-R1",
    R2: "DEMO-R2",
    R3: "DEMO-R3"
  },
  requirementTitles: {
    R1: "User can sign in with email and password",
    R2: "Session expires after configured idle timeout",
    R3: "Password reset sends a single-use link"
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

export async function openDemoPlans(page: Page) {
  await openDemoProjectOverview(page);
  await page.getByTestId("project-nav-plans").click();
  await expect(page.getByTestId("plans-page")).toBeVisible();
}

export async function openDemoRuns(page: Page) {
  await openDemoProjectOverview(page);
  await page.getByTestId("project-nav-runs").click();
  await expect(page.getByTestId("runs-page")).toBeVisible();
}

export async function openDemoImports(page: Page) {
  await openDemoProjectOverview(page);
  await page.getByTestId("project-nav-imports").click();
  await expect(page.getByTestId("imports-page")).toBeVisible();
}

export async function openDemoDesignLinks(page: Page) {
  await openDemoProjectOverview(page);
  await page.getByTestId("project-nav-design-links").click();
  await expect(page.getByTestId("design-links-page")).toBeVisible();
}

/** Assert the seeded demo regression run row is present. */
export async function expectDemoRunSeeded(page: Page) {
  await expect(page.locator('[data-testid="run-row"]').filter({ hasText: DEMO.runName })).toBeVisible();
}

/** Assert overview KPI tiles match the DEMO-QA seed baseline (minimum counts). */
export async function expectDemoOverviewSeedKpis(page: Page) {
  await expect(page.getByTestId("project-kpi-requirements").locator(".project-kpi-value")).toHaveText("3");
  await expect(page.getByTestId("project-kpi-manual").locator(".project-kpi-value")).toHaveText("3");
  await expect(page.getByTestId("project-kpi-automated").locator(".project-kpi-value")).toHaveText("1");
  await expect(page.getByTestId("project-kpi-plans").locator(".project-kpi-value")).toHaveText("1");
}

/** Create a manual test case on DEMO-QA linked to the given requirement key. */
export async function createDemoManualTestCase(
  page: Page,
  opts: { title: string; reqKey: string; stepName: string }
) {
  await page.getByTestId("testcase-create-type").selectOption("manual");
  await page.getByTestId("testcase-create-title").fill(opts.title);
  await page.getByTestId(`testcase-create-manual-req-${opts.reqKey}`).check();
  await page.getByTestId("testcase-create-manual-step-name-0").fill(opts.stepName);
  await page.getByTestId("testcase-create-submit").click();
  const row = page.locator('[data-testid="testcase-row"]').filter({ hasText: opts.title });
  await expect(row).toBeVisible();
  const manualId = await row.getAttribute("data-testcase-id");
  expect(manualId).toBeTruthy();
  return { row, manualId: manualId! };
}

/** Create a run on DEMO-QA, open its detail page, and return the run name. */
export async function createDemoRunAndOpenDetail(page: Page, runName: string) {
  await page.getByTestId("run-create-name").fill(runName);
  await page.getByTestId("run-create-submit").click();
  const runRow = page.locator('[data-testid="run-row"]').filter({ hasText: runName });
  await expect(runRow).toBeVisible();
  await runRow.getByTestId("run-open").click();
  await expect(page.getByTestId("run-detail-page")).toBeVisible();
  await expect(page.getByTestId("run-detail-name")).toHaveText(runName);
  return runName;
}

/** Create ephemeral manual TC + empty run on DEMO-QA and open run detail. */
export async function seedDemoRunWithManual(page: Page, suffix: string) {
  const manualTitle = `Manual ${suffix}`;
  const stepName = `Step ${suffix}`;
  const runName = `Run ${suffix}`;
  const reqKey = DEMO.requirements.R2;

  await openDemoTestCases(page);
  const { manualId } = await createDemoManualTestCase(page, { title: manualTitle, reqKey, stepName });

  await openDemoRuns(page);
  await createDemoRunAndOpenDetail(page, runName);

  return { manualId, manualTitle, runName };
}

/** Assert the seeded demo regression plan row is present. */
export async function expectDemoPlanSeeded(page: Page) {
  await expect(page.locator('[data-testid="plan-row"]').filter({ hasText: DEMO.planName })).toBeVisible();
}

/** Assert all three seeded requirements appear in the table with keys and titles. */
export async function expectDemoRequirementsSeeded(page: Page) {
  for (const id of ["R1", "R2", "R3"] as const) {
    const key = DEMO.requirements[id];
    const row = page.locator(`tr[data-requirement-key="${key}"]`);
    await expect(row).toBeVisible();
    await expect(row.getByLabel("Title")).toHaveValue(DEMO.requirementTitles[id]);
  }
}

/** Assert all four seeded test cases (3 manual + 1 automated) appear in the table. */
export async function expectDemoTestCasesSeeded(page: Page) {
  const titles = [...Object.values(DEMO.manualTitles), DEMO.automatedTitle];
  for (const title of titles) {
    await expect(page.locator('[data-testid="testcase-row"]').filter({ hasText: title })).toBeVisible();
  }
}
