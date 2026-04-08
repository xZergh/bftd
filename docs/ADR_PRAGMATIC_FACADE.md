# ADR: Pragmatic Facade Architecture for MVP

## Status

Accepted

## Date

2026-04-08

## Context

The project currently uses this flow:

- GraphQL resolvers (`src/graphql/*`) for transport/input validation
- `TcmsService` (`src/domain/service.ts`) as an application facade
- Domain modules (`src/domain/services/*`) for business logic
- Drizzle + SQLite (`src/db/*`) for persistence

This approach was selected for delivery speed and low cognitive overhead during MVP.

## Decision

Use the pragmatic facade architecture for MVP, with balanced governance:

- Keep `TcmsService` as a thin facade and orchestration boundary.
- Keep domain rules in `src/domain/services/*`.
- Keep resolvers as controller-like adapters only.
- Delay repository/port abstraction until scale signals appear.

## Critique and Pitfalls

1. Facade bloat risk

- `TcmsService` can become a god-object over time.
- Mitigation: new feature logic must be implemented in `src/domain/services/*`; facade methods should delegate.

1. Persistence coupling risk

- Domain modules currently depend directly on Drizzle schema/tables.
- Mitigation: keep query patterns consistent and centralized per module; add repositories only when duplication/complexity justifies them.

1. Layer leakage risk

- Business rules can leak into GraphQL resolvers.
- Mitigation: resolvers can validate input and shape errors, but cannot enforce domain policy.

1. Behavioral drift risk

- Similar filters/scoping logic may be reimplemented differently across modules.
- Mitigation: extract shared domain helpers when logic is repeated in 2+ places.

1. Governance drift risk

- Balanced style can degrade under pressure if rules are only advisory.
- Mitigation: enforce boundary checks in CI and keep lint/typecheck blocking.

1. Test imbalance risk

- Over-reliance on integration tests slows diagnosis.
- Mitigation: maintain both domain-level unit tests and GraphQL integration contract tests.

## Guardrails

- `src/graphql/*` must not import `src/db/*`.
- `src/domain/services/*` must not import `src/graphql/*`.
- `src/db/*` must not import `src/domain/*`.
- Deterministic error contract (`code`, `message`, `fixHint`) remains mandatory.

## Exit Criteria (When to move to Hybrid Repositories)

Move from pragmatic facade to hybrid architecture when at least one condition is met:

1. Cross-module duplication:

- Same query/scoping/filtering logic appears in 3+ domain modules.

1. Query complexity growth:

- A single aggregate requires many joins/materialized views and logic is difficult to test in module-level unit tests.

1. Storage portability need:

- Real requirement appears for alternative persistence strategy (or multi-store read/write paths).

1. Team/contributor scale:

- Parallel work regularly causes boundary conflicts or merge churn around persistence logic.

1. Performance-critical paths:

- Repeated hot paths need optimized reads with explicit read models/repositories.

## Migration Plan to Hybrid (If triggered)

1. Keep public service API stable (`TcmsService` signatures unchanged).
2. Introduce repositories only for high-friction aggregates first (not system-wide).
3. Add contract tests for repositories before moving logic.
4. Migrate incrementally per module, avoiding broad rewrites.

## Consequences

Positive:

- Fast implementation and iteration for MVP.
- Clear enough boundaries for a small team.
- Low architectural overhead.

Negative:

- Coupling to Drizzle remains in domain services.
- Requires discipline to prevent facade and resolver bloat.
- Future repository extraction will be a planned refactor, not free.