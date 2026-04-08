import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/** Balanced baseline: strict TS via `tsc`, ESLint for obvious issues + no-explicit-any. */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "drizzle/**",
      "coverage/**",
      "artifacts/**",
      "**/*.js",
      "**/*.mjs",
      "vitest.config.ts",
      "vitest.stryker.config.ts"
    ]
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-require-imports": "off"
    }
  }
);
