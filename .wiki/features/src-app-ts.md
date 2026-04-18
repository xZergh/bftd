---

## title: "Backend App Composition"
type: "feature"
status: "active"
source_paths: ["src/app.ts", "src/server.ts", "src/graphql/schema.ts"]
updated_at: "2026-04-17"

`createApp` composes persistence, domain facade, GraphQL schema, and HTTP server.

## Responsibilities

- Initialize SQLite (`initSqlite`) and DB client (`createDb`).
- Construct `TcmsService` as app context.
- Build GraphQL Yoga server with endpoint `/graphql` and embedded GraphiQL config.
- Attach custom masked error behavior to preserve safe domain error codes.
- Return a Node `http` server wrapper.

`src/server.ts` is the executable entrypoint that reads `PORT` and `DB_PATH`, then starts listening.

## Related pages

- `[[features-src-graphql-resolvers-ts]]`
- `[[features-src-domain-service-ts]]`
- `[[concepts-error-contract]]`
- `[[flows-request-lifecycle]]`