import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("FE-L manual happy path", () => {
  test("clean project workflow: requirement + testcase + run + reporting", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectName = `FE-L ${suffix}`;
    const projectKey = `fe-l-${suffix}`;
    const reqKey = `REQ-${suffix}`;
    const reqTitle = `Requirement ${suffix}`;
    const manualTitle = `Manual ${suffix}`;
    const stepName = `Step ${suffix}`;
    const runName = `Run ${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(projectName);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const projectRow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(projectRow).toBeVisible();
    await projectRow.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await expect(page.getByTestId("shell-transport-error")).toHaveCount(0);
    await expect(page.getByTestId("shell-app-error")).toHaveCount(0);

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(reqTitle);
    await page.getByTestId("requirement-create-submit").click();
    await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

    await page.getByTestId("project-nav-project").click();
    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();
    await page.getByTestId("testcase-create-type").selectOption("manual");
    await page.getByTestId("testcase-create-title").fill(manualTitle);
    await page.getByTestId(`testcase-create-manual-req-${reqKey}`).check();
    await page.getByTestId("testcase-create-manual-step-name-0").fill(stepName);
    await page.getByTestId("testcase-create-submit").click();

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await page.getByTestId("project-nav-project").click();
    await page.getByTestId("project-nav-runs").click();
    await expect(page.getByTestId("runs-page")).toBeVisible();
    await page.getByTestId("run-create-name").fill(runName);
    await page.getByTestId("run-create-submit").click();

    const runRow = page.locator(`tr[data-testid="run-row"]`).filter({ hasText: runName });
    await expect(runRow).toBeVisible();
    await runRow.getByTestId("run-open").click();
    await expect(page.getByTestId("run-detail-page")).toBeVisible();
    await page.getByTestId("result-submit-open").click();
    await expect(page.getByTestId("result-submit-dialog")).toBeVisible();
    await page.getByTestId("result-submit-testcase").selectOption(manualId!);
    await page.getByTestId("result-submit-status").selectOption("passed");
    await page.getByTestId("result-submit-duration").fill("30");
    await page.getByTestId("result-submit-button").click();
    await expect(page.getByTestId("result-submit-dialog")).toHaveCount(0);
    await expect(page.getByTestId("run-aggregate-total")).toHaveText("1", { timeout: 8000 });
    await expect(page.getByTestId("run-aggregate-passed")).toHaveText("1");

    await page.getByTestId("project-nav-runs").click();
    await page.getByTestId("project-nav-project").click();
    await page.getByTestId("project-nav-reporting").click();
    await expect(page.getByTestId("reporting-page")).toBeVisible();
    await expect(page.getByTestId("kpi-current-total-requirements")).toHaveText("1");
    await expect(page.getByTestId("kpi-current-total-manual")).toHaveText("1");
    await expect(page.getByTestId("kpi-current-total-runs")).toHaveText("1");
    await expect(page.getByTestId("shell-transport-error")).toHaveCount(0);
    await expect(page.getByTestId("shell-app-error")).toHaveCount(0);
  });
});
