---
title: "GraphQL Input Validation"
type: "feature"
status: "active"
source_paths: ["src/graphql/inputs.ts"]
updated_at: "2026-04-17"
---

`inputs.ts` centralizes Zod schemas for GraphQL argument validation and normalization.

## Patterns

- Required identity refinements for dual-key inputs (for example `projectId` or `projectKey`).
- Typed enums for statuses where applicable (for example result status values).
- Optional nullable fields for patch operations.
- Import schemas allow partial rows, with service-layer batch validation returning deterministic per-item errors.

## Related pages

- `[[features-src-graphql-resolvers-ts]]`
- `[[concepts-error-contract]]`
