---
title: "Release Playbook"
type: "note"
status: "active"
source_paths: ["docs/OPERATIONS.md", "package.json", "docs/LOCAL_MANUAL_TESTING.md"]
updated_at: "2026-04-17"
---

Practical pre-release checklist for TCMS maintainers.

## 1) Install and baseline

- `npm ci`
- Confirm Node version matches repository expectation (`>=24 <25`).

## 2) Quality gates

- `npm run ci:typecheck`
- `npm run ci:lint`
- `npm run ci:architecture:boundaries`
- `npm test`
- `npm run ci:schema:check`
- `npm run ci:schema:indexes`
- `npm run ci:migration:fresh`
- `npm run ci:migration:upgrade`
- `npm run ci:security:nonblocking`

## 3) Web and end-to-end checks

- `npm run e2e:install -w tcms-web` (as needed locally)
- `npm run ci:e2e:web`

## 4) Reporting artifacts

- Ensure JUnit exists at `artifacts/junit.xml`.
- Regenerate Allure report when needed: `npm run allure:generate`.
- Verify committed report snapshot expectations in `docs/reports/allure-report.html`.

## 5) Manual sanity checks

- Follow `docs/LOCAL_MANUAL_TESTING.md` for API + web smoke path.
- Confirm KPI dashboard and traceability graph render for a project with sample data.

## 6) Release readiness sign-off

- All CI checks green.
- Required docs updated for contract or behavior changes.
- No unresolved blocker bugs for this release scope.

## Related pages

- `[[features-ci-and-operations]]`
- `[[features-testing-strategy]]`
- `[[flows-kpi-snapshot-lifecycle]]`
