---
title: "Web UI testing (Playwright + Vitest)"
type: "feature"
status: "active"
source_paths:
  - "apps/web/playwright.config.ts"
  - "apps/web/e2e"
  - "apps/web/vitest.config.ts"
  - "apps/web/src/components/PageLoading.test.tsx"
updated_at: "2026-04-19"
---

## Playwright (E2E)

- **Config:** [`apps/web/playwright.config.ts`](apps/web/playwright.config.ts) starts `tcms-api` (`npm run start:e2e-api` at repo root) then `tcms-web` dev server.
- **Desktop:** project `chromium` runs all specs **except** [`apps/web/e2e/fe-k-mobile-shell.spec.ts`](apps/web/e2e/fe-k-mobile-shell.spec.ts).
- **Narrow viewport:** project `mobile-chrome` uses `devices['Pixel 5']` and **only** FE-K, guarding shell + projects list layout on small screens.

Root scripts: `npm run e2e:web`, `npm run ci:e2e:web`, `npm run e2e:smoke:web`.

## Vitest + Testing Library

- **Config:** [`apps/web/vitest.config.ts`](apps/web/vitest.config.ts) mirrors Tamagui/Vite aliases and sets `process.env.NODE_ENV` for tests.
- **Unit/component example:** [`apps/web/src/components/PageLoading.test.tsx`](apps/web/src/components/PageLoading.test.tsx) wraps components in `TamaguiProvider`; [`apps/web/src/test-setup.ts`](apps/web/src/test-setup.ts) loads `@testing-library/jest-dom` and stubs `window.matchMedia`.

Commands: `npm run test -w tcms-web` (package) or `npm run test:web` from repo root.

## Related

- `[[features-apps-web-shell-polish]]`
- `[[concepts-ui-qa-layout-tamagui-and-mobile]]`
