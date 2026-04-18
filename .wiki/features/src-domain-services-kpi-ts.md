---
title: "KPI Domain Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/kpi.ts", "docs/REPORTING_AND_KPI.md", "docs/adr/0001-daily-kpi-semantics.md"]
updated_at: "2026-04-17"
---

This module defines KPI formulas and maintains project/run/daily snapshots.

## Coverage formulas

- `requirement_coverage`
- `testcase_coverage`
- `automation_coverage_manual`
- `automation_coverage_requirement`

Each metric stores numerator, denominator, and percentage with `0`-safe division.

## Snapshot model

- Project snapshot: latest current KPI vector for a project/day.
- Run snapshot: per-run execution stats and pass-rate details.
- Daily snapshot: end-of-day KPI trend entries.

## Notable behavior

- Date range validation uses strict `YYYY-MM-DD` checks and ordered bounds.
- Daily trend uses "as-of end of UTC day" entity state.
- `fullRebuild` can clear and rebuild daily snapshots in a requested range.

## Related pages

- `[[flows-kpi-snapshot-lifecycle]]`
- `[[entities-src-db-schema-ts]]`
