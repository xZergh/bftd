---
title: "Web App Routing Shell"
type: "feature"
status: "active"
source_paths: ["apps/web/src/App.tsx", "apps/web/README.md"]
updated_at: "2026-04-09"
---

The React app defines route-level page composition under an `AppShell` layout.

## Route map

- `/` home
- `/projects` list
- `/projects/:projectId` detail
- Nested requirement, testcase, run, reporting, and **imports** routes per project

## Notes

- This file is route composition only; data loading and mutations live in page components.
- E2E coverage is organized by feature phase (`fe-a` through `fe-g`) in `apps/web/e2e`.

## Related pages

- `[[features-apps-web-imports-ui]]`
- `[[features-src-graphql-resolvers-ts]]`
