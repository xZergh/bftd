import { expect, type Page } from "@playwright/test";

/** Keep in sync with `src/seed/tcms-r1-test-cases.ts` (`TCMS_R1_REFERENCE_PROJECT_KEY`). */
export const TCMS_SANDBOX = {
  projectKey: "tcms",
  projectName: "TCMS"
} as const;

export async function expectTcmsSandboxProjectRow(page: Page) {
  const row = page.locator(`tr[data-project-key="${TCMS_SANDBOX.projectKey}"]`);
  await expect(row).toBeVisible({ timeout: 15000 });
  return row;
}
