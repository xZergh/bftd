---
title: "TcmsService Facade"
type: "feature"
status: "active"
source_paths: ["src/domain/service.ts", "src/domain/services/index.ts"]
updated_at: "2026-04-17"
---

`TcmsService` is the application facade that exposes project, requirement, testcase, run, import, traceability, KPI, and design-link operations.

## What it does

- Aggregates use-case methods behind one class injected into GraphQL context.
- Delegates almost every method to a corresponding function in `src/domain/services/*`.
- Adds light orchestration in specific flows (for example `getKpiDashboard` performs recalculation and filtering over snapshot rows).
- Preserves consistent API shape for resolver usage.

## Why it exists

- Keeps resolver files free of business rules.
- Makes domain operations reusable in tests and non-GraphQL contexts.

## Related pages

- `[[features-src-graphql-resolvers-ts]]`
- `[[features-src-domain-services-kpi-ts]]`
- `[[features-src-domain-services-traceability-ts]]`
