---

## title: "Database Entities"
type: "entity"
status: "active"
source_paths: ["src/db/schema.ts"]
updated_at: "2026-04-17"

`src/db/schema.ts` defines the SQLite schema with Drizzle table declarations and unique/index constraints.

## Primary entities

- `projects`
- `requirements`
- `test_cases` and `test_case_steps`
- `test_case_versions` and `test_case_version_steps`
- `test_runs` and `test_results`

## Link and reporting entities

- `requirement_test_case_links`
- `automated_manual_links`
- `requirement_design_links`
- `run_traceability_snapshots` and `run_traceability_edges`
- `kpi_project_snapshots`, `kpi_run_snapshots`, `kpi_daily_snapshots`

## Key invariants

- External identities are unique per project where applicable.
- Link tables enforce edge uniqueness with dedicated indexes.
- Snapshot tables store JSON payloads keyed by project/date or project/run.

## Related pages

- `[[features-src-domain-services-traceability-ts]]`
- `[[features-src-domain-services-kpi-ts]]`
- `[[flows-kpi-snapshot-lifecycle]]`