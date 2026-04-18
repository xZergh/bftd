---
title: "CI And Operations"
type: "feature"
status: "active"
source_paths: ["docs/OPERATIONS.md", "package.json", "scripts/ci/check-architecture-boundaries.ts", "vitest.config.ts"]
updated_at: "2026-04-17"
---

This page captures delivery guardrails and operational quality gates for TCMS.

## CI gate stack

- Typecheck, lint, architecture boundaries, tests, schema checks, migration checks, and security checks.
- Schema contract and index alignment are checked via dedicated CI scripts.
- Allure/JUnit artifacts are part of reporting outputs.

## Test execution policy

- CI uses retry behavior and emits JUnit output to `artifacts/junit.xml`.
- Coverage is enabled with baseline thresholds and reports under `artifacts/coverage`.
- Optional Allure setup can be skipped via `CI_SKIP_ALLURE=1`.

## Release operations

- Release readiness expects green CI gates, updated docs, migration integrity, and KPI/reporting sanity.
- Operations guidance explicitly tracks phased blocking vs non-blocking checks.

## Related pages

- `[[features-testing-strategy]]`
- `[[concepts-architecture-boundaries]]`
- `[[features-src-graphql-type-defs-ts]]`
