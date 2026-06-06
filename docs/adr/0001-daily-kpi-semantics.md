# ADR 0001: Daily KPI trend vs current snapshot semantics

## Status

Accepted

## Context

The KPI dashboard exposes both a **current** coverage vector and **per-calendar-day** historical rows. Without explicit rules, operators can misread charts (for example, plotting the same “current” values for every day).

## Decision

- **Current** KPI reflects the latest project state (active entities; labels filtered only when the caller supplies release/sprint filters).
- **Daily** trend rows use an **as-of end of day (UTC)** entity cut: rows count only if `createdAt <= end of day` and test cases are not tombstoned as of that instant (`isDeleted = false` or `deletedAt` after that instant). Run counts per day still use runs whose `createdAt` falls on that calendar day (UTC).
- **Traceability links** are not historically time-stamped; as-of daily coverage intersects **current** link rows with the entity sets that were active on that day (documented approximation).

Recalculate behavior (`fromDate` / `toDate`, `fullRebuild`) is described in `docs/REPORTING_AND_KPI.md` §5.1.

## Consequences

- Daily charts remain honest for entity lifecycle; link history remains approximate until link-level versioning exists.