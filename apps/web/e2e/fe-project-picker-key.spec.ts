import { expect, test } from "@playwright/test";
import { createProjectFromList } from "./helpers/projects";

/**
 * TCMS-TC-R1-03 — project key shown in shell picker.
 * Playwright automation id: e2e/fe-project-picker-key.spec.ts (TCMS-AUTO-R1-03)
 */
test.describe.configure({ mode: "serial" });

test.describe("FE project picker key (TCMS-R1-03)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tcms.lastProjectPath");
      } catch {
        /* ignore */
      }
    });
  });

  test("shell picker labels include project keys", { tag: "@smoke" }, async ({ page }) => {
    const suffix = `${Date.now()}`;
    const nameA = `Picker A ${suffix}`;
    const keyA = `tcms-r1-pick-a-${suffix}`;
    const nameB = `Picker B ${suffix}`;
    const keyB = `tcms-r1-pick-b-${suffix}`;

    await page.goto("/projects");
    const rowA = await createProjectFromList(page, { name: nameA, key: keyA });
    const hrefA = await rowA.getByTestId("project-name-link").getAttribute("href");
    expect(hrefA).toMatch(/^\/projects\/.+/);
    const projectAId = hrefA!.replace("/projects/", "").split("/")[0]!;

    await page.goto("/projects");
    const rowB = await createProjectFromList(page, { name: nameB, key: keyB });
    const hrefB = await rowB.getByTestId("project-name-link").getAttribute("href");
    expect(hrefB).toMatch(/^\/projects\/.+/);
    const projectBId = hrefB!.replace("/projects/", "").split("/")[0]!;

    await page.goto(`/projects/${projectAId}`);
    const picker = page.getByTestId("project-picker");
    await expect(picker.locator(`option[value="${projectAId}"]`)).toContainText(`(${keyA})`);
    await expect(picker.locator(`option[value="${projectBId}"]`)).toContainText(`(${keyB})`);

    await picker.selectOption(projectBId);
    await expect(page.getByTestId("project-detail-key")).toHaveText(keyB);

    await picker.selectOption(projectAId);
    await expect(page.getByTestId("project-detail-key")).toHaveText(keyA);
  });
});
