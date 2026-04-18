---
title: "Web shell polish (FE-J)"
type: "feature"
status: "active"
source_paths:
  - "apps/web/src/components/PageLoading.tsx"
  - "apps/web/src/layout/AppShell.tsx"
  - "apps/web/src/layout/AppShell.css"
  - "apps/web/src/layout/RouteErrorBoundary.tsx"
  - "apps/web/src/pages/E2eThrowRoute.tsx"
  - "apps/web/src/App.tsx"
  - "apps/web/src/components/ProjectPicker.tsx"
  - "apps/web/e2e/fe-j-polish.spec.ts"
  - "apps/web/package.json"
  - "package.json"
updated_at: "2026-04-09"
---

## Purpose

Consistent async UI feedback, resilient route rendering, keyboard-first shell affordances, and a **tagged smoke** subset for fast regression.

## PageLoading

- Shared component (`apps/web/src/components/PageLoading.tsx`) used for list toolbars, detail first-fetch states, reporting sub-panels, and home query status.
- Uses `role="status"` and `aria-live="polite"`; supports `inline` for toolbar rows and optional `message` / `dataTestId`.

## App shell

- **Skip link** (`data-testid="skip-to-main"`) targets `#main-content` on `<main tabIndex={-1}>` so keyboard users can jump past chrome (`apps/web/src/layout/AppShell.tsx`, `AppShell.css`).
- **Route error boundary** wraps `<Outlet />` so a child render error shows a recovery panel instead of a blank main (`RouteErrorBoundary.tsx`).

## Dev-only E2E hook

- When `import.meta.env.DEV`, `App.tsx` registers `/e2e-throw` rendering `E2eThrowRoute`, which throws on mount so Playwright can assert the boundary. Not present in production builds.

## Project picker

- `<select data-testid="project-picker">` includes `aria-label="Select project"` for screen-reader context.

## Smoke tagging

- `apps/web/e2e/fe-e2e-0-smoke.spec.ts` tags the shell/API round-trip test with `@smoke`.
- `apps/web`: `npm run e2e:smoke` runs `playwright test --grep @smoke`.
- Repo root: `npm run e2e:smoke:web` delegates to the workspace script.

## Related pages

- `[[features-apps-web-src-app-tsx]]`
- `[[features-testing-strategy]]`
- `[[features-ci-and-operations]]`
