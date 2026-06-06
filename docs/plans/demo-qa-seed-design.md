# DEMO-QA seed — design requirements and E2E test matrix

**Purpose:** Canonical demo workspace for UI review, dense-table placeholders, and Playwright E2E. Shared constants live in `src/seed/demo-qa-constants.ts`; seed logic in `src/seed/demo-qa-seed.ts`.

---

## Project

| Field | Value |
|-------|-------|
| Key | `DEMO-QA` |
| Name | Demo QA sample workspace |
| Description | Seeded demo workspace for UI review, manual QA, and Playwright E2E. |

---

## Requirements (dense table coverage)

| Key | Title | Status | Priority | Type | Release | Sprint | Tags | Linked manual |
|-----|-------|--------|----------|------|---------|--------|------|---------------|
| `DEMO-R1` | User can sign in with email and password | approved | high | functional | 1.0 | Sprint-1 | demo, auth | login manual |
| `DEMO-R2` | Session expires after configured idle timeout | draft | medium | nonfunctional | 1.0 | Sprint-1 | demo, security | idle timeout manual |
| `DEMO-R3` | Password reset sends a single-use link | in_progress | high | functional | 1.0 | Sprint-2 | demo, auth | password reset manual |

**Design intent:** One row per enum value (status, priority, type); release/sprint columns populated; tags comma-separated in UI.

---

## Test cases

| Kind | Title | Links | Release | Sprint |
|------|-------|-------|---------|--------|
| Manual | Manual: successful login with valid credentials | `DEMO-R1` | 1.0 | Sprint-1 |
| Manual | Manual: idle timeout logs user out | `DEMO-R2` | 1.0 | Sprint-1 |
| Manual | Manual: password reset happy path | `DEMO-R3` | 1.0 | Sprint-2 |
| Automated | API: token exchange returns access token | manual login | 1.0 | Sprint-1 |

**Plan:** `Demo regression plan` — all four cases linked.

---

## Test run

| Name | Environment | Build | Results |
|------|-------------|-------|---------|
| Demo regression - staging | staging | demo-1.0.0 | login passed, idle failed, reset skipped, API passed |

**Reporting expectations:** 3 requirements, 3 manual, 1 run; 100% requirement and testcase coverage; 3 run traceability edges (req → manual pairs in snapshot).

---

## E2E usage

| Script | Role |
|--------|------|
| `npm run e2e:reset-db` | Wipe `data/e2e-playwright.sqlite`, init schema, seed DEMO-QA |
| Playwright `webServer` (tcms-api) | Runs reset immediately before starting API on port **4001** |
| `apps/web/e2e/fixtures/demo-qa.ts` | Constants + navigation helpers (`demo-qa` key is lowercase in UI) |

E2E web runs on **5174** by default so dev servers on 4000/5173 can stay up. Set `TCMS_E2E_REUSE_SERVERS=1` to reuse existing servers (not recommended unless they point at the E2E DB).

| Spec | Uses DEMO-QA for |
|------|------------------|
| `fe-c-requirements` | Edit `DEMO-R3`; delete-blocked on `DEMO-R1` |
| `fe-f-reporting` | KPI totals and traceability |
| `fe-m-project-subnav` | Nav chrome on reporting / test cases |
| `fe-b-projects` | **Own** ephemeral project (create/archive) |
| `fe-n-admin` | **Own** ephemeral archived project → admin purge |

Specs that still create isolated projects (runs, imports, design links, etc.) can migrate incrementally.

---

## Manual QA checklist (seed walk)

1. `/projects` — `DEMO-QA` visible; open overview KPI strip (3 reqs, 3 manual, 1 plan); latest run in Summary.
2. Requirements — sort columns; inline create row placeholders match DEMO keys; open `DEMO-R3` inspector/full page.
3. Test cases — four rows; automated row shows manual link count.
4. Plans — `Demo regression plan` selected via `?plan=`; four linked cases.
5. Runs — `Demo regression - staging` with mixed results.
6. Reporting — KPI 100% / totals 3·3·1; trace tree and run snapshot edges.
7. Admin (DEV) — archive a throwaway project; purge from `/admin`.

---

## Related

- [`src/seed/demo-qa-seed.ts`](../src/seed/demo-qa-seed.ts)
- [`.wiki/flows/seed-demo-qa-project.md`](../.wiki/flows/seed-demo-qa-project.md)
- [`design-requirements-foundations.md`](design-requirements-foundations.md)
