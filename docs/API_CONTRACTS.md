# API Contracts

## HTTP surface

- **GraphQL:** `POST /graphql` with JSON body `{ "query": "...", "variables": { } }`.
- **OpenAPI:** Machine-readable contract at `GET /openapi.yaml` ([`contracts/openapi.yaml`](../contracts/openapi.yaml)).
- **Swagger UI:** Interactive docs at `GET /api-docs` (also `GET /swagger`).

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

## 4. KPI Contract

- Query: `kpiDashboard(...)`
- Mutation: `recalculateKpiSnapshots(...)`
- Formula metadata: `coverageFormulaInfo[]`
- Formula values: `coverage[]`

## 5. Schema Change Policy

- Prototype phase may allow approved breaking changes.
- After API lock milestone, additive-only schema changes.