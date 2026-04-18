---
title: "Testing Strategy"
type: "feature"
status: "active"
source_paths:
  - "docs/DEVELOPER_GUIDE.md"
  - "vitest.config.ts"
  - "tests/unit/service.test.ts"
  - "tests/integration/graphql-core.test.ts"
  - "tests/helpers/test-app.ts"
  - "tests/helpers/test-service.ts"
  - "apps/web/playwright.config.ts"
  - "apps/web/e2e/fe-e2e-0-smoke.spec.ts"
updated_at: "2026-04-09"
---

Testing is split into **backend** unit/integration suites with shared helpers and deterministic error assertions, plus **web** Playwright end-to-end coverage.

## Backend structure

- Unit tests (`tests/unit`) validate service-level rules and error codes quickly.
- Integration tests (`tests/integration`) exercise GraphQL API behavior and persistence semantics.
- Helpers in `tests/helpers` centralize app/service test setup.

## Backend patterns

- Assertions prioritize deterministic error codes and fix hints for invalid operations.
- Integration tests verify API payload shape for core user flows (project/summary, testcase validation, imports, traceability, KPI).
- Vitest config enables CI retries and coverage thresholds.

## Web E2E (Playwright)

- Config: `apps/web/playwright.config.ts` starts `tcms-api` and `tcms-web` for tests.
- Phase specs live under `apps/web/e2e/` (`fe-a` through `fe-j`).
- **Smoke subset:** tests tagged `@smoke` (currently the FE-E2E-0 shell round-trip) via `npm run e2e:smoke` in `apps/web`, or `npm run e2e:smoke:web` from the repo root.

## Related pages

- `[[concepts-error-contract]]`
- `[[features-src-graphql-resolvers-ts]]`
- `[[features-ci-and-operations]]`
- `[[features-apps-web-shell-polish]]`
