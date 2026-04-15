import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

/**
 * Seeds project with one requirement, one manual linked to it, and one test run (traceability snapshot on create).
 */
async function seedProjectForReporting(page: Page, suffix: string): Promise<void> {
  const projectName = `FE-F ${suffix}`;
  const projectKey = `fe-f-${suffix}`;
  const reqKey = `REQ-${suffix}`;
  const reqTitle = `Requirement ${suffix}`;
  const manualTitle = `Manual ${suffix}`;
  const stepName = `Step ${suffix}`;
  const runName = `Run ${suffix}`;

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
  await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

  await page.getByTestId("requirements-back-project").click();
  await expect(page.getByTestId("project-detail-page")).toBeVisible();
  await page.getByTestId("project-nav-test-cases").click();
  await expect(page.getByTestId("testcases-page")).toBeVisible();

  await page.getByTestId("testcase-create-manual-title").fill(manualTitle);
  await page.getByTestId(`testcase-create-manual-req-${reqKey}`).check();
  await page.getByTestId("testcase-create-manual-step-name-0").fill(stepName);
  await page.getByTestId("testcase-create-manual-submit").click();

  await expect(
    page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle })
  ).toBeVisible();

  await page.getByTestId("testcases-back-project").click();
  await expect(page.getByTestId("project-detail-page")).toBeVisible();
  await page.getByTestId("project-nav-runs").click();
  await expect(page.getByTestId("runs-page")).toBeVisible();

  await page.getByTestId("run-create-name").fill(runName);
  await page.getByTestId("run-create-submit").click();
  await expect(page.locator(`tr[data-testid="run-row"]`).filter({ hasText: runName })).toBeVisible();

  await page.getByTestId("runs-back-project").click();
  await expect(page.getByTestId("project-detail-page")).toBeVisible();
}

test.describe("FE-F reporting", () => {
  test("KPI dashboard shows formula labels and coverage values", async ({ page }) => {
    const suffix = `${Date.now()}-kpi`;
    await seedProjectForReporting(page, suffix);

    await page.getByTestId("project-nav-reporting").click();
    await expect(page.getByTestId("reporting-page")).toBeVisible();

    const reqRow = page.locator(`[data-testid="kpi-coverage-row"][data-formula-id="requirement_coverage"]`);
    await expect(reqRow).toBeVisible({ timeout: 15000 });
    await expect(reqRow.getByTestId("kpi-coverage-pie")).toBeVisible();
    await expect(reqRow.getByTestId("kpi-formula-label")).toHaveText("Requirement Coverage");
    await expect(reqRow.getByTestId("kpi-value-pct")).toHaveText("100%");

    const tcRow = page.locator(`[data-testid="kpi-coverage-row"][data-formula-id="testcase_coverage"]`);
    await expect(tcRow.getByTestId("kpi-formula-label")).toHaveText("Testcase Coverage");
    await expect(tcRow.getByTestId("kpi-value-pct")).toHaveText("100%");

    await expect(page.getByTestId("kpi-current-total-requirements")).toHaveText("1");
    await expect(page.getByTestId("kpi-current-total-manual")).toHaveText("1");
    await expect(page.getByTestId("kpi-current-total-runs")).toHaveText("1");
  });

  test("traceability graph summary and run snapshot edges", async ({ page }) => {
    const suffix = `${Date.now()}-trace`;
    const reqTitle = `Requirement ${suffix}`;
    const manualTitle = `Manual ${suffix}`;
    await seedProjectForReporting(page, suffix);

    await page.getByTestId("project-nav-reporting").click();
    await expect(page.getByTestId("reporting-page")).toBeVisible();

    await expect(page.getByTestId("traceability-tree")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("traceability-tree")).toContainText(reqTitle);
    await expect(page.getByTestId("traceability-tree")).toContainText(manualTitle);

    await expect(page.getByTestId("trace-graph-node-count")).toHaveText(/\d+/, { timeout: 15000 });
    const nodeCount = Number(await page.getByTestId("trace-graph-node-count").textContent());
    expect(nodeCount).toBeGreaterThanOrEqual(2);

    await expect(page.getByTestId("trace-graph-edge-count")).toHaveText(/\d+/);
    const edgeCount = Number(await page.getByTestId("trace-graph-edge-count").textContent());
    expect(edgeCount).toBeGreaterThanOrEqual(1);

    await expect(page.getByTestId("run-trace-edge-count")).toHaveText("1", { timeout: 15000 });
    await expect(page.getByTestId("run-trace-edge-row")).toHaveCount(1);
    await expect(page.getByTestId("run-trace-req-title")).toHaveText(reqTitle, { timeout: 10000 });
    await expect(page.getByTestId("run-trace-manual-title")).toHaveText(manualTitle, { timeout: 10000 });
  });
});
