---
title: "Testcase Status"
type: "entity"
status: "active"
source_paths: ["src/db/schema.ts", "src/db/init.ts", "src/domain/projectSettings.ts", "src/domain/services/testcases.ts", "src/graphql/type-defs.ts"]
updated_at: "2026-08-06"
---

Authoring status on a testcase, deliberately separate from the delete lifecycle. Entity context in
`[[entities-src-db-schema-ts]]`; service rules in `[[features-src-domain-services-testcases-ts]]`.

## Values

`draft` | `ready` | `deprecated` — declared as `TEST_CASE_STATUSES` in
`src/domain/projectSettings.ts`, with `DEFAULT_TEST_CASE_STATUS = "draft"`.

**"active" is deliberately not a value.** The UI already surfaces an active/deleted lifecycle
derived from `is_deleted`, and reusing the word would make two unrelated concepts look like one.

## Status is not the delete lifecycle

Two independent axes on the same row:

| Axis | Column | Meaning | Changed by |
|---|---|---|---|
| Authoring status | `status` | Is this testcase ready to run? | `updateManualTestCase` / `updateAutomatedTestCase` |
| Delete lifecycle | `is_deleted`, `deleted_at` | Is it tombstoned? | tombstone / restore |

A `deprecated` testcase is still not deleted. The list UI shows them as separate **Status** and
**Lifecycle** columns for this reason.

## Storage and migration

`test_cases.status TEXT` (nullable), added to both the `CREATE TABLE` in `src/db/init.ts` and its
idempotent `ensureColumn` upgrade path.

Rows predating the column are **backfilled** on startup:

```sql
UPDATE test_cases SET status = 'draft' WHERE status IS NULL
```

Idempotent, so it is safe on every boot. Without it every existing testcase rendered a blank status,
which reads as data loss rather than a newly added field — this was caught by e2e, not by unit tests.

## API surface

- `TestCase.status: String` on the type
- `status` accepted on `CreateManualTestCaseInput`, `CreateAutomatedTestCaseInput`,
  `UpdateManualTestCaseInput`, `UpdateAutomatedTestCaseInput`
- `ProjectEnumSettings.testCaseStatuses` exposes the allowed values, so clients need not hardcode them
- `assertTestCaseStatus` rejects unknown values with `VALIDATION_ERROR` and a `fixHint` enumerating
  the allowed set — see `[[concepts-error-contract]]`

## Contrast with requirement enums

Requirement enums normalize silently: `[[features-src-domain-services-imports-ts]]` coerces an
unknown `requirementType` to `functional` and returns a warning. Testcase status **rejects** instead.
Callers that ignore the `warnings` array will not notice requirement coercion.

Note the requirement canon is `functional | non_functional | regression | integration | other` — there
is no `epic` or `feature` type, so hierarchy roles must be carried in tags.
