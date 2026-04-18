---

## title: "Error Contract"

type: "concept"
status: "active"
source_paths: ["docs/API_CONTRACTS.md", "src/domain/errors.ts", "src/graphql/resolvers.ts", "src/app.ts"]
updated_at: "2026-04-17"

The API uses deterministic error semantics centered on `AppError` and GraphQL-safe masking.

## Contract shape

- Expected error fields are `code`, `message`, `fixHint`, and optional `context`.
- Resolver mutations often return `{ data, error }` payloads for validation/business failures.
- Some query paths rethrow domain errors as `GraphQLError` with `extensions.code`.

## Transport behavior

- In `src/app.ts`, Yoga masking is customized so non-internal GraphQL errors are preserved.
- Internal server errors still go through default masking behavior.

## Why this matters

- Clients (including the web app and tests) can rely on stable error codes and actionable hints.

## Related pages

- `[[features-src-graphql-resolvers-ts]]`
- `[[features-src-app-ts]]`