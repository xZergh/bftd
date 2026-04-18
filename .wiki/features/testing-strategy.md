---

## title: "Testing Strategy"
type: "feature"
status: "active"
source_paths: ["docs/DEVELOPER_GUIDE.md", "vitest.config.ts", "tests/unit/service.test.ts", "tests/integration/graphql-core.test.ts", "tests/helpers/test-app.ts", "tests/helpers/test-service.ts"]
updated_at: "2026-04-17"

Testing is split into unit and integration suites with shared helpers and deterministic error assertions.

## Structure

- Unit tests (`tests/unit`) validate service-level rules and error codes quickly.
- Integration tests (`tests/integration`) exercise GraphQL API behavior and end-to-end persistence semantics.
- Helpers in `tests/helpers` centralize app/service test setup.

## Practical patterns

- Assertions prioritize deterministic error codes and fix hints for invalid operations.
- Integration tests verify API payload shape for core user flows (project/summary, testcase validation, imports, traceability, KPI).
- Vitest config enables CI retries and coverage thresholds.

## Related pages

- `[[concepts-error-contract]]`
- `[[features-src-graphql-resolvers-ts]]`
- `[[features-ci-and-operations]]`