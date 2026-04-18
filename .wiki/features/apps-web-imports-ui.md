---
title: "Web Project Imports (FE-G)"
type: "feature"
status: "active"
source_paths:
  - "apps/web/src/pages/ProjectImportsPage.tsx"
  - "apps/web/src/graphql/documents.ts"
  - "apps/web/src/App.tsx"
  - "apps/web/src/pages/ProjectDetailPage.tsx"
  - "apps/web/e2e/fe-g-imports.spec.ts"
updated_at: "2026-04-09"
---

Project-scoped **Imports** UI at `/projects/:projectId/imports` (`ProjectImportsPage.tsx`). Users paste JSON for three bulk operations backed by GraphQL mutations.

## Tabs

1. **Requirements** — `importRequirements`. Payload is either a JSON **array** of items or an object with a `requirements` array. Each item needs `externalKey` and `title` for a successful row (see `[[features-src-domain-services-imports-ts]]`).
2. **TRR (automated)** — `importAutomatedFromTrr`. Array or `{ "automatedTests": [...] }`. Items need identity (`externalId` or `internalTestCaseId`), `title`, and valid in-project `linkedManualCaseIds`.
3. **Design links** — `importRequirementDesignLinks`. Provider string (default `penpot`) plus array or `{ "links": [...] }`. Each link needs `shareUrl`; requirement resolved via `requirementKey` or `requirementId`.

## Results UX

- Counts: created / updated / skipped.
- **Errors** table: `index`, `code`, `message`, `fixHint` (per `[[concepts-error-contract]]` bulk pattern).
- **Warnings** (requirements only): row index + message.

Parse failures (invalid JSON or wrong top-level shape) stay **on the page**; GraphQL transport failures use the global shell (`AppShell` / urql).

## Related pages

- `[[features-apps-web-src-app-tsx]]`
- `[[flows-import-pipelines]]`
- `[[features-src-domain-services-imports-ts]]`
- `[[features-src-domain-services-design-links-ts]]`
- `[[concepts-import-identity-rules]]`
