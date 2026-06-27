import { expect, test } from "@playwright/test";
import { createProjectFromList } from "./helpers/projects";

/**
 * TCMS-TC-R1-01 — create project with unique key.
 * Playwright automation id: e2e/fe-projects-create.spec.ts (TCMS-AUTO-R1-01)
 */
test.describe.configure({ mode: "serial" });

test.describe("FE projects create (TCMS-R1-01)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tcms.lastProjectPath");
      } catch {
        /* ignore */
      }
    });
  });

  test("create project with unique key and open workspace", { tag: "@smoke" }, async ({ page }) => {
    const suffix = `${Date.now()}`;
    const name = `R1 create ${suffix}`;
    const key = `tcms-r1-create-${suffix}`;

    await page.goto("/projects");
    await expect(page.getByTestId("projects-page")).toBeVisible();

    const row = await createProjectFromList(page, { name, key, description: "TCMS-R1-01 disposable project" });
    await expect(row).toHaveAttribute("data-project-key", key);
    await expect(row).toContainText(name);

    await row.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await expect(page.getByTestId("project-detail-key")).toHaveText(key);
  });
});
