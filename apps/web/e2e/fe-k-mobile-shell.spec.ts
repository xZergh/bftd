import { expect, test } from "@playwright/test";

test.describe("FE-K mobile viewport shell", () => {
  test("projects list is usable on a narrow viewport", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.getByTestId("project-create-panel")).toBeVisible();
    await expect(page.getByTestId("project-picker")).toBeVisible();
  });
});
