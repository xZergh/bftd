import { defineConfig } from "vitest/config";

const skipAllure = process.env.CI_SKIP_ALLURE === "1";

export default defineConfig({
  test: {
    retry: process.env.CI ? 2 : 0,
    setupFiles: skipAllure ? [] : ["allure-vitest/setup"],
    include: ["tests/**/*.test.ts"],
    reporters: skipAllure
      ? ["default", "junit"]
      : [
          "default",
          "junit",
          ["allure-vitest/reporter", { resultsDir: "artifacts/allure-results" }]
        ],
    outputFile: {
      junit: "artifacts/junit.xml"
    },
    coverage: {
      enabled: true,
      provider: "v8",
      reporter: ["text", "json-summary"],
      reportsDirectory: "artifacts/coverage",
      thresholds: {
        lines: 40,
        functions: 35,
        branches: 30,
        statements: 40
      }
    }
  }
});
