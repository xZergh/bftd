import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test.describe("FE-D test cases", () => {
  test("no React cross-render update warnings on testcase list/detail navigation", async ({ page }) => {
    const renderPhaseWarnings: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("Cannot update a component")) {
        renderPhaseWarnings.push(msg.text());
      }
    });

    const suffix = `${Date.now()}-rx`;
    const projectName = `FE-D-rx ${suffix}`;
    const projectKey = `fe-d-rx-${suffix}`;
    const reqKey = `REQ-${suffix}`;
    const reqTitle = `Requirement ${suffix}`;
    const manualTitle = `Manual TC ${suffix}`;
    const stepName = `Step one ${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(projectName);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(reqTitle);
    await page.getByTestId("requirement-create-submit").click();
    await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

    await page.getByTestId("project-nav-project").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    await page.getByTestId("testcase-create-type").selectOption("manual");
    await page.getByTestId("testcase-create-title").fill(manualTitle);
    await page.getByTestId(`testcase-create-manual-req-${reqKey}`).check();
    await page.getByTestId("testcase-create-manual-step-name-0").fill(stepName);
    await page.getByTestId("testcase-create-submit").click();

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    await manualRow.getByTestId("testcase-open").click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    expect(renderPhaseWarnings, renderPhaseWarnings.join("\n")).toEqual([]);
  });

  test("manual linked to requirement; automated linked to manual; tombstone and restore", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectName = `FE-D ${suffix}`;
    const projectKey = `fe-d-${suffix}`;
    const reqKey = `REQ-${suffix}`;
    const reqTitle = `Requirement ${suffix}`;
    const manualTitle = `Manual TC ${suffix}`;
    const autoTitle = `Auto TC ${suffix}`;
    const stepName = `Step one ${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(projectName);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    await prow.getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(reqTitle);
    await page.getByTestId("requirement-create-submit").click();
    const rrow = page.locator(`tr[data-requirement-key="${reqKey}"]`);
    await expect(rrow).toBeVisible();

    await page.getByTestId("project-nav-project").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    await page.getByTestId("testcase-create-type").selectOption("manual");
    await page.getByTestId("testcase-create-title").fill(manualTitle);
    await page.getByTestId(`testcase-create-manual-req-${reqKey}`).check();
    await page.getByTestId("testcase-create-manual-step-name-0").fill(stepName);
    await page.getByTestId("testcase-create-submit").click();

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await page.getByTestId("testcase-create-type").selectOption("automated");
    await page.getByTestId("testcase-create-title").fill(autoTitle);
    await expect(page.getByTestId("testcase-create-auto-manuals")).toBeVisible({ timeout: 8000 });

    await manualRow.getByTestId("testcase-open").click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await expect(page.getByTestId("testcase-detail-type")).toHaveText("manual");
    await expect(page.getByTestId("testcase-linked-req-title")).toContainText(reqTitle);

    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    await page.getByTestId("testcase-create-type").selectOption("automated");
    await page.getByTestId("testcase-create-title").fill(autoTitle);
    await page.getByTestId(`testcase-create-auto-manual-${manualId}`).check();
    await page.getByTestId("testcase-create-submit").click();

    const autoRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: autoTitle });
    await expect(autoRow).toBeVisible();
    await autoRow.getByTestId("testcase-open").click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await expect(page.getByTestId("testcase-detail-type")).toHaveText("automated");
    await expect(page.getByTestId("testcase-linked-manual-title")).toContainText(manualTitle);

    await page.getByTestId("testcase-tombstone").click();
    await expect(page.getByTestId("testcase-detail-status")).toContainText("Deleted");
    await expect(page.getByTestId("testcase-deleted-banner")).toBeVisible();

    await page.getByTestId("testcase-restore").click();
    await expect(page.getByTestId("testcase-detail-status")).not.toContainText("Deleted");
    await expect(page.getByTestId("testcase-linked-manual-title")).toContainText(manualTitle);
  });
});
