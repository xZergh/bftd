import { expect, test } from "@playwright/test";

test.describe("FE-H design links", () => {
  test("upsert lists and unlink Penpot link", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectKey = `fe-h-${suffix}`;
    const reqKey = `REQ-H-${suffix}`;
    const shareUrl = `https://design.example/penpot/fe-h-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("project-create-name").fill(`FE-H ${suffix}`);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();
    await page.locator(`tr[data-project-key="${projectKey}"]`).getByTestId("project-open").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-requirements").click();
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(`Req for design ${suffix}`);
    await page.getByTestId("requirement-create-submit").click();
    await expect(page.locator(`tr[data-requirement-key="${reqKey}"]`)).toBeVisible();

    await page.getByTestId("project-nav-project").click();
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
