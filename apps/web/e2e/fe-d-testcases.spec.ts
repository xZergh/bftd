import { expect, test } from "@playwright/test";
import { createManualTestCaseOnListPage, createRequirementOnListPage } from "./helpers/workspace";

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
    const projectId = page.url().match(/\/projects\/([^/]+)/)?.[1];
    expect(projectId).toBeTruthy();

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();
    await createRequirementOnListPage(page, { key: reqKey, title: reqTitle });

    await page.getByTestId("project-nav-overview").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    await createManualTestCaseOnListPage(page, { title: manualTitle, reqKey, stepName });

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await page.goto(`/projects/${projectId}/test-cases/${manualId}`);
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await page.getByTestId("testcase-back-list").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();

    expect(renderPhaseWarnings, renderPhaseWarnings.join("\n")).toEqual([]);
  });

  test("manual linked to requirement; automated via TRR import; tombstone and restore", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectName = `FE-D ${suffix}`;
    const projectKey = `fe-d-${suffix}`;
    const reqKey = `REQ-${suffix}`;
    const reqTitle = `Requirement ${suffix}`;
    const manualTitle = `Manual TC ${suffix}`;
    const autoTitle = `Auto TC ${suffix}`;
    const autoExternalId = `fe-d-auto-${suffix}`;
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
    const projectId = page.url().match(/\/projects\/([^/]+)/)?.[1];
    expect(projectId).toBeTruthy();

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();
    await createRequirementOnListPage(page, { key: reqKey, title: reqTitle });

    await page.getByTestId("project-nav-test-cases").click();
    await expect(page.getByTestId("testcases-page")).toBeVisible();
    await createManualTestCaseOnListPage(page, { title: manualTitle, reqKey, stepName });

    const manualRow = page.locator(`tr[data-testid="testcase-row"]`).filter({ hasText: manualTitle });
    await expect(manualRow).toBeVisible();
    const manualId = await manualRow.getAttribute("data-testcase-id");
    expect(manualId).toBeTruthy();

    await manualRow.click();
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await expect(page.getByTestId("testcase-linked-req-title")).toContainText(reqTitle);

    await page.getByTestId("project-nav-imports").click();
    await expect(page.getByTestId("imports-page")).toBeVisible();
    await page.getByTestId("import-tab-trr").click();

    const trrPayload = JSON.stringify([
      {
        externalId: autoExternalId,
        title: autoTitle,
        linkedManualCaseIds: [manualId],
        steps: [{ order: 1, name: "Automated placeholder step", sourceStepId: "s-1" }]
      }
    ]);
    await page.getByTestId("import-trr-json").fill(trrPayload);
    await page.getByTestId("import-trr-submit").click();
    await expect(page.getByTestId("import-trr-result-created")).toHaveText("1", { timeout: 10000 });

    await page.getByTestId("project-nav-automation").click();
    await expect(page.getByTestId("automation-page")).toBeVisible();
    await page.getByTestId("automation-tab-automated").click();

    const autoRow = page.locator(`tr[data-testid="automation-automated-row"]`).filter({ hasText: autoTitle });
    await expect(autoRow).toBeVisible();
    const autoId = await autoRow.getAttribute("data-testcase-id");
    expect(autoId).toBeTruthy();

    await page.goto(`/projects/${projectId}/test-cases/${autoId}`);
    await expect(page.getByTestId("testcase-detail-page")).toBeVisible();
    await expect(page.getByTestId("testcase-linked-manual-title")).toContainText(manualTitle);

    await page.getByTestId("testcase-tombstone").click();
    await expect(page.getByTestId("testcase-detail-status")).toContainText("Deleted");
    await expect(page.getByTestId("testcase-deleted-banner")).toBeVisible();

    await page.getByTestId("testcase-restore").click();
    await expect(page.getByTestId("testcase-detail-status")).not.toContainText("Deleted");
    await expect(page.getByTestId("testcase-linked-manual-title")).toContainText(manualTitle);
  });
});
