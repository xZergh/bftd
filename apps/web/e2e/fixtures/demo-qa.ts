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
    R1: "User can create a project with a unique key",
    R2: "Archived projects are hidden from the default list",
    R3: "Overview KPI strip shows requirement, manual, and run counts"
  },
  manualTitles: {
    login: "Manual: User can create a project with a unique key",
    idleTimeout: "Manual: Archived projects are hidden from the default list",
    passwordReset: "Manual: Overview KPI strip shows requirement, manual, and run counts"
  },
  automatedTitle: "API: project create returns stable key",
  runName: "Demo regression - staging",
  planName: "Demo regression plan",
  seedCounts: {
    requirements: 34,
    manualTestCases: 34,
    automatedTestCases: 6,
    plans: 1,
    planTestCases: 10,
    runTraceabilityEdges: 34,
    testCasesTotal: 40
  }
} as const;

/** Blank project shell — no pre-seeded entities. Keys stored lowercase in UI. */
export const DEMO_EMPTY = {
  projectKey: "demo-qa-empty"
} as const;

async function expectProjectRow(page: Page, projectKey: string) {
  const row = page.locator(`tr[data-project-key="${projectKey}"]`);
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}

async function openProjectOverview(page: Page, projectKey: string) {
  await page.goto("/projects");
  const row = await expectProjectRow(page, projectKey);
  await row.getByTestId("project-name-link").click();
  await expect(page.getByTestId("project-detail-page")).toBeVisible();
}

export async function expectDemoProjectRow(page: Page) {
  return expectProjectRow(page, DEMO.projectKey);
}

export async function expectEmptyProjectRow(page: Page) {
  return expectProjectRow(page, DEMO_EMPTY.projectKey);
}

export async function openDemoProjectOverview(page: Page) {
  await openProjectOverview(page, DEMO.projectKey);
}

export async function openEmptyProjectOverview(page: Page) {
  await openProjectOverview(page, DEMO_EMPTY.projectKey);
}

export async function demoProjectIdFromPage(page: Page): Promise<string> {
  await page.goto("/projects");
  const row = await expectDemoProjectRow(page);
  const href = await row.getByTestId("project-name-link").getAttribute("href");
  expect(href).toMatch(/^\/projects\/.+/);
  return href!.slice("/projects/".length);
}

async function openProjectSection(page: Page, projectKey: string, navTestId: string, pageTestId: string) {
  await openProjectOverview(page, projectKey);
  await page.getByTestId(navTestId).click();
  await expect(page.getByTestId(pageTestId)).toBeVisible();
}

export async function openDemoRequirements(page: Page) {
  await openProjectSection(page, DEMO.projectKey, "project-nav-requirements", "requirements-page");
}

export async function openEmptyRequirements(page: Page) {
  await openProjectSection(page, DEMO_EMPTY.projectKey, "project-nav-requirements", "requirements-page");
}

export async function openDemoTestCases(page: Page) {
  await openProjectSection(page, DEMO.projectKey, "project-nav-test-cases", "testcases-page");
}

export async function openEmptyTestCases(page: Page) {
  await openProjectSection(page, DEMO_EMPTY.projectKey, "project-nav-test-cases", "testcases-page");
}

export async function openDemoReporting(page: Page) {
  await openProjectSection(page, DEMO.projectKey, "project-nav-reporting", "reporting-page");
}

export async function openEmptyReporting(page: Page) {
  await openProjectSection(page, DEMO_EMPTY.projectKey, "project-nav-reporting", "reporting-page");
}

export async function openDemoPlans(page: Page) {
  await openProjectSection(page, DEMO.projectKey, "project-nav-plans", "plans-page");
}

export async function openEmptyPlans(page: Page) {
  await openProjectSection(page, DEMO_EMPTY.projectKey, "project-nav-plans", "plans-page");
}

export async function openDemoRuns(page: Page) {
  await openProjectSection(page, DEMO.projectKey, "project-nav-runs", "runs-page");
}

export async function openEmptyRuns(page: Page) {
  await openProjectSection(page, DEMO_EMPTY.projectKey, "project-nav-runs", "runs-page");
}

export async function openDemoImports(page: Page) {
  await openProjectSection(page, DEMO.projectKey, "project-nav-imports", "imports-page");
}

