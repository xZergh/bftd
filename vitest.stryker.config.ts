import { defineConfig } from "vitest/config";

/** Vitest config used only by Stryker (no Allure/JUnit/coverage — faster inner runs). */
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    reporters: ["default"],
    retry: 0,
    coverage: { enabled: false }
  }
});
