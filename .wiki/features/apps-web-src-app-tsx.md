---
title: "Web App Routing Shell"
type: "feature"
status: "active"
source_paths: ["apps/web/src/App.tsx", "apps/web/README.md"]
updated_at: "2026-04-09"
---

The React app defines route-level page composition under an `AppShell` layout (`apps/web/src/App.tsx`).

## Route map

- `/` — home (API smoke / error demos)
- `/projects` — project list
- `/projects/:projectId` — project detail
- `/projects/:projectId/requirements` and `.../requirements/:requirementId`
- `/projects/:projectId/test-cases` and `.../test-cases/:testCaseId`
- `/projects/:projectId/runs` and `.../runs/:runId`
- `/projects/:projectId/reporting`
- `/projects/:projectId/imports`
- `/projects/:projectId/design-links`

## Dev-only route

- When `import.meta.env.DEV`, `/e2e-throw` mounts `E2eThrowRoute` to exercise the route error boundary in Playwright. Omitted in production builds.

## Shell behavior

- Layout, banners, nav, project picker, skip link, and route error boundary live in `apps/web/src/layout/AppShell.tsx` (see `[[features-apps-web-shell-polish]]`).

## Notes

- Route composition only; data loading and mutations live in page components.
- Playwright E2E specs are named by FE phase (`fe-a` … `fe-j`) under `apps/web/e2e/`; tagged `@smoke` subset via `npm run e2e:smoke` in `tcms-web`.

## Related pages

- `[[features-apps-web-imports-ui]]`
- `[[features-apps-web-design-links]]`
- `[[features-apps-web-testcase-version-history]]`
- `[[features-apps-web-shell-polish]]`
- `[[features-src-graphql-resolvers-ts]]`
