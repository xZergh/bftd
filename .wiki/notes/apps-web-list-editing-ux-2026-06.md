---
title: "Requirements & test cases list editing UX (2026-06)"
type: "note"
status: "active"
source_paths:
  - "apps/web/src/pages/RequirementsListPage.tsx"
  - "apps/web/src/pages/TestCasesListInlinePage.tsx"
  - "apps/web/src/pages/TestCaseDetailPage.tsx"
  - "apps/web/src/components/requirements/RequirementDetailPanel.tsx"
  - "apps/web/src/hooks/useColumnSort.ts"
updated_at: "2026-06-25"
---

# Requirements & test cases list editing UX

## Verified demo project (local `data/tcms.sqlite`)

| Field | Value |
|-------|-------|
| Project key | `demo-qa` |
| Project id | `5f0dc81a-222f-4203-9152-560a7afdbc4e` |
| Requirements | 3 (`DEMO-R1`, `DEMO-R2`, `DEMO-R3`) |

Requirements URL: `/projects/5f0dc81a-222f-4203-9152-560a7afdbc4e/requirements`

DB and UI match for titles, status, priority, and type on 2026-06-25.

## Unified list pattern (Requirements + Test cases)

Both tabs now follow the same model:

- Dense read-only table (row click selects; no inline cell editing on requirements).
- **Create** from toolbar → right `SplitWorkspace` inspector (`?new=1`).
- **Edit** in inspector/detail panel with debounced autosave + save indicator (no manual Save on detail).
- Long text: multiline fields (4 rows default); list display uses `.clamp-4` (4-line cutoff).
- Title fields use `.detail-title-input` (full width in panel).

## Column sorting (`useColumnSort`)

- Shared hook toggles asc/desc atomically per column.
- Default: string sort; `null`/`undefined` treated as empty string (`""`).
- Numeric columns must be **explicitly** configured per page via `sortOptions` (non-default):
  - Requirements: `linkedManualTestCaseCount` → `{ type: "number", nullValue: 0 }`
  - Test cases: `linkedRequirementCount` → `{ type: "number", nullValue: 0 }` (uses manual vs automated link count like the table cell).

## Related pages

- `[[features-src-domain-services-requirements-ts]]`
- `[[flows-seed-demo-qa-project]]`
- `[[features-apps-web-src-app-tsx]]`
