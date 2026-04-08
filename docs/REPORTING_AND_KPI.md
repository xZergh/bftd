# Reporting and KPI

## 1. Reporting Model

- Traceability graph: Requirement -> Manual -> Automated.
- Graph view shows raw links as stored.
- Run-level reporting is snapshot-based and immutable.

## 2. KPI Model

- Hybrid storage:
  - on-demand aggregation
  - project/run/daily snapshots
- Coverage values are formula-driven.

## 3. Coverage Formulas

### 3.1 Requirement Coverage

- numerator: covered requirements
- denominator: total requirements

### 3.2 Testcase Coverage

- numerator: manual testcases linked to requirements
- denominator: total manual testcases

### 3.3 Automation Coverage (Manual)

- numerator: manual cases with at least one automated link
- denominator: total manual cases

### 3.4 Automation Coverage (Requirement)

- numerator: requirements linked to any automated testcase
- denominator: total requirements

## 4. Multi-Hop Metrics

- requirements with manual links
- requirements with automated links via manual
- automated cases reachable from requirements
- orphan manual cases
- orphan automated cases

All metrics are deduplicated by unique IDs in project scope.

## 5. Historical Consistency Rules

- KPI snapshots are immutable by default.
- Admin can trigger explicit full historical rebuild.

### 5.1 Daily trend vs “current” (ADR / X1)

Formal decision record: [ADR 0001: Daily KPI trend vs current snapshot semantics](adr/0001-daily-kpi-semantics.md).

**Problem:** Reusing the same “current” coverage vector for every calendar day in the trend chart is misleading when requirements and test cases change over time.

**Approach in this codebase:**

- **Current** KPI (`kpi_project_snapshots` / live `computeCurrentKpi`) reflects the latest project state (active entities, today’s labels unfiltered unless callers filter).
- **Per-day trend** rows (`kpi_daily_snapshots`) store coverage computed with an **as-of end-of-day (UTC)** view: entities must exist at that instant (`createdAt <= end of day`) and test cases must not have been tombstoned yet (`isDeleted = false` or `deletedAt` after that instant). Run counts per day still come from runs whose `createdAt` falls on that calendar day in UTC.
- **Caveat:** Traceability links are not historically time-stamped; as-of coverage uses **current** link rows intersected with the entity sets that were active on that day. That is a deliberate approximation until link-level history exists.

**Recalculate API:**

- `fromDate` / `toDate` (YYYY-MM-DD) narrow which **run** snapshots are refreshed and which **daily** keys are recomputed.
- `fullRebuild: true` with a range deletes existing daily snapshots in that range before rewriting them (use after backfills or formula changes).

## 6. KPI Validation and Troubleshooting

- Check formula metadata IDs match formula value IDs.
- Verify snapshot timestamps and date ranges.
- Validate denominator handling for `0` values.