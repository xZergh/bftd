import { expect, test } from "@playwright/test";
import { createProjectFromList } from "./helpers/projects";

/**
 * TCMS-TC-R1-05 — archived project hidden from default Projects list.
 * Playwright automation id: e2e/fe-projects-archive.spec.ts (TCMS-AUTO-R1-05)
 */
test.describe.configure({ mode: "serial" });

test.describe("FE projects archive (TCMS-R1-05)", () => {
  let disposableKey: string | undefined;

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tcms.lastProjectPath");
      } catch {
        /* ignore */
      }
    });
  });

  test.afterEach(async ({ page }) => {
    if (disposableKey === undefined) {
      return;
    }
    const key = disposableKey;
    disposableKey = undefined;

    await page.goto("/projects");
    const showArchived = page.getByTestId("project-list-include-archived-switch");
    if (!(await showArchived.isChecked())) {
      await showArchived.click();
    }
    const row = page.locator(`tr[data-project-key="${key}"]`);
    const restore = row.getByTestId("project-restore-row");
    if ((await restore.count()) > 0) {
      await restore.click();
      await expect(restore).toHaveCount(0);
    }
  });

  test("create disposable project, archive from list, hidden until show archived", { tag: "@smoke" }, async ({ page }) => {
    const suffix = `${Date.now()}`;
    const name = `Archive test ${suffix}`;
    const key = `tcms-archive-test-${suffix}`;
    disposableKey = key;

    await page.goto("/projects");
    await expect(page.getByTestId("projects-page")).toBeVisible();

    const row = await createProjectFromList(page, { name, key, description: "TCMS-R1-05 disposable project" });
    await expect(row).toContainText(name);

    await row.getByTestId("project-archive-row").click();
    await expect(page.locator(`tr[data-project-key="${key}"]`)).toHaveCount(0);

    await page.getByTestId("project-list-include-archived-switch").click();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();

    const archivedRow = page.locator(`tr[data-project-key="${key}"]`);
    await expect(archivedRow).toBeVisible();
    await expect(archivedRow.getByTestId("project-archived-badge")).toBeVisible();
    await expect(archivedRow).toContainText(name);
  });
});
