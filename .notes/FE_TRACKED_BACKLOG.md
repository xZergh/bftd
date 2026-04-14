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


| ID   | Item                                 | E2E spec (planned)                       | Scenarios (planned)              |
| ---- | ------------------------------------ | ---------------------------------------- | -------------------------------- |
| FE-C | CRUD; blocked delete shows `fixHint` | `apps/web/e2e/fe-c-requirements.spec.ts` | Create/edit; delete blocked path |


---

## FE-D — Test cases + linking


| ID   | Item                                                | E2E spec (planned)                    | Scenarios (planned)                              |
| ---- | --------------------------------------------------- | ------------------------------------- | ------------------------------------------------ |
| FE-D | Manual + steps; automated; links; tombstone/restore | `apps/web/e2e/fe-d-testcases.spec.ts` | Manual linked to req; automated linked to manual |


---

## FE-E — Runs + results


| ID   | Item                                   | E2E spec (planned)               | Scenarios (planned)                |
| ---- | -------------------------------------- | -------------------------------- | ---------------------------------- |
| FE-E | Create run; submit results; aggregates | `apps/web/e2e/fe-e-runs.spec.ts` | Create run; submit; view aggregate |


---

## FE-F — KPI + traceability


| ID   | Item                                                                             | E2E spec (planned)                    | Scenarios (planned)                     |
| ---- | -------------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------- |
| FE-F | `kpiDashboard`, `runTraceabilityReport`, `traceabilityGraph` (level per FE spec) | `apps/web/e2e/fe-f-reporting.spec.ts` | Dashboard shows formula labels + values |


---

## FE-G — Imports


| ID   | Item                                   | E2E spec (planned)                  | Scenarios (planned)                    |
| ---- | -------------------------------------- | ----------------------------------- | -------------------------------------- |
| FE-G | Requirements, TRR, design bulk imports | `apps/web/e2e/fe-g-imports.spec.ts` | Paste JSON; assert counts + error rows |


---

## FE-H — Design links


| ID   | Item                                           | E2E spec (planned)                       | Scenarios (planned)  |
| ---- | ---------------------------------------------- | ---------------------------------------- | -------------------- |
| FE-H | List / upsert / unlink Penpot (provider) links | `apps/web/e2e/fe-h-design-links.spec.ts` | Upsert; list; unlink |


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