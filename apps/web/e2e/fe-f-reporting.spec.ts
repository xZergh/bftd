import { expect, test } from "@playwright/test";
import { DEMO, openDemoReporting } from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-F reporting (DEMO-QA)", () => {
  test("KPI dashboard shows formula labels and coverage values", async ({ page }) => {
    await openDemoReporting(page);

    const reqRow = page.locator(`[data-testid="kpi-coverage-row"][data-formula-id="requirement_coverage"]`);
    await expect(reqRow).toBeVisible({ timeout: 15000 });
    await expect(reqRow.getByTestId("kpi-coverage-pie")).toBeVisible();
    await expect(reqRow.getByTestId("kpi-formula-label")).toHaveText("Requirement Coverage");
    await expect(reqRow.getByTestId("kpi-value-pct")).toHaveText("100%");

    const tcRow = page.locator(`[data-testid="kpi-coverage-row"][data-formula-id="testcase_coverage"]`);
    await expect(tcRow.getByTestId("kpi-formula-label")).toHaveText("Testcase Coverage");
    await expect(tcRow.getByTestId("kpi-value-pct")).toHaveText("100%");

    await expect(page.getByTestId("kpi-current-total-requirements")).toHaveText("3");
    await expect(page.getByTestId("kpi-current-total-manual")).toHaveText("3");
    await expect(page.getByTestId("kpi-current-total-runs")).toHaveText("1");
  });

  test("traceability graph summary and run snapshot edges", async ({ page }) => {
    await openDemoReporting(page);

    await expect(page.getByTestId("traceability-tree")).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId("traceability-tree")).toContainText("User can sign in with email and password");
    await expect(page.getByTestId("traceability-tree")).toContainText(DEMO.manualTitles.login);

    await expect(page.getByTestId("trace-graph-node-count")).toHaveText(/\d+/, { timeout: 15000 });
    const nodeCount = Number(await page.getByTestId("trace-graph-node-count").textContent());
    expect(nodeCount).toBeGreaterThanOrEqual(4);

    await expect(page.getByTestId("trace-graph-edge-count")).toHaveText(/\d+/);
    const edgeCount = Number(await page.getByTestId("trace-graph-edge-count").textContent());
    expect(edgeCount).toBeGreaterThanOrEqual(3);

    await expect(page.getByTestId("run-trace-edge-count")).toHaveText("3", { timeout: 15000 });
    await expect(page.getByTestId("run-trace-edge-row")).toHaveCount(3);
    await expect(page.getByTestId("run-trace-req-title").filter({ hasText: /sign in/i })).toHaveCount(1);
    await expect(page.getByTestId("run-trace-manual-title").filter({ hasText: /login/i })).toHaveCount(1);
  });
});
