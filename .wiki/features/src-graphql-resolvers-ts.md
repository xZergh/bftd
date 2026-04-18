---

## title: "GraphQL Resolvers"
type: "feature"
status: "active"
source_paths: ["src/graphql/resolvers.ts", "src/graphql/inputs.ts", "src/graphql/type-defs.ts"]
updated_at: "2026-04-17"

Resolvers act as transport adapters around `TcmsService`.

## Key patterns

- Parse each resolver input using Zod schemas from `src/graphql/inputs.ts`.
- Delegate business operations to `ctx.service`.
- Normalize expected failures via `formatError` for mutation payloads.
- Re-throw some domain failures as `GraphQLError` with stable extension codes.
- Keep object mapping focused on API shape (for example requirement field mapping and test run detail assembly).

This file is large because it hosts all query/mutation wiring, but domain rules remain in `src/domain/services/*`.

## Related pages

- `[[concepts-architecture-boundaries]]`
- `[[concepts-error-contract]]`
- `[[features-src-domain-service-ts]]`