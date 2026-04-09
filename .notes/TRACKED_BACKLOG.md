# TCMS — Tracked backlog

| Canonical spec | `detailed.spec.v2.md` |  
| Architecture | `docs/DEVELOPER_GUIDE.md`, `docs/ADR_PRAGMATIC_FACADE.md` |
| API principles | `docs/API_CONTRACTS.md` |

**Status:** `[ ]` open · `[~]` in progress · `[x]` done

**Implementation note (2026-04-09):** MVP slice (Phases A–E) is largely implemented in code. **B4:** bulk **requirements**, **TRR automated**, and **design-link** imports each run in a **single synchronous SQLite transaction** (rollback on failure). GraphQL Yoga `maskedErrors` passes through domain `GraphQLError` messages. **CI / reporting:** Allure (`artifacts/…`, `docs/reports/allure-report.html`), Stryker (`workflow_dispatch`), Vitest `**retry`** when `CI=true`, schema snapshot + `docs/BREAKING_CHANGES.md`. **Remaining major gap:** **B10** (post-MVP live graph). **Canonical spec file** (`detailed.spec.v2.md`) may still be vendored separately—see README. **Reconciled per-ID status** (code audit 2026-04-09) is in the table below; checkbox rows in phase sections are being aligned to these flags.

### Reconciled implementation status (2026-04-09)


