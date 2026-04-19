import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("FE-B projects", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tcms.lastProjectPath");
      } catch {
        /* ignore */
      }
    });
  });

  test("create project, open detail, archive, hidden until show archived", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const name = `FE-B Project ${suffix}`;
    const key = `fe-b-${suffix}`;
    const desc = `FE-B description ${suffix}`;

    await page.goto("/projects");
    await expect(page.getByTestId("projects-page")).toBeVisible();
    await expect(page.getByTestId("project-picker")).toBeVisible();

    await expect(page.getByRole("columnheader", { name: "Key" })).toHaveCount(0);
    await expect(page.getByRole("columnheader", { name: "Status" })).toHaveCount(0);

    await page.getByTestId("nav-projects-new").click();
    await expect(page).toHaveURL(/[?&]new=1/);
    await expect(page.getByTestId("project-create-dialog")).toBeVisible();

    await page.getByTestId("project-create-name").fill(name);
    await page.getByTestId("project-create-key").fill(key);
    await page.getByTestId("project-create-description").fill(desc);
    await page.getByTestId("project-create-submit").click();

    const row = page.locator(`tr[data-project-key="${key}"]`);
    await expect(row).toBeVisible();
    await expect(row).toContainText(name);
    await expect(row).toContainText(desc);

    await row.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await expect(page.getByTestId("project-detail-key")).toHaveText(key);
    await expect(page.getByTestId("project-detail-status")).toContainText("Active");

    const renamed = `${name} (autosaved)`;
    await page.getByTestId("project-edit-name").fill(renamed);
    await expect(page.getByTestId("form-save-status")).toHaveAttribute("data-save-state", "saved", {
      timeout: 8000
    });
    await expect(page.getByTestId("project-edit-name")).toHaveValue(renamed);

    await page.getByTestId("project-archive").click();
    await expect(page).toHaveURL(/\/projects$/);

    await expect(page.locator(`tr[data-project-key="${key}"]`)).toHaveCount(0);

    await page.getByTestId("project-list-include-archived-switch").click();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();

    const archivedRow = page.locator(`tr[data-project-key="${key}"]`);
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow.getByTestId("project-archived-badge")).toBeVisible();
  });

  test("project picker navigates to selected project", async ({ page }) => {
    const suffix = `${Date.now()}-picker`;
    const name = `Picker ${suffix}`;
    const key = `fe-b-p-${suffix}`;

    await page.goto("/projects?new=1");
    await page.getByTestId("project-create-name").fill(name);
    await page.getByTestId("project-create-key").fill(key);
    await page.getByTestId("project-create-submit").click();

    const row = page.locator(`tr[data-project-key="${key}"]`);
    await expect(row).toBeVisible();
    const href = await row.getByTestId("project-name-link").getAttribute("href");
    expect(href).toMatch(/^\/projects\/.+/);
    const projectId = href!.replace("/projects/", "").split("/")[0]!;

    await page.goto("/");
    await expect(page).toHaveURL(/\/projects$/);
    await page.getByTestId("project-picker").selectOption(projectId);
    await expect(page.url()).toContain(`/projects/${projectId}`);
    await expect(page.getByTestId("project-detail-key")).toHaveText(key);
  });
});
