# Developer Guide

## 1. Architecture Overview

### 1.1 Target flow (pragmatic facade)

```text
GraphQL (resolvers + inputs + type-defs) → TcmsService (facade) → domain/services/* → Drizzle + SQLite
```

### 1.2 Layer boundaries and responsibilities


| Layer                  | Path                       | Responsibility                                                                      |
| ---------------------- | -------------------------- | ----------------------------------------------------------------------------------- |
| Schema contract        | `src/graphql/type-defs.ts` | SDL only                                                                            |
| Request validation     | `src/graphql/inputs.ts`    | Zod input schemas                                                                   |
| Transport / controller | `src/graphql/resolvers.ts` | Parse input, call `ctx.service`, map `AppError` to payloads. **No business rules.** |
| Application facade     | `src/domain/service.ts`    | Thin orchestration; delegates to `src/domain/services/`*.                           |
| Domain logic           | `src/domain/services/`*    | Business rules, queries, deterministic errors (`AppError`).                         |
| Errors                 | `src/domain/errors.ts`     | Shared error type and codes                                                         |
| Persistence            | `src/db/`*                 | Schema, init, client. **No domain rules.**                                          |


**Enforced in CI:** `scripts/ci/check-architecture-boundaries.ts` — GraphQL must not import `db`; `domain/services` must not import `graphql`; `db` must not import `domain`.

### 1.3 System modules (conceptual)

- projects
- requirements (includes Penpot link operations)
- testCases
- traceability
- testRuns
- reqImports
- trrImports
- versioning
- kpi
- reporting

### 1.4 Core data flow

- Requirement and testcase lifecycle
- Import pipelines
- Run snapshot capture
- KPI snapshot generation

### 1.5 Architecture Decision Record

For trade-offs, pitfalls, and exit criteria toward a hybrid repository model, see [ADR_PRAGMATIC_FACADE.md](ADR_PRAGMATIC_FACADE.md).

---

## 2. Code style (balanced baseline)

### 2.1 Mandatory

- **TypeScript:** `strict: true` (see `tsconfig.json`). Run `npm run typecheck` before push.
- **ESLint:** `npm run ci:lint` — `eslint.config.mjs` extends recommended + TypeScript recommended; `**@typescript-eslint/no-explicit-any` is error**. Unused vars: warn, with `^`_ ignore pattern.
- **Naming:** Prefer `createX`, `getX`, `importX`, `recalculateX` for public operations.

### 2.2 Advisory (soft targets)

- Prefer files under **~300 lines** and functions under **~80 lines**; split by capability before adding large features.
- Prefer importing domain modules via the barrel [src/domain/services/index.ts](../src/domain/services/index.ts) from `TcmsService`.
- Avoid `any`; if unavoidable, document why in the same PR.

### 2.3 Where new code goes (Builder checklist)

