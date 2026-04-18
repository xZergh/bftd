# User Guide

## 1. What This Tool Does

TCMS helps you manage requirements, manual and automated tests, and execution reporting with traceability.

## 2. Quickstart

Developers can explore the API in the browser with the **GraphQL Explorer** at `http://localhost:4000/graphql` (see `[docs/GRAPHQL_EXPLORER.md](GRAPHQL_EXPLORER.md)`).

1. Create a project (application under test).
2. Import requirements.
3. Create manual testcases and link them to requirements.
4. Add automated testcases and link them to manual testcases.
5. Execute runs and review reports.

## 3. Requirements Workflow

- Import requirements from Agile-style JSON payload.
- Optionally link requirements to Penpot designs.
- Track requirement coverage through linked tests.

## 4. Testcase Workflow

- Manual testcases must have at least one linked requirement.
- Automated testcases must have at least one linked manual testcase.
- Manual and automated test steps are supported.

## 5. Test Runs and Reporting

- Run reports are point-in-time and snapshot-based.
- KPI dashboard shows formula-driven coverage and execution metrics.

## 6. KPI Metrics Explained

- Requirement coverage
- Testcase coverage
- Automation coverage (manual-based)
- Automation coverage (requirement-based)

See detailed formulas in `docs/REPORTING_AND_KPI.md`.

## 7. Common Validation Errors

- Missing required links
- Invalid import references
- Unsupported design provider input

Each blocking error returns a `fixHint` with suggested corrective action.