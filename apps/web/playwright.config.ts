import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");
const e2eApiPort = process.env.TCMS_E2E_API_PORT ?? "4001";
const e2eWebPort = process.env.TCMS_E2E_WEB_PORT ?? "5174";
const e2eApiUrl = `http://127.0.0.1:${e2eApiPort}`;
const e2eWebUrl = `http://127.0.0.1:${e2eWebPort}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: e2eWebUrl,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium-demo-qa",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [
        "**/fe-c-requirements.spec.ts",
        "**/fe-d-testcases.spec.ts",
        "**/fe-f-reporting.spec.ts",
        "**/fe-j-plans.spec.ts",
        "**/fe-m-project-subnav.spec.ts"
      ],
      fullyParallel: false
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [
        "**/fe-k-mobile-shell.spec.ts",
        "**/fe-c-requirements.spec.ts",
        "**/fe-d-testcases.spec.ts",
        "**/fe-f-reporting.spec.ts",
        "**/fe-j-plans.spec.ts",
        "**/fe-m-project-subnav.spec.ts"
      ]
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
      testMatch: "**/fe-k-mobile-shell.spec.ts"
    }
  ],
  webServer: [
    {
      name: "tcms-api",
      command: `npm run e2e:reset-db && cross-env DB_PATH=./data/e2e-playwright.sqlite PORT=${e2eApiPort} tsx src/server.ts`,
      cwd: repoRoot,
      url: `${e2eApiUrl}/health`,
      reuseExistingServer: process.env.TCMS_E2E_REUSE_SERVERS === "1",
      timeout: 120_000
    },
    {
      name: "tcms-web",
      command: `cross-env VITE_API_PROXY_TARGET=${e2eApiUrl} npm run dev -- --port ${e2eWebPort} --strictPort`,
      cwd: here,
      url: e2eWebUrl,
      reuseExistingServer: process.env.TCMS_E2E_REUSE_SERVERS === "1",
      timeout: 120_000,
      dependencies: ["tcms-api"]
    }
  ]
});
