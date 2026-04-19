---

## title: "Project Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/projects.ts"]
updated_at: "2026-04-17"

Project service handles project lifecycle, identity resolution, and summary counts.

## Core behaviors

- Creates projects with slugified keys and conflict detection; optional `description` (nullable text) is stored on the project row.
- Auto-generates unique keys when key is omitted.
- Resolves project identity from either `projectId` or `projectKey`.
- Supports archive/unarchive and list filtering (`includeArchived`).
- Computes project summary counters for requirements and manual/automated testcases with optional label filters.

## Error model

- Uses deterministic `AppError` codes for not found, validation, and key conflicts.

## Related pages

- `[[features-src-domain-service-ts]]`
- `[[features-src-domain-services-requirements-ts]]`
- `[[features-src-domain-services-testcases-ts]]`