1. Business logic → `src/domain/services/<area>.ts`
2. API surface → `type-defs`, `inputs`, `resolvers`
3. Facade wiring → one-line delegate on `TcmsService` when exposing new service functions
4. Tests → see [§3 Testing architecture](#3-testing-architecture)

---

## 3. Testing architecture

### 3.1 Scope


| Kind        | Location                              | Purpose                                                 |
| ----------- | ------------------------------------- | ------------------------------------------------------- |
| Unit        | `tests/unit/`                         | Domain rules and facade behavior without HTTP           |
| Integration | `tests/integration/graphql-*.test.ts` | GraphQL contract, snapshots, imports, KPI, design links |
| Helpers     | `tests/helpers/`                      | Shared app/DB setup (`test-app.ts`, `test-service.ts`)  |


### 3.2 Conventions

- Split integration suites **by feature** (e.g. `graphql-core`, `graphql-imports`) to keep failures localized.
- For invalid operations, assert **deterministic errors**: at least `code` and actionable `fixHint` where the API returns `AppError` payloads.
- Prefer helpers over duplicating `createApp` / temp DB setup.

### 3.3 Commands

```bash
npm test
npm run test:unit
npm run test:integration
```

JUnit output: `artifacts/junit.xml` (see `vitest.config.ts`).

### 3.4 Mutation tests (extended suite)

Reserved for extended / nightly quality gates; not required for default PR loop unless policy says otherwise.

---

## 4. Local development setup

### 4.1 Prerequisites

- **Node.js:** `>=24 <25` (see `package.json` `engines` and `.nvmrc`)
- **npm** (lockfile: `package-lock.json`)

### 4.2 Install

```bash
npm ci
```

### 4.3 Environment variables

- `PORT` — HTTP port (default `4000`)
- `DB_PATH` — SQLite file path (default `./data/tcms.sqlite`)

### 4.4 Database and migrations

- Runtime uses `initSqlite` from [src/db/init.ts](../src/db/init.ts) for bootstrap.
- Drizzle Kit config: [drizzle.config.ts](../drizzle.config.ts)
- CI migration checks: `npm run ci:migration:fresh`, `npm run ci:migration:upgrade`

#### 4.4.1 SQLite indexes (spec §7 checklist)

When you add or change tables or unique constraints in [src/db/schema.ts](../src/db/schema.ts), keep persistence aligned:

1. Update [src/db/init.ts](../src/db/init.ts) (`CREATE TABLE` / `CREATE INDEX` / additive `ALTER` paths in `applyAdditiveMigrations`).
2. Run `npm run ci:migration:fresh` and `npm run ci:migration:upgrade`.
3. If you rename or replace a unique index, add a `DROP INDEX IF EXISTS ...` in the migration path so upgraded databases converge.

### 4.5 Start the service

```bash
npm run dev
```

GraphQL endpoint: `http://localhost:<PORT>/graphql` (see [src/server.ts](../src/server.ts)). GraphQL Explorer: `GET /graphql` in a browser ([docs/GRAPHQL_EXPLORER.md](GRAPHQL_EXPLORER.md)). Health: `GET /health`.

### 4.6 Local CI-style checks

```bash
npm run ci:typecheck
npm run ci:lint
npm run ci:architecture:boundaries
npm test
npm run ci:schema:check
npm run ci:schema:indexes
```

---

## 5. Rollout and promotion (adoption plan)

1. **Incremental application:** New and touched files should follow §2 and §3; avoid repo-wide rewrites unless needed.
2. **Blocking today:** `typecheck`, `eslint`, architecture boundaries, tests, schema contract (as configured in CI).
3. **Promote to blocking later:** Stricter file-size limits, additional ESLint rules, or stricter unused-var level — only after one or two iterations if noise stays low.
4. **When architecture escalates:** Follow exit criteria in [ADR_PRAGMATIC_FACADE.md](ADR_PRAGMATIC_FACADE.md) before introducing repositories.

---

## 6. Coding and PR rules

- Keep deterministic error contract (`code`, `message`, `fixHint`, optional `context`).
- Do not use names/titles as entity identity.
- Update docs in the same PR when contracts change.
- GraphQL schema snapshots: `npm run ci:schema:check`; update with `npm run ci:schema:update` when intentionally changing the contract.

---

## 7. GraphQL schema change policy

- Prototype phase: approved breaking changes allowed with required workflow.
- Post API lock: additive-only changes.

---

## 8. Troubleshooting

### 8.1 Import failures

- Check identity fields and fix hints.

### 8.2 KPI mismatch

- Verify formula metadata and snapshot generation timestamps.

### 8.3 Migration issues

- Validate fresh and upgrade-path migration checks.

### 8.4 ESLint / boundaries CI failures

- **Boundaries:** Move imports so GraphQL does not reference `src/db`, domain services do not reference `src/graphql`, and `src/db` does not reference `src/domain`.
- **Lint:** Fix `any` and unused symbols; use `_prefix` for intentionally unused parameters.

