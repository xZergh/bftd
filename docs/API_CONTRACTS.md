# API Contracts

## 1. GraphQL Contract Principles

- Deterministic responses for validation failures.
- Stable error codes.
- Formula-driven KPI response model.

## 2. Error Contract

Blocking validation errors return:

- `code`
- `message`
- `fixHint`
- `context` (optional)

## 3. Import Contracts

### 3.1 Agile Requirements Import

- Input: `projectKey`, `requirements[]`
- Identity: `projectKey + externalKey`

### 3.2 TRR Automated Import

- Step format: Allure
- Identity resolution:
  - `internalTestCaseId` preferred
  - fallback `project + externalId`

### 3.3 Penpot Link Import

- Provider: `penpot`
- Requirement identity:
  - `requirementId` preferred
  - fallback `requirementKey`

## 4. Read APIs (project catalog)

After Q1 release/sprint labels, list queries use the same optional `releaseLabel` / `sprintLabel` filters as `projectSummary` and KPI (omit both to include all labels in the project).

- Query: `requirements(input: ProjectLabelFilterInput!)` — ordered by `externalKey`.
- Query: `testCases(input: TestCasesQueryInput!)` — optional `type` (`manual` | `automated`); ordered by `title`.
- Query: `testRuns(input: ProjectLabelFilterInput!)` — newest first.

## 5. KPI Contract

- Query: `kpiDashboard(...)`
- Mutation: `recalculateKpiSnapshots(...)`
- Formula metadata: `coverageFormulaInfo[]`
- Formula values: `coverage[]`

## 6. Schema Change Policy

- Prototype phase may allow approved breaking changes.
- After API lock milestone, additive-only schema changes.