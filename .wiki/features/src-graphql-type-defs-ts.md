---
title: "GraphQL Type Definitions"
type: "feature"
status: "active"
source_paths: ["src/graphql/type-defs.ts", "contracts/graphql-schema.snapshot.graphql"]
updated_at: "2026-04-17"
---

`type-defs.ts` defines the TCMS GraphQL contract (SDL) for queries, mutations, payloads, and supporting types.

## Highlights

- Domain model types: project, requirement, testcase, run, result, traceability, KPI, design links.
- Import and mutation payloads encode deterministic error-friendly responses.
- Contract includes both current KPI and trend series.
- Schema snapshot contract is tracked in `contracts/graphql-schema.snapshot.graphql`.

## Related pages

- `[[features-src-graphql-resolvers-ts]]`
- `[[features-src-graphql-inputs-ts]]`
