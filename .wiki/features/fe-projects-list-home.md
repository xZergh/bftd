---
title: "FE: Projects list and home redirect"
type: "feature"
status: "active"
source_paths:
  [
    "apps/web/src/pages/ProjectsListPage.tsx",
    "apps/web/src/pages/HomePage.tsx",
    "apps/web/src/navigation/lastProjectPath.ts",
    "apps/web/src/layout/AppShell.tsx",
  ]
updated_at: "2026-04-19"
---

## Product requirements

1. Home (`/`) redirects to the last persisted project URL when set; otherwise `/projects`.
2. New project: modal on `/projects`, opened from nav **Projects › New** (`?new=1`).
3. List rows: archive / restore icon actions.
4. Status column only when **Show archived** switch is on.
5. Project **name** links to project detail (no separate Open column).
6. **Edit** / **Lock** toggles inline name editing with debounced `updateProject`.
7. Optional **description** on projects (API, list column, detail edit).
8. **Key** not shown as a column (`data-project-key` on `<tr>` for tests).
9. Plain `<table>` without disclosure/sort arrow affordances.

## Diagnostics

- Playwright shell tests use `/dev/shell` (`ShellDiagnosticsPage`). Restart the e2e API after schema changes so client and server SDL match.

## Related

- `[[features-apps-web-src-app-tsx]]`
- `[[features-src-domain-services-projects-ts]]`
