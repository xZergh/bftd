import { expect, test } from "@playwright/test";

test.describe("FE-E2E-0 smoke", () => {
  test("shell loads and GraphQL round-trip via proxy", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("app-root")).toBeVisible();
    await page.getByTestId("check-api").click();
    await expect(page.getByTestId("api-ok")).toContainText("projects");
  });
});
