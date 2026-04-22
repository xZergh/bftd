---
title: "Test Plans And Run Assignments"
type: "entity"
status: "active"
source_paths: ["src/db/schema.ts", "src/db/init.ts"]
updated_at: "2026-04-22"
---

Test-plan support adds three tables plus one run column:

- `test_plans` - plan metadata (`project_id`, `name`, `description`, labels, timestamps).
- `test_plan_test_case_links` - many-to-many plan/testcase links with unique `(test_plan_id, test_case_id)`.
- `run_test_case_assignments` - run/testcase assignment materialization with unique `(run_id, test_case_id)`.
- `test_runs.test_plan_id` - optional reference to the source plan used for run creation.

## Invariants

- Plan links only valid when testcase is in same project and active.
- Assignment rows are deduplicated per run/testcase.
- Runs can exist without a plan (`test_plan_id` is nullable).

## Related pages

- `[[features-src-domain-services-test-plans-ts]]`
- `[[features-src-graphql-type-defs-ts]]`
