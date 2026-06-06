import { expect, test } from "@playwright/test";
import { openDemoProjectOverview, openDemoReporting } from "./fixtures/demo-qa";

test.describe("FE-M project workspace subnav (DEMO-QA)", () => {
  test("reporting page exposes full nav links", async ({ page }) => {
    await openDemoReporting(page);

    await expect(page.getByTestId("project-nav-overview")).toBeVisible();
    await expect(page.getByTestId("project-nav-requirements")).toBeVisible();
    await expect(page.getByTestId("project-nav-test-cases")).toBeVisible();
    await expect(page.getByTestId("project-nav-plans")).toBeVisible();
    await expect(page.getByTestId("project-nav-runs")).toBeVisible();
    await expect(page.getByTestId("project-nav-reporting")).toBeVisible();
    await expect(page.getByTestId("project-nav-imports")).toBeVisible();
    await expect(page.getByTestId("project-nav-design-links")).toBeVisible();

    await expect(page.getByTestId("project-nav-reporting")).toHaveAttribute("aria-current", "page");

    await expect(page.getByTestId("project-nav-requirements-menu")).toHaveCount(0);
    await expect(page.getByTestId("project-nav-test-cases-menu")).toHaveCount(0);
    await expect(page.getByTestId("project-nav-plans-menu")).toHaveCount(0);
    await expect(page.getByTestId("project-nav-runs-menu")).toHaveCount(0);

    const navLinks = page.locator(".project-detail-header-links a");
    await expect(navLinks.nth(2)).toHaveText("Test cases");
    await expect(navLinks.nth(3)).toHaveText("Plans");
    await expect(navLinks.nth(4)).toHaveText("Runs");
  });

  test("test cases link opens inline create row", async ({ page }) => {
    await openDemoProjectOverview(page);

    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();
    await expect(page.getByTestId("testcase-create-row")).toBeVisible();
    await expect(page.getByTestId("testcase-create-dialog")).toHaveCount(0);
  });
});