| ID         | Status | Notes                                                                        |
| ---------- | ------ | ---------------------------------------------------------------------------- |
| A1–A6, A8  | [x]    | Schema + GraphQL + reads                                                     |
| A7         | [~]    | Error codes: extend as new surfaces appear                                   |
| A9         | [~]    | Indexes in `schema.ts`; optional CI checklist                                |
| A10        | [~]    | Integration tests cover lifecycle + reads                                    |
| B1–B3      | [x]    |                                                                              |
| B4         | [x]    | Requirements + TRR + **design-link** bulk imports: one `db.transaction` each |
| B5–B9, B11 | [x]    |                                                                              |
| B12        | [~]    | Traceability/import/design tests: expand edge cases                          |
| B10        | [ ]    | Post-MVP live graph (per product decision #4)                                |
| C1–C4      | [x]    |                                                                              |
| C5–C9      | [~]    | TRR/nested/attachments: MVP subset                                           |
| D1–D4      | [x]    |                                                                              |
| D5         | [~]    | Tests: extend tombstone/history edge cases                                   |
| E0–E2, E5  | [x]    | E0 run snapshot scoped by `projectId`                                        |
| E3, E4, E6 | [~]    | KPI/recalc; align with **X1** over time                                      |
| X1         | [~]    | See `REPORTING_AND_KPI.md`                                                   |
| F1–F5      | [x]    | Coverage thresholds in Vitest                                                |
| F6         | [~]    | README + `docs/reports/allure-report.html`                                   |


**Legend:** `[x]` done · `[~]` partial / follow-up · `[ ]` out of MVP scope.

**A7** — AppError codes cover MVP paths; extend as new surfaces appear. **A9** — indexes live in `schema.ts`; optional CI index checklist still open. **A10** — integration tests cover projects/requirements/cases/runs; not a dedicated “Phase A only” suite. **E3/E4** — KPI snapshots + recalc exist; daily trend semantics may evolve with **X1**. **X1** — see `docs/REPORTING_AND_KPI.md`; formal ADR optional.

**Conventions**

- Paths are repo-relative. `**schema.ts`** = `src/db/schema.ts`. `***.ts`** in the “service” sense (e.g. `runs.ts`, `imports.ts`) = `src/domain/services/<name>.ts` unless already prefixed with `src/`.
- **Deps** = hard (**H**) or soft (**S**) prerequisites; see also [Ticket dependencies](#ticket-dependencies).

---

## Phase A — Schema and API spine


| ID  | Item                                                                                                 | Primary paths                                                                 | Spec     | Deps      |
| --- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------- | --------- |
| A1  | [ ] Add project `**key`** column (stable slug for **projectKey** / imports), **unique**, + migration | `src/db/schema.ts`, `src/db/init.ts`, migrations                              | §3.1, §8 | —         |
| A2  | [ ] Domain: **list / get / update / archive** project (resolve by `id` or `**key`**)                 | `src/domain/services/projects.ts`, `src/domain/service.ts`                    | §3.1, §6 | A1        |
| A3  | [ ] GraphQL: project queries + mutations + Zod inputs                                                | `src/graphql/type-defs.ts`, `inputs.ts`, `resolvers.ts`                       | §6       | A2        |
| A4  | [ ] Query: **list / get requirements** (by project; extend fields after **B1**)                      | `src/domain/services/requirements.ts` (new), `src/domain/service.ts`, GraphQL | §6       | —         |
| A5  | [ ] Query: **list / get test cases** (type filter; steps when **C1–C3** exist)                       | `src/domain/services/testcases.ts`, GraphQL                                   | §6       | —         |
| A6  | [ ] Query: **list / get test runs** (+ results as needed for contract)                               | `src/domain/services/runs.ts`, GraphQL                                        | §6       | —         |
| A7  | [ ] Expand **AppError** / **ErrorCode** for remaining spec codes                                     | `src/domain/errors.ts`, `src/graphql/resolvers.ts`                            | §6, §8.6 | —         |
| A8  | [ ] GraphQL **Date** / **DateTime** scalars (replace `String` where spec says Date/DateTime)         | `src/graphql/schema.ts`, `type-defs.ts`, `inputs.ts`, `resolvers.ts`          | §8.2     | —         |
| A9  | [ ] **§7 indexes:** verify new/changed tables (checklist or CI hook alongside migrations)            | `src/db/`*, `scripts/ci/`*, `docs/DEVELOPER_GUIDE.md`                         | §7       | —         |
| A10 | [ ] **Integration tests** for Phase A surface: projects lifecycle + **A4–A6** reads                  | `tests/integration/*.test.ts`                                                 | §9.2     | A3, A4–A6 |


---

## Phase B — Requirements, traceability, imports


| ID  | Item                                                                                                                                                                                 | Primary paths                                                                      | Spec     | Deps   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------- | ------ |
| B1  | [ ] Schema: requirement **type, status, priority, tags**, **parent** link                                                                                                            | `src/db/schema.ts`, `src/db/init.ts`, migrations                                   | §3.4, §7 | —      |
| B2  | [ ] Import: **projectKey** → resolve project by `**key`** + **parentExternalKey** validation                                                                                         | `imports.ts`, GraphQL inputs                                                       | §8       | A1     |
| B3  | [ ] Import: enum **normalization** + deterministic **warnings**                                                                                                                      | `imports.ts`                                                                       | §3.4, §8 | B1     |
| B4  | [ ] **Transaction** boundaries for bulk imports (requirements, TRR, design) — single commit / rollback semantics                                                                     | `imports.ts`, `design-links.ts`, `src/db/client.ts`                                | §4       | —      |
| B5  | [ ] Mutations: **link / unlink** requirement ↔ manual testcase                                                                                                                       | `src/domain/services/traceability.ts`, `src/domain/service.ts`, GraphQL            | §3.5, §6 | —      |
| B6  | [ ] Mutations: **link / unlink** automated ↔ manual (post-create)                                                                                                                    | `src/domain/services/traceability.ts`, GraphQL                                     | §3.2, §6 | —      |
| B7  | [ ] **Update** requirement; **delete:** **block** if any **manual** testcase is linked; return `fixHint` to unlink via **B5** first                                                  | `requirements.ts`, GraphQL                                                         | §3.4, §6 | B1, B5 |
| B8  | [ ] **Delete manual:** **block** if any automated testcase still linked; return `fixHint` to unlink via **B6** first                                                                 | `testcases.ts`, GraphQL                                                            | §3.2     | —      |
| B9  | [ ] **Delete automated:** **tombstone** testcase when **test results** (or runs) reference it; unlink manuals; same tombstone semantics as version history (**D4**) where applicable | `testcases.ts`, `src/db/schema.ts`, GraphQL                                        | §3.2, §6 | B6, D1 |
| B10 | [ ] **[post-MVP]** **Live** traceability graph + **coverage summary by requirement status**                                                                                          | `src/domain/services/reporting.ts`, `src/domain/services/traceability.ts`, GraphQL | §3.5     | B1     |
| B11 | [ ] Harden **requirement_design_links** uniqueness (**NULL** `designNodeId` / SQLite semantics)                                                                                      | `src/db/schema.ts`, `design-links.ts`                                              | §7, §8.7 | —      |
| B12 | [ ] Tests: traceability, imports, design-link edge cases                                                                                                                             | `tests/unit`, `tests/integration`                                                  | §9       | B2–B11 |


---

## Phase C — Test cases, steps, TRR


| ID  | Item                                                                                      | Primary paths                                           | Spec       | Deps       |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------- | ---------- |
| C1  | [ ] Manual testcase: **ordered steps** on create (action/name + expected)                 | `testcases.ts`, `test_case_steps`                       | §3.3       | —          |
| C2  | [ ] Enforce **≥1 step** for manual                                                        | `testcases.ts`                                          | §3.3       | C1         |
| C3  | [ ] GraphQL: **steps** on `TestCase`; create/update manual with steps                     | `src/graphql/type-defs.ts`, `inputs.ts`, `resolvers.ts` | §6         | C1         |
| C4  | [ ] **Update / delete** testcase with same validation rules as create                     | `testcases.ts`, GraphQL                                 | §6         | C2, B8, B9 |
| C5  | [ ] TRR: **nested Allure** steps + metadata (JSON blob and/or `parent_step_id` + indexes) | `src/db/schema.ts`, `imports.ts`                        | §3.3, §8.1 | —          |
| C6  | [ ] **Pluggable** step parser + **Allure** adapter (stable internal shape)                | `src/domain/services/trr/` (suggested)                  | §3.3       | C5         |
| C7  | [ ] GraphQL **TrrStepInput** (and types) for nesting                                      | `src/graphql/inputs.ts`, `type-defs.ts`                 | §8.1       | C5         |
| C8  | [ ] **Test result** artifact / attachment references (storage model + query fields)       | `src/db/schema.ts`, `runs.ts`, GraphQL                  | §3.3       | A6         |
| C9  | [ ] Tests: manual steps, TRR nested, negative cases                                       | `tests/`**                                              | §9.1–9.2   | C1–C8      |


---

## Phase D — Versioning and history


| ID  | Item                                                                                                            | Primary paths                                                                        | Spec       | Deps      |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------- | --------- |
| D1  | [ ] Tables: **test_case_versions**, **test_case_version_steps** + **§7** indexes                                | `src/db/schema.ts`, `src/db/init.ts`, migrations                                     | §7, §3.7   | —         |
| D2  | [ ] On **every** testcase mutation that changes content or **traceability links**: append **immutable** version | `versioning.ts`, `testcases.ts`, `src/domain/services/traceability.ts`, `imports.ts` | §3.7       | **H:** D1 |
| D3  | [ ] Query: version **history**; `**includeDeleted`** for admins                                                 | `versioning.ts`, GraphQL                                                             | §8.3       | D1        |
| D4  | [ ] Mutations: **tombstone** delete (scoped) + **restore**                                                      | `versioning.ts`, GraphQL                                                             | §3.7, §8.3 | D1        |
| D5  | [ ] Tests: history, tombstone, restore, default exclusion                                                       | `tests/`**                                                                           | §9.1–9.2   | D2–D4     |


---

## Phase E — Runs and KPI correctness


| ID  | Item                                                                                                        | Primary paths                                                              | Spec       | Deps          |
| --- | ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------- | ------------- |
| E0  | [ ] **Run snapshot:** scope **requirement ↔ manual** edges to run’s **project** (multi-project correctness) | `runs.ts`                                                                  | §8.5       | —             |
| E1  | [ ] Test run fields: **environment**, **build/version**, **trigger**, optional **finishedAt**               | `src/db/schema.ts`, `runs.ts`, GraphQL                                     | §3.6, §7   | —             |
| E2  | [ ] **kpiDashboard**: **fromDate** / **toDate**, **KPI_RANGE_INVALID**                                      | `kpi.ts`, `src/domain/service.ts`, `src/graphql/inputs.ts`, `type-defs.ts` | §8.2       | A8 optional   |
| E3  | [ ] **Daily trend:** per-day coverage (not copy of today’s `current` for every day)                         | `kpi.ts`                                                                   | §8.2, §3.8 | **S:** X1     |
| E4  | [ ] **Recalculate:** honor date range; **immutable** snapshots vs explicit **full rebuild** flag            | `kpi.ts`, `src/domain/service.ts`                                          | §8.2, §8.4 | **S:** E2, E3 |
| E5  | [ ] Run **aggregate** queries (totals, pass rate, duration) if still missing for clients                    | `runs.ts`, GraphQL                                                         | §3.6       | A6            |
| E6  | [ ] Tests: KPI sorting, precision, zero denominator, date range                                             | `tests/integration/graphql-kpi*.test.ts`                                   | §8.2, §9.2 | E2–E4         |


---

## Phase X — Design spikes (before heavy implementation)


| ID  | Item                                                                                                                          | Primary paths                                    | Spec       | Deps |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------- | ---- |
| X1  | [ ] **ADR / short doc:** how **daily** KPI and historical coverage stay correct (snapshots, events, or defined approximation) | `docs/` (e.g. `REPORTING_AND_KPI.md` or new ADR) | §3.8, §8.2 | —    |


---

## Phase F — CI, coverage, reporting artifacts


| ID  | Item                                                                                       | Primary paths                                 | Spec       | Deps |
| --- | ------------------------------------------------------------------------------------------ | --------------------------------------------- | ---------- | ---- |
| F1  | [ ] Enable **coverage** in Vitest; stage thresholds toward spec                            | `vitest.config.ts`, CI                        | §9.4       | —    |
| F2  | [x] **Allure** results + HTML report in CI (paths already in artifact upload)              | `vitest`, scripts, `.github/workflows/ci.yml` | §9.2, §9.4 | —    |
| F3  | [x] Optional: **mutation** suite job                                                       | workflow / script                             | §9.4, §11  | —    |
| F4  | [x] Optional: flaky **rerun** policy                                                       | `vitest.config.ts`                            | §9.4       | —    |
| F5  | [x] Process: **schema snapshot** + `BREAKING_CHANGES.md` on API breaks                     | `scripts/ci/`*, docs                          | §9.4       | —    |
| F6  | [~] **README:** point to canonical spec (`detailed.spec.backup.md` or renamed) and backlog | `README.md`                                   | —          | —    |


---

## Ticket dependencies


| Ticket | Hard deps | Notes                                                                                                                   |
| ------ | --------- | ----------------------------------------------------------------------------------------------------------------------- |
| D2     | D1        | After core **D2** exists, wire **C4**, **B5**, **B6**, and **imports** so every mutating path appends a version (§3.7). |
| E3     | —         | **Soft:** complete **X1** first to avoid rework.                                                                        |
| A4     | —         | Minimal list OK before **B1**; filters/fields expand after **B1**.                                                      |
| B2     | A1        | **projectKey** resolves to `projects.key`.                                                                              |
| B7     | B5        | **Delete requirement** is blocked until **requirement ↔ manual** links are removed (**B5**).                            |
| C4     | B8, B9    | Testcase **delete** must follow the same policies as **B8** / **B9** (and versioning **D2** when enabled).              |


---

## Product decisions (locked)


| #   | Topic                                   | Decision                                                                                             |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | **A1** project identity                 | Separate `**key`** column (imports use **projectKey** → `key`).                                      |
| 2   | **B8** delete manual                    | **Block** while automated links exist; user must unlink first (**B6**).                              |
| 3   | **B9** delete automated                 | **Tombstone** when results/runs reference the case (no hard delete of history).                      |
| 4   | **B10** live graph / coverage by status | **Post-MVP**; keep ticket, schedule after MVP slice.                                                 |
| 5   | Module layout                           | Dedicated `**traceability.ts`** for link/unlink; keep `**testcases.ts`** focused on case CRUD/steps. |
| 6   | **B7** delete requirement               | **Block** while **manual** testcases are linked; unlink via **B5** first (same idea as **B8**).      |


---

## Maintenance

- Mark done: `[ ]` → `[x]`; optional: PR link or date on the row.
