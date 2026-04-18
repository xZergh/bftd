---
title: "Request Lifecycle"
type: "flow"
status: "active"
source_paths: ["src/app.ts", "src/graphql/resolvers.ts", "src/domain/service.ts"]
updated_at: "2026-04-17"
---

GraphQL request handling flow:

1. HTTP request reaches Yoga server at `/graphql`.
2. Resolver parses input with Zod schema.
3. Resolver calls `ctx.service` facade method.
4. Facade delegates to specific domain service function(s).
5. Domain logic reads/writes DB through Drizzle.
6. Resolver maps result or deterministic error payload.
7. GraphQL response returns data and/or typed error information.

## Important branches

- Validation and domain errors are normalized for client safety and operability.
- Unexpected internal errors are masked by Yoga default masking path.

## Related pages

- `[[features-src-app-ts]]`
- `[[features-src-graphql-resolvers-ts]]`
- `[[features-src-domain-service-ts]]`
- `[[concepts-error-contract]]`
