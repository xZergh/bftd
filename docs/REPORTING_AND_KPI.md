# Reporting and KPI

## 1. Reporting Model

- Traceability graph: Requirement -> Manual -> Automated.
- Graph view shows raw links as stored.
- Run-level reporting is snapshot-based and immutable.

## 2. KPI Model

- Hybrid storage:
  - on-demand aggregation
  - project/run/daily snapshots
- Coverage values are formula-driven.

## 3. Coverage Formulas

### 3.1 Requirement Coverage

- numerator: covered requirements
- denominator: total requirements

### 3.2 Testcase Coverage

- numerator: manual testcases linked to requirements
- denominator: total manual testcases

### 3.3 Automation Coverage (Manual)

- numerator: manual cases with at least one automated link
- denominator: total manual cases

### 3.4 Automation Coverage (Requirement)

- numerator: requirements linked to any automated testcase
- denominator: total requirements

## 4. Multi-Hop Metrics

- requirements with manual links
- requirements with automated links via manual
- automated cases reachable from requirements
- orphan manual cases
- orphan automated cases

All metrics are deduplicated by unique IDs in project scope.

## 5. Historical Consistency Rules

- KPI snapshots are immutable by default.
- Admin can trigger explicit full historical rebuild.

## 6. KPI Validation and Troubleshooting

- Check formula metadata IDs match formula value IDs.
- Verify snapshot timestamps and date ranges.
- Validate denominator handling for `0` values.