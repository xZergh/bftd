---
title: "Web App Routing Shell"
type: "feature"
status: "active"
source_paths: ["apps/web/src/App.tsx", "apps/web/README.md"]
updated_at: "2026-04-19"
---

The React app defines route-level page composition under an `AppShell` layout (`apps/web/src/App.tsx`).

## Route map

- `/` — redirects to the last visited project path stored in `localStorage` (`tcms.lastProjectPath`) when set; otherwise redirects to `/projects` (`apps/web/src/pages/HomePage.tsx`).
- `/projects` — project list; query `?new=1` opens the new-project modal (`apps/web/src/pages/ProjectsListPage.tsx`).
- `/projects/:projectId` — project detail
- `/projects/:projectId/requirements` and `.../requirements/:requirementId`
- `/projects/:projectId/test-cases` and `.../test-cases/:testCaseId`
- `/projects/:projectId/runs` and `.../runs/:runId`
- `/projects/:projectId/reporting`
- `/projects/:projectId/imports`
- `/projects/:projectId/design-links`

## Dev-only routes

- When `import.meta.env.DEV`, `/dev/shell` mounts `ShellDiagnosticsPage` (GraphQL transport + AppError demos for Playwright `fe-a` / smoke).
- When `import.meta.env.DEV`, `/e2e-throw` mounts `E2eThrowRoute` to exercise the route error boundary in Playwright. Omitted in production builds.

## Last project path

- `apps/web/src/layout/AppShell.tsx` persists `location.pathname` to `localStorage` when it matches a concrete project route (`/projects/:projectId` or nested paths). See `apps/web/src/navigation/lastProjectPath.ts`.

## Shell behavior

- Layout, banners, nav, project picker, skip link, and route error boundary live in `apps/web/src/layout/AppShell.tsx` (see `[[features-apps-web-shell-polish]]`). Main nav **Projects** opens a dropdown (`apps/web/src/components/ProjectsNavDropdown.tsx`) for All projects / New project.

## Notes

- Route composition only; data loading and mutations live in page components.
- Playwright E2E specs are named by FE phase (`fe-a` … `fe-j`) under `apps/web/e2e/`; tagged `@smoke` subset via `npm run e2e:smoke` in `tcms-web`. Shell diagnostics use `/dev/shell`; restart the e2e API if the schema changes so the client and server stay aligned.

## Related pages

- `[[features-apps-web-imports-ui]]`
- `[[features-apps-web-design-links]]`
- `[[features-apps-web-testcase-version-history]]`
- `[[features-apps-web-shell-polish]]`
- `[[features-src-graphql-resolvers-ts]]`
