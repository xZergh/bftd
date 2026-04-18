---

## title: "Traceability Linking Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/traceability.ts", "src/db/schema.ts"]
updated_at: "2026-04-17"

This module manages requirement-manual and automated-manual link edges with project/type safety checks.

## Core responsibilities

- Validate requirement and testcase IDs belong to the same project.
- Enforce testcase type constraints (`manual` vs `automated`) and active state (`isDeleted` checks).
- Insert and remove edge rows in link tables with duplicate-safe behavior.
- Trigger testcase version snapshots when links change.

## Deterministic failures

When identity or type constraints fail, operations raise `AppError` with fix hints so GraphQL callers get actionable feedback.

## Related pages

- `[[entities-src-db-schema-ts]]`
- `[[concepts-error-contract]]`
- `[[features-src-domain-service-ts]]`