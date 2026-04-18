---
title: "Seed demo QA project (CLI)"
type: "flow"
status: "active"
source_paths:
  - "scripts/seed-demo-qa-project.ts"
  - "package.json"
  - "docs/LOCAL_MANUAL_TESTING.md"
updated_at: "2026-04-19"
---

## Command

From the repository root:

```bash
npm run seed:demo
```

Uses `DB_PATH` like the API (default `./data/tcms.sqlite`). **Stop the API** or point at a dedicated SQLite file so the script and server are not writing the same handle concurrently.

## Behaviour

- Creates project key **`DEMO-QA`** (human-readable name) if it does **not** already exist; otherwise logs and exits without mutation.
- Inserts **three requirements**, **three manual** test cases (with steps), **one automated** test linked to a manual case, **one test run**, and **mixed results** (`passed`, `failed`, `skipped`, `passed`) via `TcmsService` in [`scripts/seed-demo-qa-project.ts`](scripts/seed-demo-qa-project.ts).

## Operational notes

- Requires a **Node ABI–compatible** `better-sqlite3` build for the machine running the script (same constraint as `npm run dev`).
- User-facing steps also documented in [`docs/LOCAL_MANUAL_TESTING.md`](docs/LOCAL_MANUAL_TESTING.md).

## Related

- `[[features-src-domain-service-ts]]`
- `[[concepts-ui-qa-layout-tamagui-and-mobile]]`
