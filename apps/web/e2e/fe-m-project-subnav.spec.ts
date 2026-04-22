import { expect, test } from "@playwright/test";

test.describe("FE-M project workspace subnav", () => {
  test("reporting page exposes full nav and Create menu targets", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-m-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("project-create-name").fill(`FE-M ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-open").click();
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

    await page.getByTestId("project-nav-requirements-menu").click();
    await expect(page.getByTestId("nav-project-create-requirement")).toBeVisible();
    const reqHref = await page.getByTestId("nav-project-create-requirement").getAttribute("href");
    expect(reqHref).toContain("/requirements?new=1");
  });

  test("test case create actions open only matching panel", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-m-tc-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("project-create-name").fill(`FE-M TC ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-open").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-test-cases-menu").click();
    await page.getByTestId("nav-project-create-testcase-manual").click();
    await expect(page.getByTestId("testcase-create-dialog")).toBeVisible();
    await expect(page.getByTestId("testcase-create-manual-panel")).toBeVisible();
    await expect(page.getByTestId("testcase-create-auto-panel")).toHaveCount(0);

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("testcase-create-dialog")).toHaveCount(0);

    await page.getByTestId("project-nav-test-cases-menu").click();
    await page.getByTestId("nav-project-create-testcase-auto").click();
    await expect(page.getByTestId("testcase-create-dialog")).toBeVisible();
    await expect(page.getByTestId("testcase-create-auto-panel")).toBeVisible();
    await expect(page.getByTestId("testcase-create-manual-panel")).toHaveCount(0);
  });
});
