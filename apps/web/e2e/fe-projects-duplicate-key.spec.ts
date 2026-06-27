import { expect, test } from "@playwright/test";

/**
 * TCMS-TC-R1-02 — reject duplicate project key.
 * Playwright automation id: e2e/fe-projects-duplicate-key.spec.ts (TCMS-AUTO-R1-02)
 */
test.describe.configure({ mode: "serial" });

test.describe("FE projects duplicate key (TCMS-R1-02)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tcms.lastProjectPath");
      } catch {
        /* ignore */
      }
    });
  });

  test("reject create when project key already exists", { tag: "@smoke" }, async ({ page }) => {
    const existingKey = "demo-qa";

    await page.goto("/projects");
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.locator(`tr[data-project-key="${existingKey}"]`)).toHaveCount(1);

    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await expect(page.getByTestId("project-create-dialog")).toBeVisible();
    await page.getByTestId("project-create-name").fill(`Duplicate attempt ${Date.now()}`);
    await page.getByTestId("project-create-key").fill(existingKey);
    await page.getByTestId("project-create-submit").click();

    await expect(page.getByTestId("shell-app-error")).toBeVisible();
    await expect(page.getByTestId("shell-app-error-code")).toHaveText("PROJECT_KEY_CONFLICT");
    await expect(page.getByTestId("project-create-dialog")).toBeVisible();
    await expect(page.locator(`tr[data-project-key="${existingKey}"]`)).toHaveCount(1);
  });
});
