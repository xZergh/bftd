import { expect, test } from "@playwright/test";

test.describe("FE-A app shell", () => {
  test("home loads, navigate to projects placeholder, GraphQL transport error surfaces", async ({
    page
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-root")).toBeVisible();
    await expect(page.getByTestId("nav-projects")).toBeVisible();

    await page.getByTestId("nav-projects").click();
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByTestId("projects-page")).toBeVisible();

    await page.getByTestId("nav-home").click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByTestId("trigger-graphql-error").click();
    await expect(page.getByTestId("shell-transport-error")).toBeVisible();
    await expect(page.getByTestId("shell-transport-error")).toContainText("Cannot query field");
  });

  test("AppError payload from mutation shows code, message, fixHint", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("trigger-app-error").click();
    await expect(page.getByTestId("shell-app-error")).toBeVisible();
    await expect(page.getByTestId("shell-app-error-code")).toHaveText("PROJECT_KEY_CONFLICT");
    await expect(page.getByTestId("shell-app-error-fixhint")).toContainText(/key|omit|auto/i);
  });

  test("Load projects via urql (smoke parity)", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("check-api").click();
    await expect(page.getByTestId("api-ok")).toContainText("projects");
  });
});
