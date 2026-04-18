---
title: "Run Traceability Snapshot"
type: "flow"
status: "active"
source_paths: ["src/domain/services/runs.ts", "src/db/schema.ts"]
updated_at: "2026-04-17"
---

Run snapshot flow:

1. Creating a run inserts `test_runs` row.
2. Service immediately captures traceability snapshot header.
3. Service computes active requirement->manual links in project.
4. Service projects manual->automated links for active testcases.
5. Deduplicated edge rows are stored in `run_traceability_edges`.

This produces immutable run-level traceability context for reporting.

## Related pages

- `[[features-src-domain-services-runs-ts]]`
- `[[features-src-domain-services-traceability-ts]]`
- `[[entities-src-db-schema-ts]]`
