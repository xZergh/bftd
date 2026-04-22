import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

/**
 * Creates project, one requirement, one manual test case, one run; opens run detail. Returns ids and labels for assertions.
 */
async function seedProjectManualAndOpenRun(
  page: Page,
  suffix: string
): Promise<{ manualId: string; manualTitle: string; runName: string }> {
  const projectName = `FE-E ${suffix}`;
  const projectKey = `fe-e-${suffix}`;
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

  const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
  await expect(prow).toBeVisible();
  await prow.getByTestId("project-name-link").click();
  await expect(page.getByTestId("project-detail-page")).toBeVisible();

  await page.getByTestId("project-nav-requirements").click();
  await expect(page.getByTestId("requirements-page")).toBeVisible();
  await page.getByTestId("requirement-create-key").fill(reqKey);
  await page.getByTestId("requirement-create-title").fill(reqTitle);
  await page.getByTestId("requirement-create-submit").click();
  await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

  await page.getByTestId("project-nav-project").click();
  await expect(page.getByTestId("project-detail-page")).toBeVisible();
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
  await expect(page.getByTestId("project-detail-page")).toBeVisible();
  await page.getByTestId("project-nav-runs").click();
  await expect(page.getByTestId("runs-page")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Runs" })).toBeVisible();

  await page.getByTestId("run-create-name").fill(runName);
  await page.getByTestId("run-create-submit").click();

  const runRow = page.locator(`tr[data-testid="run-row"]`).filter({ hasText: runName });
  await expect(runRow).toBeVisible();
  await runRow.getByTestId("run-open").click();
  await expect(page.getByTestId("run-detail-page")).toBeVisible();
  await expect(page.getByTestId("run-detail-name")).toHaveText(runName);

  return { manualId: manualId!, manualTitle, runName };
}

async function submitResult(
  page: Page,
  manualId: string,
  status: "passed" | "failed" | "skipped" | "blocked",
  durationMs: string
) {
  await page.getByTestId("result-submit-testcase").selectOption(manualId);
  await page.getByTestId("result-submit-status").selectOption(status);
  await page.getByTestId("result-submit-duration").fill(durationMs);
  await page.getByTestId("result-submit-button").click();
}

test.describe("FE-E runs", () => {
  test("submit passed: aggregate 1 total, 1 passed, 100% pass rate", async ({ page }) => {
    const suffix = `${Date.now()}-a`;
    const { manualId, manualTitle } = await seedProjectManualAndOpenRun(page, suffix);

    await expect(page.getByTestId("run-aggregate-total")).toHaveText("0", { timeout: 8000 });

    await submitResult(page, manualId, "passed", "42");

    await expect(page.getByTestId("run-aggregate-total")).toHaveText("1", { timeout: 8000 });
    await expect(page.getByTestId("run-aggregate-passed")).toHaveText("1");
    await expect(page.getByTestId("run-aggregate-failed")).toHaveText("0");
    await expect(page.getByTestId("run-aggregate-skipped")).toHaveText("0");
    await expect(page.getByTestId("run-aggregate-blocked")).toHaveText("0");
    await expect(page.getByTestId("run-aggregate-pass-rate")).toHaveText("100%");
    await expect(page.getByTestId("run-aggregate-duration-ms")).toHaveText("42");

    await expect(page.getByTestId("run-result-row").filter({ hasText: manualTitle })).toHaveCount(1);
    await expect(
      page.getByTestId("run-result-row").filter({ hasText: manualTitle }).getByTestId("run-result-status")
    ).toHaveText("passed");
  });

  test("submit passed, failed, skipped, blocked on same test case: aggregate counts and 25% pass rate", async ({
    page
  }) => {
    const suffix = `${Date.now()}-b`;
    const { manualId, manualTitle } = await seedProjectManualAndOpenRun(page, suffix);

    await expect(page.getByTestId("run-aggregate-total")).toHaveText("0", { timeout: 8000 });

    await submitResult(page, manualId, "passed", "10");
    await expect(page.getByTestId("run-aggregate-total")).toHaveText("1", { timeout: 8000 });
    await expect(page.getByTestId("run-aggregate-passed")).toHaveText("1");

    await submitResult(page, manualId, "failed", "20");
    await expect(page.getByTestId("run-aggregate-total")).toHaveText("2", { timeout: 8000 });
    await expect(page.getByTestId("run-aggregate-failed")).toHaveText("1");

    await submitResult(page, manualId, "skipped", "0");
    await expect(page.getByTestId("run-aggregate-total")).toHaveText("3", { timeout: 8000 });
    await expect(page.getByTestId("run-aggregate-skipped")).toHaveText("1");

    await submitResult(page, manualId, "blocked", "5");
    await expect(page.getByTestId("run-aggregate-total")).toHaveText("4", { timeout: 8000 });
    await expect(page.getByTestId("run-aggregate-blocked")).toHaveText("1");

    await expect(page.getByTestId("run-aggregate-passed")).toHaveText("1");
    await expect(page.getByTestId("run-aggregate-failed")).toHaveText("1");
    await expect(page.getByTestId("run-aggregate-pass-rate")).toHaveText("25%");
    await expect(page.getByTestId("run-aggregate-duration-ms")).toHaveText("35");

    await expect(page.getByTestId("run-result-row").filter({ hasText: manualTitle })).toHaveCount(4);
    await expect(page.getByTestId("run-result-row").getByTestId("run-result-status")).toHaveText([
      "passed",
      "failed",
      "skipped",
      "blocked"
    ]);
  });

  test("submit without test case shows validation error and payload preview", async ({ page }) => {
    const suffix = `${Date.now()}-c`;
    await seedProjectManualAndOpenRun(page, suffix);

    await page.getByTestId("result-submit-button").click();

    await expect(page.getByTestId("result-submit-testcase-error")).toBeVisible();
    await expect(page.getByTestId("validation-error-payload-preview")).toBeVisible();
    await expect(page.getByTestId("validation-error-payload-json")).toContainText("SubmitTestResult");
  });

  test("runs list shows multiple runs after creating a second run", async ({ page }) => {
    const suffix = `${Date.now()}-d`;
    const { runName } = await seedProjectManualAndOpenRun(page, suffix);

    await page.getByTestId("project-nav-runs").click();
    await expect(page.getByTestId("runs-page")).toBeVisible();

    const secondRunName = `${runName} two`;
    await page.getByTestId("run-create-name").fill(secondRunName);
    await page.getByTestId("run-create-submit").click();

    await expect(page.getByTestId("run-row").filter({ hasText: runName })).toBeVisible();
    await expect(page.getByTestId("run-row").filter({ hasText: secondRunName })).toBeVisible();
  });
});
