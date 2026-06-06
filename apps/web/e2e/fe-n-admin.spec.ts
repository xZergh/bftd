import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("FE-N admin purge", () => {
  test("purge removes archived projects from database", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-n-arch-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(`FE-N archive ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const row = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(row).toBeVisible();
    await row.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-settings-toggle").click();
    await page.getByTestId("project-archive").click();
    await expect(page).toHaveURL(/\/projects\/?$/, { timeout: 8000 });

    await page.getByTestId("project-list-include-archived-switch").check();
    await expect(page.locator(`tr[data-project-key="${projectKey}"]`)).toBeVisible();

    await page.goto("/admin");
    await expect(page.getByTestId("admin-page")).toBeVisible();
    await expect(page.locator(`tr[data-project-key="${projectKey}"]`)).toBeVisible();

    await page.getByTestId("admin-purge-archived").click();
    await expect(page.getByTestId("admin-archived-empty")).toBeVisible({ timeout: 10000 });

    await page.goto("/projects");
    await page.getByTestId("project-list-include-archived-switch").check();
    await expect(page.locator(`tr[data-project-key="${projectKey}"]`)).toHaveCount(0);
  });
});
