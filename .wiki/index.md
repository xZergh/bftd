---
title: "Project Wiki"
type: "index"
status: "active"
last_commit: "a77e32279703922c9fcd0e3cfbcc4eb2186e01df"
updated_at: "2026-04-19"
---

# TCMS Project Wiki

This wiki captures the current architecture and major feature flows from repository sources at `HEAD`.

## Start Here

- `[[concepts-architecture-boundaries]]` - layer model, module map, and boundaries.
- `[[flows-request-lifecycle]]` - how GraphQL requests travel through the backend.
- `[[entities-src-db-schema-ts]]` - core SQLite/Drizzle entities and relationships.
- `[[entities-test-plans-and-run-assignments]]` - test plans, plan links, and run-case assignment entities.

## Core Backend Features

- `[[features-src-app-ts]]` - app composition and GraphQL server bootstrapping.
- `[[features-src-graphql-resolvers-ts]]` - API resolver behavior and error mapping.
- `[[features-src-graphql-type-defs-ts]]` - GraphQL schema contract definitions.
- `[[features-src-graphql-inputs-ts]]` - centralized Zod input validation schemas.
- `[[features-src-domain-service-ts]]` - facade entrypoint to domain services.
- `[[features-src-domain-services-projects-ts]]` - project lifecycle and summary counters.
- `[[features-src-domain-services-requirements-ts]]` - requirement rules and hierarchy validation.
- `[[features-src-domain-services-testcases-ts]]` - manual/automated testcase lifecycle.
- `[[features-src-domain-services-test-plans-ts]]` - test plan CRUD, testcase linking, and run assignment seeding.
- `[[features-src-domain-services-runs-ts]]` - run creation, result ingestion, aggregates.
- `[[features-src-domain-services-imports-ts]]` - requirements/TRR import orchestration.
- `[[features-src-domain-services-design-links-ts]]` - Penpot requirement design-link management.
- `[[features-src-domain-services-traceability-graph-ts]]` - project traceability graph projection.
- `[[features-src-domain-services-kpi-ts]]` - KPI formulas and snapshot recalculation.
- `[[features-src-domain-services-traceability-ts]]` - link validation and traceability edge operations.
- `[[features-ci-and-operations]]` - CI gates, reporting artifacts, and release readiness.
- `[[features-testing-strategy]]` - unit/integration testing architecture and assertions.

## Frontend Features

- `[[features-apps-web-src-app-tsx]]` - route structure and page entry points.
- `[[features-apps-web-imports-ui]]` - bulk JSON imports (requirements, TRR, design links).
- `[[features-apps-web-design-links]]` - per-project design link list / upsert / unlink UI.
- `[[features-apps-web-testcase-version-history]]` - testcase detail version history table.
- `[[features-apps-web-test-plans]]` - project plans tab with CRUD, testcase linking, and run plan selection.
- `[[features-apps-web-shell-polish]]` - shared loading UI, error boundary, skip link, `@smoke` Playwright subset.
- `[[features-apps-web-ui-testing]]` - Playwright projects (desktop + mobile), Vitest + Testing Library.

## Flows

- `[[flows-kpi-snapshot-lifecycle]]` - current/run/daily KPI snapshot lifecycle.
- `[[flows-import-pipelines]]` - requirements and TRR import execution model.
- `[[flows-run-traceability-snapshot]]` - run snapshot capture and edge materialization.
- `[[flows-seed-demo-qa-project]]` - CLI seed for project `DEMO-QA` with sample requirements, tests, and run results.

## Concepts

- `[[concepts-error-contract]]` - deterministic API and GraphQL error contract.
- `[[concepts-import-identity-rules]]` - identity semantics for import upserts.
- `[[concepts-ui-qa-layout-tamagui-and-mobile]]` - Tamagui-based QA UI layout and path to Expo/native.

## Notes

- `[[notes-release-playbook]]` - practical pre-release command and sign-off checklist.
