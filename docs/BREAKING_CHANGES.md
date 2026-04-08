# GraphQL API — breaking changes

This document records **intentional, reviewed** breaking changes to the public GraphQL schema and related contracts. Routine additive changes (new optional fields, new types) belong in commit messages only.

## Schema snapshot workflow

1. The committed contract lives at `contracts/graphql-schema.snapshot.graphql`.
2. `npm run ci:schema:check` compares the live schema from `buildSchema()` to that file.
3. If you change types, fields, or arguments in a **breaking** way, update the snapshot **after** this review:
   - Run `npm run ci:schema:update` (or the equivalent script your team uses).
   - Commit the updated `contracts/graphql-schema.snapshot.graphql` together with this entry.

## When a change counts as breaking

Typical breaking changes include:

- Removing a field, argument, enum value, or type used by clients.
- Changing a field’s type (e.g. `String` → `Int`, nullable ↔ non-null).
- Renaming a field or type without a deprecation period (if your policy requires deprecations first).

Non-breaking examples: new optional fields, new types, new enum values (unless clients assume exhaustive enums).

## Emergency override (CI only)

If CI must proceed while a schema diff is still under review, set `ALLOW_BREAKING_SCHEMA=1` for the schema check step. **Do not merge** without updating the snapshot and adding an entry below.

## Log

| Date (UTC) | PR / change | Summary |
| ---------- | ----------- | ------- |
| _—_ | _—_ | _No entries yet._ |

_Add new rows above the placeholder row. Remove the placeholder row when the first real entry exists._
