import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const GQL_URL = "http://127.0.0.1:4000/graphql";

async function graphql(
  request: import("@playwright/test").APIRequestContext,
  query: string,
  variables: Record<string, unknown>
) {
  const res = await request.post(GQL_URL, {
    headers: { "Content-Type": "application/json" },
    data: { query, variables }
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as {
    data?: unknown;
    errors?: { message: string }[];
  };
}

test.describe("FE-C requirements", () => {
  test("create and edit requirement", async ({ page }) => {
    const suffix = `${Date.now()}`;
    const projectName = `FE-C ${suffix}`;
    const projectKey = `fe-c-${suffix}`;
    const reqKey = `REQ-${suffix}`;
    const title = `Requirement ${suffix}`;
    const edited = `${title} (edited)`;

    await page.goto("/projects");
    await page.getByTestId("project-create-name").fill(projectName);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const row = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(row).toBeVisible();
    await row.getByTestId("project-open").click();
    await expect(page.getByTestId("project-detail-page")).toBeVisible();

    await page.getByTestId("project-nav-requirements").click();
    await expect(page.getByTestId("requirements-page")).toBeVisible();

    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill(title);
    await page.getByTestId("requirement-create-submit").click();

    const reqRow = page.locator(`tr[data-requirement-key="${reqKey}"]`);
    await expect(reqRow).toBeVisible();
    await reqRow.getByTestId("requirement-open").click();

    await expect(page.getByTestId("requirement-detail-page")).toBeVisible();
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
  });

  test("delete blocked when manual testcase linked shows fixHint", async ({ page, request }) => {
    const suffix = `${Date.now()}-blk`;
    const projectName = `FE-C-blk ${suffix}`;
    const projectKey = `fe-c-b-${suffix}`;
    const reqKey = `REQ-BLK-${suffix}`;

    await page.goto("/projects");
    await page.getByTestId("project-create-name").fill(projectName);
    await page.getByTestId("project-create-key").fill(projectKey);
    await page.getByTestId("project-create-submit").click();

    const prow = page.locator(`tr[data-project-key="${projectKey}"]`);
    await expect(prow).toBeVisible();
    const href = await prow.getByTestId("project-open").getAttribute("href");
    expect(href).toMatch(/^\/projects\/.+/);
    const projectId = href!.slice("/projects/".length);

    await page.goto(`/projects/${projectId}/requirements`);
    await page.getByTestId("requirement-create-key").fill(reqKey);
    await page.getByTestId("requirement-create-title").fill("Linked req");
    await page.getByTestId("requirement-create-submit").click();

    const rrow = page.locator(`tr[data-requirement-key="${reqKey}"]`);
    await expect(rrow).toBeVisible();
    const rHref = await rrow.getByTestId("requirement-open").getAttribute("href");
    expect(rHref).toContain("/requirements/");
    const requirementId = rHref!.split("/requirements/")[1]!;

    const createManual = `
      mutation CreateManualForFeC($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) {
          testCase { id }
          error { code message fixHint }
        }
      }
    `;
    const manualJson = await graphql(request, createManual, {
      input: {
        projectId,
        title: "FE-C blocker manual",
        requirementIds: [requirementId],
        steps: [{ name: "Step 1" }]
      }
    });
    expect(manualJson.errors).toBeUndefined();
    const payload = manualJson.data as {
      createManualTestCase?: { error?: { message: string }; testCase?: { id: string } };
    };
    expect(payload?.createManualTestCase?.error).toBeFalsy();
    expect(payload?.createManualTestCase?.testCase?.id).toBeTruthy();

    await page.goto(`/projects/${projectId}/requirements/${requirementId}`);
    await expect(page.getByTestId("requirement-detail-page")).toBeVisible();
    await page.getByTestId("requirement-delete").click();

    await expect(page.getByTestId("shell-transport-error")).toBeVisible();
    await expect(page.getByTestId("shell-transport-error")).toContainText(/unlink/i);
  });
});
