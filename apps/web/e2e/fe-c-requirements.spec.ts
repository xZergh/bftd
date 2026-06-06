import { expect, test } from "@playwright/test";
import { DEMO, demoProjectIdFromPage, openDemoRequirements } from "./fixtures/demo-qa";

test.describe.configure({ mode: "serial" });

test.describe("FE-C requirements (DEMO-QA)", () => {
  test("edit requirement on DEMO-R3", async ({ page }) => {
    await openDemoRequirements(page);

    const reqKey = DEMO.requirements.R3;
    const reqRow = page.locator(`tr[data-requirement-key="${reqKey}"]`);
    await expect(reqRow).toBeVisible();
    await reqRow.getByTestId("requirement-open").click();

    await expect(page.getByTestId("requirement-detail-page")).toBeVisible();
    const original = DEMO.requirementTitles.R3;
    await expect(page.getByTestId("requirement-edit-title")).toHaveValue(original, { timeout: 8000 });
    const edited = `${original} (edited)`;
    await page.getByTestId("requirement-edit-title").fill(edited);
    await expect(page.getByTestId("form-save-status")).toHaveAttribute("data-save-state", "saved", {
      timeout: 8000
    });
    await expect(page.getByTestId("requirement-edit-title")).toHaveValue(edited);

    await page.getByTestId("requirement-edit-title").clear();
    await expect(page.getByTestId("requirement-edit-title")).toHaveValue("");
    await page.getByTestId("requirement-save").click();
    await expect(page.getByTestId("requirement-edit-title-error")).toBeVisible();
    await expect(page.getByTestId("validation-error-payload-preview")).toBeVisible();
    await expect(page.getByTestId("validation-error-payload-json")).toContainText("UpdateRequirement");

    await page.getByTestId("requirement-edit-title").fill(original);
    await expect(page.getByTestId("form-save-status")).toHaveAttribute("data-save-state", "saved", {
      timeout: 8000
    });
  });

  test("delete blocked when manual testcase linked shows fixHint", async ({ page }) => {
    const projectId = await demoProjectIdFromPage(page);
    const reqKey = DEMO.requirements.R1;

    await page.goto(`/projects/${projectId}/requirements`);
    await expect(page.getByTestId("requirements-page")).toBeVisible();

    const rrow = page.locator(`tr[data-requirement-key="${reqKey}"]`);
    await expect(rrow).toBeVisible();
    const rHref = await rrow.getByTestId("requirement-open").getAttribute("href");
    expect(rHref).toContain("/requirements/");
    const requirementId = rHref!.split("/requirements/")[1]!;

    await page.goto(`/projects/${projectId}/requirements/${requirementId}`);
    await expect(page.getByTestId("requirement-detail-page")).toBeVisible();
    await page.getByTestId("requirement-delete").click();

    await expect(page.getByTestId("shell-transport-error")).toBeVisible();
    await expect(page.getByTestId("shell-transport-error")).toContainText(/unlink/i);
  });
});
