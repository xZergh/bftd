---

## title: "Import Identity Rules"
type: "concept"
status: "active"
source_paths: ["docs/API_CONTRACTS.md", "src/domain/services/imports.ts", "src/domain/services/projects.ts"]
updated_at: "2026-04-17"

Imports rely on deterministic identity rules to avoid ambiguous upserts.

## Requirements import identity

- Project scope resolved by `projectId` or `projectKey`.
- Requirement identity within project is `externalKey`.
- Parent relationships use `parentExternalKey` resolved in same project.

## TRR automated import identity

- Preferred identity is `internalTestCaseId`.
- Fallback identity is `(project, externalId)`.
- Linked manual case IDs must exist and be active in the same project.

## Related pages

- `[[features-src-domain-services-imports-ts]]`
- `[[features-src-domain-services-testcases-ts]]`