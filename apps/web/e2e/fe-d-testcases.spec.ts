import { expect, test } from "@playwright/test";
import {
  DEMO,
  expectDemoRequirementsSeeded,
  expectDemoTestCasesSeeded,
  openDemoRequirements,
  openDemoTestCases
} from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-D test cases (DEMO-QA)", () => {
  test("seeded requirements appear in DEMO-QA table", async ({ page }) => {
    await openDemoRequirements(page);
    await expectDemoRequirementsSeeded(page);
    await expect(page.locator('tr[data-requirement-key]')).toHaveCount(3);
  });

  test("seeded test cases appear in DEMO-QA table", async ({ page }) => {
    await openDemoTestCases(page);
    await expectDemoTestCasesSeeded(page);
    await expect(page.locator('[data-testid="testcase-row"]')).toHaveCount(4);
  });

  test("no React cross-render update warnings on testcase list/detail navigation", async ({ page }) => {
    const renderPhaseWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Cannot update a component")) {
        renderPhaseWarnings.push(msg.text());
      }
    });

    await openDemoRequirements(page);
    const reqRow = page.locator(`tr[data-requirement-key="${DEMO.requirements.R3}"]`);
    await reqRow.getByTestId("requirement-open").click();
    await expect(page.getByTestId("requirement-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    const manualRow = page
      .locator('[data-testid="testcase-row"]')
      .filter({ hasText: DEMO.manualTitles.login });
    await manualRow.getByTestId("testcase-open").click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    expect(renderPhaseWarnings, renderPhaseWarnings.join("\n")).toEqual([]);
  });

  test("manual linked to requirement; automated linked to manual; tombstone and restore", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const reqKey = DEMO.requirements.R2;
    const reqTitle = DEMO.requirementTitles.R2;
    const manualTitle = `Manual TC ${suffix}`;
    const autoTitle = `Auto TC ${suffix}`;
    const stepName = `Step one ${suffix}`;

    await openDemoTestCases(page);

    await page.getByTestId("testcase-create-type").selectOption("manual");
    await page.getByTestId("testcase-create-title").fill(manualTitle);
    await page.getByTestId(`testcase-create-manual-req-${reqKey}`).check();
    await page.getByTestId("testcase-create-manual-step-name-0").fill(stepName);
    await page.getByTestId("testcase-create-submit").click();

    const manualRow = page.locator('[data-testid="testcase-row"]').filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await manualRow.getByTestId("testcase-open").click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await expect(page.getByTestId("testcase-detail-type")).toHaveText("manual");
    await expect(page.getByTestId("testcase-linked-req-title")).toContainText(reqTitle);

    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    await page.getByTestId("testcase-create-type").selectOption("automated");
    await page.getByTestId("testcase-create-title").fill(autoTitle);
    await page.getByTestId(`testcase-create-auto-manual-${manualId}`).check();
    await page.getByTestId("testcase-create-submit").click();

    const autoRow = page.locator('[data-testid="testcase-row"]').filter({ hasText: autoTitle });
    await expect(autoRow).toBeVisible();
    await autoRow.getByTestId("testcase-open").click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await expect(page.getByTestId("testcase-detail-type")).toHaveText("automated");
    await expect(page.getByTestId("testcase-linked-manual-title")).toContainText(manualTitle);

    await page.getByTestId("testcase-tombstone").click();
    await expect(page.getByTestId("testcase-detail-status")).toContainText("Deleted");
    await expect(page.getByTestId("testcase-deleted-banner")).toBeVisible();

    await page.getByTestId("testcase-restore").click();
    await expect(page.getByTestId("testcase-detail-status")).not.toContainText("Deleted");
    await expect(page.getByTestId("testcase-linked-manual-title")).toContainText(manualTitle);
  });
});
