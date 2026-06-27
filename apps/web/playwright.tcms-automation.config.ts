import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for TCMS "Run linked automation".
 *
 * Preconditions (see docs/plans/plan-automation-local.md):
 * 1. Main TCMS UI: npm run dev:api + npm run dev:web (4010 / 5180, tcms.sqlite)
 * 2. Automation sandbox: npm run seed:plan-automation-db, then dev:automation-api + dev:automation-web (4012 / 5182, plan-automation.sqlite)
 * 3. Playwright hits the sandbox web URL only — it must not use tcms.sqlite.
 */
const webUrl = process.env.TCMS_WEB_URL ?? process.env.TCMS_AUTOMATION_WEB_URL ?? "http://127.0.0.1:5182";
const ctrfOutputDir = process.env.TCMS_RUN_CTRF_OUTPUT_DIR;
const ctrfOutputFile = process.env.TCMS_RUN_CTRF_OUTPUT_FILE;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  use: {
    baseURL: webUrl,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: ["**/fe-k-mobile-shell.spec.ts"]
    }
  ],
  reporter:
    ctrfOutputDir && ctrfOutputFile
      ? [
          [
            "playwright-ctrf-json-reporter",
            {
              outputDir: ctrfOutputDir,
              outputFile: ctrfOutputFile,
              screenshot: true
            }
          ],
          ["list"]
        ]
      : [["list"]]
});
