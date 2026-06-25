import { expect, test, type Page } from "@playwright/test";
import {
  DEMO,
  createRunAndOpenDetail,
  expectDemoRunSeeded,
  openDemoRuns,
  seedEmptyRunWithManual
} from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

async function submitResult(
  page: Page,
  manualId: string,
  status: "passed" | "failed" | "skipped" | "blocked",
  durationMs: string
) {
  await page.getByTestId("result-submit-open").click();
  await expect(page.getByTestId("result-submit-dialog")).toBeVisible();
  await page.getByTestId("result-submit-testcase").selectOption(manualId);
  await page.getByTestId("result-submit-status").selectOption(status);
  await page.getByTestId("result-submit-duration").fill(durationMs);
  await page.getByTestId("result-submit-button").click();
  await expect(page.getByTestId("result-submit-dialog")).toHaveCount(0);
}

test.describe("FE-E runs (DEMO-QA)", () => {
  test("seeded demo regression run appears in DEMO-QA runs table", async ({ page }) => {
    await openDemoRuns(page);
    await expectDemoRunSeeded(page);
    await expect(page.locator('[data-testid="run-row"]').filter({ hasText: DEMO.runName })).toHaveCount(1);
  });

  test("submit passed: aggregate 1 total, 1 passed, 100% pass rate", async ({ page }) => {
    const suffix = `${Date.now()}-a`;
    const { manualId, manualTitle } = await seedEmptyRunWithManual(page, suffix);

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
    const { manualId, manualTitle } = await seedEmptyRunWithManual(page, suffix);

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
    await seedEmptyRunWithManual(page, suffix);

    await page.getByTestId("result-submit-open").click();
    await expect(page.getByTestId("result-submit-dialog")).toBeVisible();
    await page.getByTestId("result-submit-testcase").selectOption("");
    await page.getByTestId("result-submit-button").click();

    await expect(page.getByTestId("result-submit-testcase-error")).toBeVisible();
    await expect(page.getByTestId("validation-error-payload-preview")).toBeVisible();
    await expect(page.getByTestId("validation-error-payload-json")).toContainText("SubmitTestResult");
  });

  test("runs list shows multiple runs after creating a second run", async ({ page }) => {
    const suffix = `${Date.now()}-d`;
    const { runName } = await seedEmptyRunWithManual(page, suffix);

    await page.getByTestId("project-nav-runs").click();
    await expect(page.getByTestId("runs-page")).toBeVisible();

    const secondRunName = `Run two ${suffix}`;
    await createRunAndOpenDetail(page, secondRunName);

    await page.getByTestId("project-nav-runs").click();
    await expect(page.getByTestId("runs-page")).toBeVisible();
    await expect(page.getByTestId("run-row").filter({ hasText: runName })).toBeVisible();
    await expect(page.getByTestId("run-row").filter({ hasText: secondRunName })).toBeVisible();
  });
});
