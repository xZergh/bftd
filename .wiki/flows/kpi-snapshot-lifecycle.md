---
title: "KPI Snapshot Lifecycle"
type: "flow"
status: "active"
source_paths: ["src/domain/services/kpi.ts", "src/domain/service.ts", "docs/REPORTING_AND_KPI.md"]
updated_at: "2026-04-17"
---

KPI refresh and read flow:

1. Client requests KPI dashboard (optionally with labels/date range).
2. `TcmsService.getKpiDashboard` validates date range and triggers recalculation.
3. Recalculation updates:
   - current project snapshot for today
   - run snapshots (all or date-filtered)
   - daily snapshots per run-date with end-of-day semantics
4. Dashboard query reads snapshot rows and applies optional release/sprint and date filters.
5. Response returns formula metadata plus current/per-run/daily trend payloads.

## Semantics

- Coverage formulas are centrally defined (`COVERAGE_FORMULAS`) and shipped with dashboard responses.
- Daily snapshots are historical approximations based on entity lifecycle timestamps and current links.

## Related pages

- `[[features-src-domain-services-kpi-ts]]`
- `[[entities-src-db-schema-ts]]`
