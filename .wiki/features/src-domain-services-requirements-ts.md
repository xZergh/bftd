---
title: "Requirement Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/requirements.ts"]
updated_at: "2026-04-17"
---

Requirement service manages CRUD, parent-child validation, and requirement-level invariants.

## Core behaviors

- Creates requirements with normalized release/sprint labels and default enum-like fields.
- Validates `parentRequirementId` belongs to the same project and prevents self-parenting on update.
- Stores tags as JSON and maps them back to arrays on read.
- Blocks deletion when manual testcase links exist (`DELETE_BLOCKED_REQUIREMENT_MANUAL`).

## Related pages

- `[[features-src-domain-services-projects-ts]]`
- `[[features-src-domain-services-testcases-ts]]`
- `[[features-src-domain-services-imports-ts]]`
