---
title: "Testcase Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/testcases.ts", "src/domain/services/versioning.ts"]
updated_at: "2026-04-17"
---

Testcase service handles manual/automated lifecycle, link constraints, tombstoning, and version snapshots.

## Manual testcase rules

- Must include at least one step and one linked requirement.
- Requirement links must exist in the same project.
- Updating steps rewrites step rows with deterministic order.

## Automated testcase rules

- Must include at least one linked manual testcase.
- Linked manuals must be active and in-project.
- Deletion hard-deletes when safe, but tombstones when test results exist.

## Versioning behavior

- Mutation paths append testcase version snapshots so history stays auditable.

## Related pages

- `[[features-src-domain-services-traceability-ts]]`
- `[[features-src-domain-services-runs-ts]]`
- `[[entities-src-db-schema-ts]]`
