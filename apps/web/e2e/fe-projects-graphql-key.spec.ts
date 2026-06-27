import { expect, test } from "@playwright/test";
import { graphqlQuery } from "./helpers/graphql";
import { TCMS_SANDBOX } from "./fixtures/tcms-sandbox";

/**
 * TCMS-TC-R1-04 — GraphQL resolves project by key.
 * Playwright automation id: e2e/fe-projects-graphql-key.spec.ts (TCMS-AUTO-R1-04)
 */
test.describe.configure({ mode: "serial" });

type ProjectByKeyData = {
  project: { id: string; key: string; name: string } | null;
};

test.describe("FE projects GraphQL key (TCMS-R1-04)", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.removeItem("tcms.lastProjectPath");
      } catch {
        /* ignore */
      }
    });
  });

  test("GraphQL project by key matches UI workspace", { tag: "@smoke" }, async ({ page, request }) => {
    const projectKey = TCMS_SANDBOX.projectKey;

    const data = await graphqlQuery<ProjectByKeyData>(
      request,
      `query ProjectByKey($key: String!) {
        project(input: { key: $key }) {
          id
          key
          name
        }
      }`,
      { key: projectKey }
    );
    expect(data.project).not.toBeNull();
    const gqlProject = data.project!;

    await page.goto(`/projects/${gqlProject.id}`);
    await expect(page.getByTestId("project-detail-page")).toBeVisible();
    await expect(page.getByTestId("project-detail-key")).toHaveText(gqlProject.key);
    expect(gqlProject.key).toBe(projectKey);
  });
});
