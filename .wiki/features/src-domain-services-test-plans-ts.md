---
title: "Test Plan Service"
type: "feature"
status: "active"
source_paths: ["src/domain/services/test-plans.ts", "src/domain/services/runs.ts"]
updated_at: "2026-04-22"
---

`test-plans.ts` introduces project-scoped test plan lifecycle and testcase linking.

## Behaviors

- Creates and updates plans with `name`, `description`, `releaseLabel`, and `sprintLabel`.
- Lists plans by project and resolves one plan with embedded linked test cases.
- Enforces that linked test cases belong to the same project and are not deleted.
- Supports idempotent link behavior (`linked: false` if link already exists).

## Run integration

- `createTestRun` now accepts optional `testPlanId`.
- When a plan is provided, run creation materializes one `run_test_case_assignments` row per linked testcase.
- Plan/project mismatch returns deterministic `ENTITY_NOT_FOUND` contract.

## Related pages

- `[[entities-test-plans-and-run-assignments]]`
- `[[features-src-domain-services-runs-ts]]`
