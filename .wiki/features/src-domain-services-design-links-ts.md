---
title: "Design Links Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/design-links.ts"]
updated_at: "2026-04-17"
---

Design links service manages requirement-design associations (MVP provider: Penpot).

## Core behaviors

- Validates provider (`penpot`) and HTTPS `shareUrl`.
- Resolves target requirement by `requirementId` or `requirementKey` scoped to project.
- Upserts by requirement/provider/shareUrl/designNodeId tuple.
- Supports batch import with per-item error collection and create/update counters.

## Related pages

- `[[features-src-domain-services-requirements-ts]]`
- `[[concepts-error-contract]]`
