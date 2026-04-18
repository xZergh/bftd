---
title: "Import Pipelines"
type: "flow"
status: "active"
source_paths:
  - "src/domain/services/imports.ts"
  - "src/domain/services/trr/allureAdapter.ts"
  - "src/graphql/resolvers.ts"
  - "apps/web/src/pages/ProjectImportsPage.tsx"
updated_at: "2026-04-09"
---

Import pipeline flow:

1. GraphQL mutation validates payload via Zod (`inputs.ts`).
2. Service resolves project identity.
3. Batch pre-validations detect missing identity and linkage errors.
4. Transaction applies create/update operations.
5. Per-item errors and warnings are returned with deterministic counters.

## Web UI entry

The **Imports** page (`apps/web/src/pages/ProjectImportsPage.tsx`) lets operators paste JSON arrays (or wrapped objects) and invokes `importRequirements`, `importAutomatedFromTrr`, and `importRequirementDesignLinks` with the current `projectId`. See `[[features-apps-web-imports-ui]]`.

## TRR step handling

- TRR payload steps can be normalized from Allure-like nested structures into internal step records.

## Related pages

- `[[features-src-domain-services-imports-ts]]`
- `[[concepts-import-identity-rules]]`
