import { expect, test } from "@playwright/test";

test.describe("FE-J polish", () => {
  test("projects content starts in viewport without forced blank chrome gap", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByTestId("projects-page")).toBeVisible();
    const projectsTop = await page.getByTestId("projects-page").evaluate((el) => el.getBoundingClientRect().top);
    expect(projectsTop).toBeLessThan(260);
  });

  test("skip link focuses main landmark", async ({ page }) => {
    await page.goto("/projects");
    await page.getByTestId("skip-to-main").focus();
    await expect(page.getByTestId("skip-to-main")).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("route error boundary catches deliberate render error (dev route)", async ({ page }) => {
    await page.goto("/e2e-throw");
    await expect(page.getByTestId("route-error-boundary")).toBeVisible();
    await expect(page.getByTestId("route-error-message")).toContainText("E2E deliberate render error");
    await page.getByTestId("route-error-retry").click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByTestId("app-root")).toBeVisible();
  });

  test("project picker is keyboard-focusable", async ({ page }) => {
    await page.goto("/projects");
    const picker = page.getByTestId("project-picker");
    await picker.focus();
    await expect(picker).toBeFocused();
  });
});
