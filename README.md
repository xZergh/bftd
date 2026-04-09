# TCMS MVP

Standalone backend-first Test Case Management System (TCMS) for small QA teams.

## Status

- **Tracked backlog (implementation source of truth):** [.notes/TRACKED_BACKLOG.md](.notes/TRACKED_BACKLOG.md)
- **Frontend backlog + spec:** [.notes/FE_TRACKED_BACKLOG.md](.notes/FE_TRACKED_BACKLOG.md), [.notes/FE_MVP_SPEC.md](.notes/FE_MVP_SPEC.md)
- **Canonical product spec (vendored):** [docs/detailed.spec.v2.md](docs/detailed.spec.v2.md) (copy of `.notes/detailed.spec.v2.md`; edit in `.notes/` then re-copy when the spec changes).
- Spec draft: `TCMS_MVP_SPEC.md`
- Funding one-pager: `FUNDING_ONE_PAGER.md`
- Documentation guides: `docs/`

## Quick Links

- Developer guide: `docs/DEVELOPER_GUIDE.md`
- User guide: `docs/USER_GUIDE.md`
- API contracts: `docs/API_CONTRACTS.md` (includes OpenAPI `/openapi.yaml` and Swagger UI `/api-docs`)
- Reporting and KPI: `docs/REPORTING_AND_KPI.md`
- Operations and CI: `docs/OPERATIONS.md`
- Sample Allure report (single HTML, regenerate with `npm run allure:generate` after tests): `docs/reports/allure-report.html`
- **Local manual testing (API + web):** [docs/LOCAL_MANUAL_TESTING.md](docs/LOCAL_MANUAL_TESTING.md)

## Project Goals (MVP)

- Manage requirements, manual testcases, and automated testcases.
- Enforce deterministic relationship rules with actionable error hints.
- Support Agile requirements import and TRR/Allure automated step import.
- Provide snapshot-based traceability and formula-driven KPI reporting.
- Support Penpot requirement design links.

## Planned Tech Stack

- TypeScript + Node.js
- GraphQL API
- SQLite + Drizzle ORM
- Vitest + Supertest test stack
- **Web UI:** React + Vite workspace package [`apps/web`](apps/web) (`tcms-web`)

## Local setup

1. **Install:** `npm install` (npm workspaces: root + `apps/web`).
2. **API:** `npm run dev` (GraphQL at `http://localhost:4000/graphql` by default).
3. **Web (optional):** `npm run dev:web` → [http://127.0.0.1:5173/](http://127.0.0.1:5173/) (proxies `/graphql` to the API).

**Manual testing runbook:** [docs/LOCAL_MANUAL_TESTING.md](docs/LOCAL_MANUAL_TESTING.md). Developer details: [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md).

**E2E (web):** `npm run ci:e2e:web` (after `npm run e2e:install -w tcms-web` locally).

## Repository Documentation Policy

- If API/schema/import behavior changes, update relevant docs in the same PR.
- Keep examples current and executable where possible.