export async function openEmptyImports(page: Page) {
  await openProjectSection(page, DEMO_EMPTY.projectKey, "project-nav-imports", "imports-page");
}

export async function openEmptyDesignLinks(page: Page) {
  await openProjectSection(page, DEMO_EMPTY.projectKey, "project-nav-design-links", "design-links-page");
}

export async function openDemoDesignLinks(page: Page) {
  await openProjectSection(page, DEMO.projectKey, "project-nav-design-links", "design-links-page");
}

/** Assert the seeded demo regression run row is present. */
export async function expectDemoRunSeeded(page: Page) {
  await expect(page.locator('[data-testid="run-row"]').filter({ hasText: DEMO.runName })).toBeVisible();
}

/** Assert overview KPI tiles match the full DEMO-QA seed baseline. */
export async function expectDemoOverviewSeedKpis(page: Page) {
  const c = DEMO.seedCounts;
  await expect(page.getByTestId("project-kpi-requirements").locator(".project-kpi-value")).toHaveText(
    String(c.requirements)
  );
  await expect(page.getByTestId("project-kpi-manual").locator(".project-kpi-value")).toHaveText(
    String(c.manualTestCases)
  );
  await expect(page.getByTestId("project-kpi-automated").locator(".project-kpi-value")).toHaveText(
    String(c.automatedTestCases)
  );
  await expect(page.getByTestId("project-kpi-plans").locator(".project-kpi-value")).toHaveText(String(c.plans));
}

/** Assert overview KPI tiles are zero (DEMO-QA-EMPTY baseline). */
export async function expectEmptyOverviewKpis(page: Page) {
  await expect(page.getByTestId("project-kpi-requirements").locator(".project-kpi-value")).toHaveText("0");
  await expect(page.getByTestId("project-kpi-manual").locator(".project-kpi-value")).toHaveText("0");
  await expect(page.getByTestId("project-kpi-automated").locator(".project-kpi-value")).toHaveText("0");
  await expect(page.getByTestId("project-kpi-plans").locator(".project-kpi-value")).toHaveText("0");
}

/** Create a manual test case linked to the given requirement external key (must exist in current project). */
export async function createManualTestCase(
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

/** @deprecated Use createManualTestCase — kept for specs already on DEMO-QA. */
export const createDemoManualTestCase = createManualTestCase;

/** Create a run, open its detail page, and return the run name. */
export async function createRunAndOpenDetail(page: Page, runName: string) {
  await page.getByTestId("run-create-name").fill(runName);
  await page.getByTestId("run-create-submit").click();
  const runRow = page.locator('[data-testid="run-row"]').filter({ hasText: runName });
  await expect(runRow).toBeVisible();
  await runRow.getByTestId("run-open").click();
  await expect(page.getByTestId("run-detail-page")).toBeVisible();
  await expect(page.getByTestId("run-detail-name")).toHaveText(runName);
  return runName;
}

/** @deprecated Use createRunAndOpenDetail */
export const createDemoRunAndOpenDetail = createRunAndOpenDetail;

/** Create requirement + manual TC + empty run on DEMO-QA-EMPTY and open run detail. */
export async function seedEmptyRunWithManual(page: Page, suffix: string) {
  const reqKey = `REQ-${suffix}`;
  const reqTitle = `Requirement ${suffix}`;
  const manualTitle = `Manual ${suffix}`;
  const stepName = `Step ${suffix}`;
  const runName = `Run ${suffix}`;

  await openEmptyRequirements(page);
  await page.getByTestId("requirement-create-key").fill(reqKey);
  await page.getByTestId("requirement-create-title").fill(reqTitle);
  await page.getByTestId("requirement-create-submit").click();
  await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

  await openEmptyTestCases(page);
  const { manualId } = await createManualTestCase(page, { title: manualTitle, reqKey, stepName });

  await openEmptyRuns(page);
  await createRunAndOpenDetail(page, runName);

  return { manualId, manualTitle, runName, reqKey, reqTitle };
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

/** Assert requirements and test cases tables are empty on DEMO-QA-EMPTY. */
export async function expectEmptyRequirementsTable(page: Page) {
  await expect(page.locator('tr[data-requirement-key]')).toHaveCount(0);
}

export async function expectEmptyTestCasesTable(page: Page) {
  await expect(page.locator('[data-testid="testcase-row"]')).toHaveCount(0);
}
