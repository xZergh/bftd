---
title: "Web Plans Tab"
type: "feature"
status: "active"
source_paths: ["apps/web/src/pages/TestPlansListPage.tsx", "apps/web/src/components/ProjectSubNav.tsx", "apps/web/src/pages/TestRunsListPage.tsx"]
updated_at: "2026-04-22"
---

The project workspace now exposes a dedicated `Plans` tab between `Test cases` and `Runs`.

## UI scope

- Lists project plans and supports inline plan creation.
- Provides per-plan management panel for update/delete.
- Allows linking/unlinking any active manual or automated testcase to a plan.
- Run create UI includes optional plan picker (`No plan` default).

## Navigation contract

- Subnav order is now: `Project`, `Requirements`, `Test cases`, `Plans`, `Runs`, `Reporting`, `Imports`, `Design links`.
- Test id for the new nav entry: `project-nav-plans`.

## Related pages

- `[[features-src-domain-services-test-plans-ts]]`
- `[[features-apps-web-ui-testing]]`
