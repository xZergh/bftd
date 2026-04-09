import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "tcms-api",
      command: "npm run start:e2e-api",
      cwd: repoRoot,
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      name: "tcms-web",
      command: "npm run dev",
      cwd: here,
      url: "http://127.0.0.1:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      dependencies: ["tcms-api"]
    }
  ]
});
