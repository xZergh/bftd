import { expect, type Page } from "@playwright/test";

export async function createProjectFromList(
  page: Page,
  input: { name: string; key: string; description?: string }
) {
  await page.getByTestId("nav-projects-menu").click();
  await page.getByTestId("nav-projects-new").click();
  await expect(page.getByTestId("project-create-dialog")).toBeVisible();
  await page.getByTestId("project-create-name").fill(input.name);
  await page.getByTestId("project-create-key").fill(input.key);
  if (input.description !== undefined) {
    await page.getByTestId("project-create-description").fill(input.description);
  }
  await page.getByTestId("project-create-submit").click();
  const row = page.locator(`tr[data-project-key="${input.key}"]`);
  await expect(row).toBeVisible();
  return row;
}
