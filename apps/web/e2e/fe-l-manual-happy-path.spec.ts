import { expect, test } from "@playwright/test";
import {
  createManualTestCase,
  createRunAndOpenDetail,
  openEmptyProjectOverview,
  openEmptyReporting,
  openEmptyRequirements,
  openEmptyRuns,
  openEmptyTestCases
} from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-L manual happy path (DEMO-QA-EMPTY)", () => {
  test("workflow adds requirement, testcase, run, and updates reporting", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const reqKey = `REQ-${suffix}`;
    const reqTitle = `Requirement ${suffix}`;
    const manualTitle = `Manual ${suffix}`;
    const stepName = `Step ${suffix}`;
    const runName = `Run ${suffix}`;

    await openEmptyProjectOverview(page);
    await expect(page.getByTestId("project-dashboard-kpi")).toBeVisible();
    await expect(page.getByTestId("shell-transport-error")).toHaveCount(0);
    await expect(page.getByTestId("shell-app-error")).toHaveCount(0);

    await openEmptyReporting(page);
    const reqBefore = Number(await page.getByTestId("kpi-current-total-requirements").textContent());
    const manualBefore = Number(await page.getByTestId("kpi-current-total-manual").textContent());
    const runsBefore = Number(await page.getByTestId("kpi-current-total-runs").textContent());

    await openEmptyRequirements(page);
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(reqTitle);
    await page.getByTestId("requirement-create-submit").click();
    await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

    await openEmptyTestCases(page);
    const { manualId } = await createManualTestCase(page, {
      title: manualTitle,
      reqKey,
      stepName
    });

    await openEmptyRuns(page);
    await createRunAndOpenDetail(page, runName);

    await page.getByTestId("result-submit-open").click();
    await expect(page.getByTestId("result-submit-dialog")).toBeVisible();
    await page.getByTestId("result-submit-testcase").selectOption(manualId);
    await page.getByTestId("result-submit-status").selectOption("passed");
    await page.getByTestId("result-submit-duration").fill("30");
    await page.getByTestId("result-submit-button").click();
    await expect(page.getByTestId("result-submit-dialog")).toHaveCount(0);
    await expect(page.getByTestId("run-aggregate-total")).toHaveText("1", { timeout: 8000 });
    await expect(page.getByTestId("run-aggregate-passed")).toHaveText("1");

    await openEmptyReporting(page);
    await expect(page.getByTestId("kpi-current-total-requirements")).toHaveText(String(reqBefore + 1));
    await expect(page.getByTestId("kpi-current-total-manual")).toHaveText(String(manualBefore + 1));
    await expect(page.getByTestId("kpi-current-total-runs")).toHaveText(String(runsBefore + 1));
    await expect(page.getByTestId("traceability-tree")).toContainText(reqTitle);
    await expect(page.getByTestId("traceability-tree")).toContainText(manualTitle);
    await expect(page.getByTestId("shell-transport-error")).toHaveCount(0);
    await expect(page.getByTestId("shell-app-error")).toHaveCount(0);
  });
});
