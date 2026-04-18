---
title: "Import Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/imports.ts", "src/domain/services/projects.ts", "src/domain/services/trr/allureAdapter.ts"]
updated_at: "2026-04-17"
---

Import service supports Agile requirements import and TRR automated testcase import with deterministic batch outcomes.

## Requirements import

- Resolves target project by id/key.
- Upserts by `(projectId, externalKey)`.
- Normalizes requirement enums and labels.
- Supports `parentExternalKey` resolution in-project.
- Returns `createdCount`, `updatedCount`, `skippedCount`, `errors`, and `warnings`.

## TRR automated import

- Requires testcase identity (`internalTestCaseId` or `externalId`) and title.
- Requires linked manual testcase IDs in same project.
- Upserts automated cases, rewrites manual links and step rows, then appends testcase version snapshot.

## Related pages

- `[[concepts-import-identity-rules]]`
- `[[flows-import-pipelines]]`
- `[[features-src-domain-services-testcases-ts]]`
