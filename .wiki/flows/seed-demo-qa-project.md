---
title: "Seed demo QA project (CLI)"
type: "flow"
status: "active"
source_paths:
  - "scripts/seed-demo-qa-project.ts"
  - "scripts/e2e-reset-and-seed.ts"
  - "src/seed/demo-qa-seed.ts"
  - "src/seed/demo-qa-constants.ts"
  - "docs/plans/demo-qa-seed-design.md"
  - "package.json"
updated_at: "2026-06-06"
---

## Command

From the repository root:

```bash
npm run seed:demo
```

Uses `DB_PATH` like the API (default `./data/tcms.sqlite`). **Stop the API** or point at a dedicated SQLite file so the script and server are not writing the same handle concurrently.

## E2E reset

Playwright resets and seeds via the **tcms-api** `webServer` command (`npm run e2e:reset-db && …`) before starting the API on port **4001** (web on **5174**). Fixture: `apps/web/e2e/fixtures/demo-qa.ts`.

## Behaviour

- Creates project key **`DEMO-QA`** if it does **not** already exist (`skipIfExists: true` for CLI); E2E reset always re-seeds on a clean file.
- **Three requirements** with status, priority, type, release, sprint, tags (dense-table review).
- **Three manual** test cases (with steps), **one automated** linked to login manual.
- **One test plan** (`Demo regression plan`) linking all cases.
- **One test run** (`Demo regression - staging`) with mixed results.

Full matrix: [`docs/plans/demo-qa-seed-design.md`](../../docs/plans/demo-qa-seed-design.md).

## Operational notes

- Requires a **Node ABI–compatible** `better-sqlite3` build for the machine running the script (same constraint as `npm run dev`).
- User-facing steps also documented in [`docs/LOCAL_MANUAL_TESTING.md`](../../docs/LOCAL_MANUAL_TESTING.md).

## Related

- `[[features-src-domain-service-ts]]`
- `[[concepts-ui-qa-layout-tamagui-and-mobile]]`
- `[[concepts-tcms-visual-direction]]` — reuse this seed’s strings as **Penpot placeholder copy** for realistic frames.
