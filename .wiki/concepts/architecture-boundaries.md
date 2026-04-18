---

## title: "Architecture Boundaries"

type: "concept"
status: "active"
source_paths: ["docs/DEVELOPER_GUIDE.md", "src/domain/service.ts", "src/graphql/resolvers.ts", "src/db/schema.ts"]
updated_at: "2026-04-17"

TCMS uses a pragmatic facade architecture:

`GraphQL -> TcmsService -> domain/services/* -> Drizzle + SQLite`

## Layer responsibilities

- GraphQL layer (`src/graphql/*`): SDL, input parsing, resolver dispatch, transport-level error mapping.
- Facade layer (`src/domain/service.ts`): thin method surface for the application use cases.
- Domain services (`src/domain/services/*`): business rules and data operations.
- Persistence (`src/db/*`): schema and DB bootstrap/client concerns.

## Guardrails

- CI enforces import boundaries via `scripts/ci/check-architecture-boundaries.ts`.
- GraphQL should not directly import database modules.
- Persistence should not import domain modules.

## Related pages

- `[[features-src-graphql-resolvers-ts]]`
- `[[features-src-domain-service-ts]]`
- `[[entities-src-db-schema-ts]]`
- `[[flows-request-lifecycle]]`