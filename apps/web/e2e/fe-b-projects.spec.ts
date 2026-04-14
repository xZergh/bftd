import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("FE-B projects", () => {
  test("create project, open detail, archive, hidden until show archived", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const name = `FE-B Project ${suffix}`;
    const key = `fe-b-${suffix}`;

    await page.goto("/projects");
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.getByTestId("project-picker")).toBeVisible();

    await page.getByTestId("project-create-name").fill(name);
    await page.getByTestId("project-create-key").fill(key);
    await page.getByTestId("project-create-submit").click();

    const row = page.locator(`tr[data-project-key="${key}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(name);

    await row.getByTestId("project-open").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await expect(page.getByTestId("project-detail-key")).toHaveText(key);
    await expect(page.getByTestId("project-detail-status")).toContainText("Active");

    await page.getByTestId("project-archive").click();
    await expect(page).toHaveURL(/\/projects$/);

    await expect(page.locator(`tr[data-project-key="${key}"]`)).toHaveCount(0);

    await page.getByTestId("project-list-include-archived").check();
    const archivedRow = page.locator(`tr[data-project-key="${key}"]`);
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow.getByTestId("project-archived-badge")).toBeVisible();
  });

  test("project picker navigates to selected project", async ({ page }) => {
    const suffix = `${Date.now()}-picker`;
    const name = `Picker ${suffix}`;
    const key = `fe-b-p-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("project-create-name").fill(name);
    await page.getByTestId("project-create-key").fill(key);
    await page.getByTestId("project-create-submit").click();

    const row = page.locator(`tr[data-project-key="${key}"]`);
    await expect(row).toBeVisible();
    const href = await row.getByTestId("project-open").getAttribute("href");
    expect(href).toMatch(/^\/projects\/.+/);
    const projectId = href!.slice("/projects/".length);

    await page.goto("/");
    await page.getByTestId("project-picker").selectOption(projectId);
    await expect(page.url()).toContain(`/projects/${projectId}`);
    await expect(page.getByTestId("project-detail-key")).toHaveText(key);
  });
});
