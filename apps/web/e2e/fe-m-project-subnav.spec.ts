import { expect, test } from "@playwright/test";

test.describe("FE-M project workspace subnav", () => {
  test("reporting page exposes full nav links", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-m-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(`FE-M ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-reporting").click();
    await expect(page.getByTestId("reporting-page")).toBeVisible();

    await expect(page.getByTestId("project-nav-project")).toBeVisible();
    await expect(page.getByTestId("project-nav-requirements")).toBeVisible();
    await expect(page.getByTestId("project-nav-test-cases")).toBeVisible();
    await expect(page.getByTestId("project-nav-runs")).toBeVisible();
    await expect(page.getByTestId("project-nav-reporting")).toBeVisible();
    await expect(page.getByTestId("project-nav-imports")).toBeVisible();
    await expect(page.getByTestId("project-nav-design-links")).toBeVisible();

    await expect(page.getByTestId("project-nav-reporting")).toHaveAttribute("aria-current", "page");

    await expect(page.getByTestId("project-nav-requirements-menu")).toHaveCount(0);
    await expect(page.getByTestId("project-nav-test-cases-menu")).toHaveCount(0);
    await expect(page.getByTestId("project-nav-runs-menu")).toHaveCount(0);
  });

  test("test cases link opens inline create row", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-m-tc-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(`FE-M TC ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();
    await expect(page.getByTestId("testcase-create-row")).toBeVisible();
    await expect(page.getByTestId("testcase-create-dialog")).toHaveCount(0);
  });
});
