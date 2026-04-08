# TCMS MVP

Standalone backend-first Test Case Management System (TCMS) for small QA teams.

## Status

- Spec draft: `TCMS_MVP_SPEC.md`
- Funding one-pager: `FUNDING_ONE_PAGER.md`
- Documentation guides: `docs/`

## Quick Links

- Developer guide: `docs/DEVELOPER_GUIDE.md`
- User guide: `docs/USER_GUIDE.md`
- API contracts: `docs/API_CONTRACTS.md`
- Reporting and KPI: `docs/REPORTING_AND_KPI.md`
- Operations and CI: `docs/OPERATIONS.md`

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

## Local Setup (Placeholder)

1. Install dependencies.
2. Configure environment variables.
3. Run migrations.
4. Start API server.
5. Run tests.

Detailed commands will be added in `docs/DEVELOPER_GUIDE.md`.

## Repository Documentation Policy

- If API/schema/import behavior changes, update relevant docs in the same PR.
- Keep examples current and executable where possible.