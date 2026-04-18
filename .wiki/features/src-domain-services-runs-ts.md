---
title: "Run Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/runs.ts"]
updated_at: "2026-04-17"
---

Run service captures run metadata, result submissions, aggregates, and immutable traceability snapshots.

## Core behaviors

- Creates runs with optional release/sprint/env/build/trigger metadata.
- Captures traceability snapshot at run creation time.
- Accepts test results with attachment payloads and validates project scope.
- Computes aggregate totals and pass-rate for run dashboards.
- Returns run snapshot-based traceability reports, optionally filtered by run labels.

## Snapshot behavior

- `captureRunSnapshot` materializes requirement->manual->automated edges for project-active cases.
- Snapshot edges include both manual-only and manual+automated paths.

## Related pages

- `[[flows-run-traceability-snapshot]]`
- `[[features-src-domain-services-kpi-ts]]`
- `[[features-src-domain-services-traceability-graph-ts]]`
