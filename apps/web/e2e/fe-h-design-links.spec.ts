import { expect, test } from "@playwright/test";
import { createRequirementOnListPage } from "./helpers/workspace";

test.describe("FE-H design links", () => {
  test("upsert lists and unlink Penpot link", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-h-${suffix}`;
    const reqKey = `REQ-H-${suffix}`;
    const shareUrl = `https://design.example/penpot/fe-h-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("nav-projects-menu").click();
    await page.getByTestId("nav-projects-new").click();
    await page.getByTestId("project-create-name").fill(`FE-H ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();
    await page.locator(`tr[data-project-key="${projectKey}"]`).getByTestId("project-name-link").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-requirements").click();
    await createRequirementOnListPage(page, { key: reqKey, title: `Req for design ${suffix}` });

    await page.getByTestId("project-nav-overview").click();
    await page.getByTestId("project-nav-design-links").click();
    await expect(page.getByTestId("design-links-page")).toBeVisible();

    await page.getByTestId("design-link-requirement").selectOption({ label: `${reqKey}: Req for design ${suffix}` });
    await page.getByTestId("design-link-share-url").fill(shareUrl);
    await page.getByTestId("design-link-title").fill(`Board ${suffix}`);
    await page.getByTestId("design-link-project-id").fill(`penpot-proj-${suffix}`);
    await page.getByTestId("design-link-file-id").fill("file-1");
    await page.getByTestId("design-link-page-id").fill("page-1");
    await page.getByTestId("design-link-node-id").fill("node-1");
    await page.getByTestId("design-link-submit").click();

    const rowByUrl = page.getByTestId("design-link-row").filter({ has: page.locator(`a[href="${shareUrl}"]`) });
    await expect(rowByUrl).toHaveCount(1, { timeout: 10000 });
    const row = rowByUrl.first();
    await expect(row.getByTestId("design-link-row-title")).toHaveText(`Board ${suffix}`);

    await page.getByTestId("design-link-title").fill(`Board updated ${suffix}`);
    await page.getByTestId("design-link-submit").click();
    await expect(rowByUrl).toHaveCount(1, { timeout: 10000 });
    await expect(row.getByTestId("design-link-row-title")).toHaveText(`Board updated ${suffix}`, { timeout: 10000 });

    await row.getByTestId("design-link-unlink").click();
    await expect(rowByUrl).toHaveCount(0, { timeout: 10000 });
    await expect(page.getByTestId("design-links-empty")).toBeVisible();
  });
});
