---
title: "Project Wiki"
type: "index"
status: "active"
last_commit: "5cf7004d7debdb57f3bacffc3359587a247c98b2"
updated_at: "2026-04-18"
---

# TCMS Project Wiki

This wiki captures the current architecture and major feature flows from repository sources at `HEAD`.

## Start Here

- `[[concepts-architecture-boundaries]]` - layer model, module map, and boundaries.
- `[[flows-request-lifecycle]]` - how GraphQL requests travel through the backend.
- `[[entities-src-db-schema-ts]]` - core SQLite/Drizzle entities and relationships.

## Core Backend Features

- `[[features-src-app-ts]]` - app composition and GraphQL server bootstrapping.
- `[[features-src-graphql-resolvers-ts]]` - API resolver behavior and error mapping.
- `[[features-src-graphql-type-defs-ts]]` - GraphQL schema contract definitions.
- `[[features-src-graphql-inputs-ts]]` - centralized Zod input validation schemas.
- `[[features-src-domain-service-ts]]` - facade entrypoint to domain services.
- `[[features-src-domain-services-projects-ts]]` - project lifecycle and summary counters.
- `[[features-src-domain-services-requirements-ts]]` - requirement rules and hierarchy validation.
- `[[features-src-domain-services-testcases-ts]]` - manual/automated testcase lifecycle.
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

## Flows

- `[[flows-kpi-snapshot-lifecycle]]` - current/run/daily KPI snapshot lifecycle.
- `[[flows-import-pipelines]]` - requirements and TRR import execution model.
- `[[flows-run-traceability-snapshot]]` - run snapshot capture and edge materialization.

## Concepts

- `[[concepts-error-contract]]` - deterministic API and GraphQL error contract.
- `[[concepts-import-identity-rules]]` - identity semantics for import upserts.

## Notes

- `[[notes-release-playbook]]` - practical pre-release command and sign-off checklist.
