# TCMS — Frontend tracked backlog

| Canonical FE spec | `[.notes/FE_MVP_SPEC.md](FE_MVP_SPEC.md)` |
| Backend API | `[contracts/graphql-schema.snapshot.graphql](../contracts/graphql-schema.snapshot.graphql)` |
| Manual testing | `[docs/LOCAL_MANUAL_TESTING.md](../docs/LOCAL_MANUAL_TESTING.md)` |

**Status:** `[ ]` open · `[~]` in progress · `[x]` done

**User journey (product order):** project → import requirements (or create) → manual tests + links → automated tests + links → run + results → KPI / traceability. **Engineer phase order** below may differ; **FE-G (imports)** can be prioritized early for adoption.

---

## FE-E2E-0 — Harness (gate for FE-B+ E2E completion)


| ID       | Item                                                         | Primary paths                                                                                                                             | E2E spec                                                                        | Acceptance                                       |
| -------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------ |
| FE-E2E-0 | Playwright harness: API + Vite, isolated `DB_PATH`, CI smoke | `[apps/web/playwright.config.ts](../apps/web/playwright.config.ts)`, root `[package.json](../package.json)` `start:e2e-api`, `ci:e2e:web` | `[apps/web/e2e/fe-e2e-0-smoke.spec.ts](../apps/web/e2e/fe-e2e-0-smoke.spec.ts)` | One command starts API + web; smoke passes in CI |


---

## FE-A — App shell


| ID   | Item                                                                          | E2E spec                                                                                    | Scenarios                                                                                                    |
| ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| FE-A | `[x]` Routing, layout, urql client, global `AppError` + GraphQL `errors[]`, loading | [`apps/web/e2e/fe-a-shell.spec.ts`](../apps/web/e2e/fe-a-shell.spec.ts) | Load app; `/projects` page shell; transport GraphQL error; duplicate-key `AppError`; urql projects smoke |


---

## FE-B — Projects


| ID   | Item                                           | E2E spec                                                                                    | Scenarios                                                                                                   |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| FE-B | `[x]` List / create / edit / archive; project picker; **delivery:** Cursor rule — each new stage checks out `main`, uses a **new branch**, commit/push per stage ([`.cursor/rules/git-branch-per-stage.mdc`](../.cursor/rules/git-branch-per-stage.mdc)) | [`apps/web/e2e/fe-b-projects.spec.ts`](../apps/web/e2e/fe-b-projects.spec.ts) | Create, list, detail, archive (hidden until “Show archived”), picker navigates to `/projects/:projectId` |


---

## FE-C — Requirements


| ID   | Item                                 | E2E spec                                                                                       | Scenarios                                                                                                                              |
| ---- | ------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| FE-C | `[x]` CRUD; blocked delete shows `fixHint` (GraphQL `errors[]` extensions) | [`apps/web/e2e/fe-c-requirements.spec.ts`](../apps/web/e2e/fe-c-requirements.spec.ts) | `/projects/:projectId/requirements` list + create; detail edit; delete blocked after linked manual (API) surfaces `fixHint` in shell |


---

## FE-D — Test cases + linking


| ID   | Item                                                | E2E spec                                                                                    | Scenarios                                                                                                                          |
| ---- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| FE-D | `[x]` Manual + steps; automated; links; tombstone/restore | [`apps/web/e2e/fe-d-testcases.spec.ts`](../apps/web/e2e/fe-d-testcases.spec.ts) | `/projects/:projectId/test-cases` list + create; detail links via `traceabilityGraph`; tombstone + restore on automated testcase |


---

## FE-E — Runs + results


| ID   | Item                                   | E2E spec                                                                 | Scenarios                                                                                         |
| ---- | -------------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| FE-E | `[x]` Create run; submit results; aggregates | [`apps/web/e2e/fe-e-runs.spec.ts`](../apps/web/e2e/fe-e-runs.spec.ts) | `/projects/:projectId/runs` create; detail submit `passed`; `runAggregate` totals + pass rate |


---

## FE-F — KPI + traceability


| ID   | Item                                                                             | E2E spec                                                                 | Scenarios                                                                                                                          |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| FE-F | `[x]` `kpiDashboard`, `runTraceabilityReport`, `traceabilityGraph` (incl. coverage-by-status) | [`apps/web/e2e/fe-f-reporting.spec.ts`](../apps/web/e2e/fe-f-reporting.spec.ts) | `/projects/:projectId/reporting` — KPI formula labels + values; graph summary; run traceability snapshot edges |


---

## FE-G — Imports


| ID   | Item                                   | E2E spec                                                                 | Scenarios                                                                                                                          |
| ---- | -------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| FE-G | `[x]` Requirements, TRR, design bulk imports | [`apps/web/e2e/fe-g-imports.spec.ts`](../apps/web/e2e/fe-g-imports.spec.ts) | `/projects/:projectId/imports` — paste JSON; counts; error rows with index; design links with provider |


---

## FE-H — Design links


| ID   | Item                                           | E2E spec                                                                 | Scenarios                                                                                                                          |
| ---- | ---------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| FE-H | `[x]` List / upsert / unlink Penpot (provider) links | [`apps/web/e2e/fe-h-design-links.spec.ts`](../apps/web/e2e/fe-h-design-links.spec.ts) | `/projects/:projectId/design-links` — upsert; list; idempotent title update; unlink |


---

## FE-I — Version history


| ID   | Item                     | E2E spec (planned)                          | Scenarios (planned)            |
| ---- | ------------------------ | ------------------------------------------- | ------------------------------ |
| FE-I | `testCaseVersionHistory` | `apps/web/e2e/fe-i-version-history.spec.ts` | History renders for a testcase |


---

## FE-J — Polish (concrete)


| ID   | Item                                                            | E2E spec (planned)                 | Scenarios (planned)            |
| ---- | --------------------------------------------------------------- | ---------------------------------- | ------------------------------ |
| FE-J | Loading states; error boundary; one keyboard path; smoke re-run | `apps/web/e2e/fe-j-polish.spec.ts` | Smoke subset of critical flows |


**FE-J checklist:** consistent loading UI; **one** keyboard-accessible path (e.g. project control or submit); re-run smoke E2E tag/subset.

---

## Definition of done

- Feature merged **and** phase **E2E** green in CI **after FE-E2E-0**.
- Docs: update `[apps/web/README.md](../apps/web/README.md)` / `[docs/LOCAL_MANUAL_TESTING.md](../docs/LOCAL_MANUAL_TESTING.md)` when run commands or ports change.