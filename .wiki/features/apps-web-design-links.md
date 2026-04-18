---
title: "Web design links (FE-H)"
type: "feature"
status: "active"
source_paths:
  - "apps/web/src/pages/ProjectDesignLinksPage.tsx"
  - "apps/web/e2e/fe-h-design-links.spec.ts"
updated_at: "2026-04-09"
---

## Purpose

Per-project UI for listing, upserting, and unlinking **requirement design links** (e.g. Penpot provider metadata) against the GraphQL API.

## Routing

- Path: `/projects/:projectId/design-links` (see `apps/web/src/App.tsx`).

## Behavior (high level)

- Loads requirements and existing design links for the project; supports create/update via upsert mutation and unlink.
- Uses shared form patterns and shell error handling consistent with other project-scoped pages.

## Backend alignment

- Domain behavior is documented on `[[features-src-domain-services-design-links-ts]]`.

## Related pages

- `[[features-apps-web-src-app-tsx]]`
- `[[features-apps-web-shell-polish]]`
