# TCMS Frontend MVP Spec (Execution Copy)

Authoritative backlog: `[.notes/FE_TRACKED_BACKLOG.md](FE_TRACKED_BACKLOG.md)`. Backend contract: `[contracts/graphql-schema.snapshot.graphql](../contracts/graphql-schema.snapshot.graphql)`.

## 1) Product scope

- **Local-first, single-user** TCMS UI: manage projects, requirements, manual/automated tests, runs, traceability, KPI, imports, and Penpot design links via the existing GraphQL API.
- **No authentication UI** in MVP (matches backend).
- **SQLite** is owned by the API process; the web app does not open the DB file directly. Do not imply multi-user or hosted deployment in copy unless explicitly added later.

## 2) Tech stack (locked)

- **React** + **Vite** + **TypeScript** (`apps/web`).
- **urql** + **graphql** for GraphQL (client URL `/graphql`, same-origin via dev proxy).
- **Playwright** for E2E; **Vitest** + **Testing Library** optional for unit/component tests.
- **Monorepo:** npm **workspaces** (`apps/*`); root scripts orchestrate API + web + E2E.

## 3) Monorepo / scripts

- Root: `npm run dev` / `npm run dev:api` — API; `npm run dev:web` — Vite dev server.
- E2E: `npm run e2e:web` (local); `npm run ci:e2e:web` (CI-style, `CI=true`).
- See `[apps/web/README.md](../apps/web/README.md)` and `[docs/LOCAL_MANUAL_TESTING.md](../docs/LOCAL_MANUAL_TESTING.md)` for manual QA.

## 4) Routing / state

- **URL is the source of truth** for at least **project scope** (e.g. `/projects/:projectId/...`) as screens are implemented.
- Deep-linking expectations: refreshing the page preserves the selected project when routed.

## 5) API mapping (inventory — implement screens incrementally)


| Area           | GraphQL operations (see schema snapshot)                                                                                                                                                                                                           |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Projects       | `projects`, `project`, `projectSummary`, `createProject`, `updateProject`, `archiveProject`                                                                                                                                                        |
| Requirements   | `requirements`, `requirement`, `createRequirement`, `updateRequirement`, `deleteRequirement`                                                                                                                                                       |
| Test cases     | `testCases`, `testCase`, `createManualTestCase`, `createAutomatedTestCase`, `updateManualTestCase`, `updateAutomatedTestCase`, `deleteManualTestCase`, `deleteAutomatedTestCase`, `tombstoneTestCase`, `restoreTestCase`, `testCaseVersionHistory` |
| Traceability   | `linkRequirementManualTestCase`, `unlinkRequirementManualTestCase`, `linkAutomatedManualTestCase`, `unlinkAutomatedManualTestCase`, `traceabilityGraph`, `runTraceabilityReport`                                                                   |
| Runs / results | `testRuns`, `testRun`, `createTestRun`, `submitTestResult`, `runAggregate`                                                                                                                                                                         |
| KPI            | `kpiDashboard`, `recalculateKpiSnapshots`                                                                                                                                                                                                          |
| Imports        | `importRequirements`, `importAutomatedFromTrr`, `importRequirementDesignLinks`                                                                                                                                                                     |
| Design         | `requirementDesignLinks`, `upsertRequirementDesignLink`, `unlinkRequirementDesignLink`                                                                                                                                                             |


## 6) Error contract

- **Payload errors:** mutations that return `AppError` must show `**code`**, `**message**`, and `**fixHint**` (and optional `context`) in UI.
- **Transport errors:** GraphQL `**errors[]`** on the HTTP response must be surfaced in a **global** or **inline** error pattern (shell **FE-A** defines the default).
- **Imports:** render `**errors[]`** / `**warnings[]**` with row `**index**` for bulk operations.

## 7) Traceability UI vs backend B10

- Backend backlog marks **B10** (live graph / coverage-by-status) as post-MVP; the API still exposes `traceabilityGraph`.
- **MVP UI:** prefer **tabular / report** views that match user mental models; a **rich graph** is optional and must not block MVP if scope tightens.

## 8) Lists / performance (MVP)

- Simple lists are acceptable; **virtualization** is optional post-MVP. Document acceptable latency if large imports are used.

## 9) Non-functional

- **Default integration:** Vite **proxy** to API (`VITE_API_PROXY_TARGET`, default `http://127.0.0.1:4000`). **CORS** on the API is optional and only needed for non-proxied origins.
- Env: `PORT`, `DB_PATH` (API), Vite port **5173** (strict).

## 10) Testing policy

- **FE-E2E-0:** harness with real API + isolated SQLite + Playwright smoke in CI (see `[apps/web/playwright.config.ts](../apps/web/playwright.config.ts)`).
- **FE-A … FE-J:** each phase ships **at least one** bounded Playwright spec (primary user path); **definition of done** includes green E2E for that phase after FE-E2E-0.
- Prefer `**data-testid`** hooks for selectors.

## 11) Documentation

- Product flows: `[docs/USER_GUIDE.md](../docs/USER_GUIDE.md)`.
- KPI semantics: `[docs/REPORTING_AND_KPI.md](../docs/REPORTING_AND_KPI.md)`.
- **Local manual testing:** `[docs/LOCAL_MANUAL_TESTING.md](../docs/LOCAL_MANUAL_TESTING.md)` + `[apps/web/README.md](../apps/web/README.md)`; link from root `[README.md](../README.md)`.

## 12) Local manual testing (pointer)

- Runbook is **required** for QA: how to start API + web, which URLs, env vars, and how to reset `DB_PATH`. See `[docs/LOCAL_MANUAL_TESTING.md](../docs/LOCAL_MANUAL_TESTING.md)`.