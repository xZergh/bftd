# Design requirements — foundations and first review pass

**Location:** `docs/plans/` (with [`penpot-flows-and-mcp-scaffold.md`](penpot-flows-and-mcp-scaffold.md) for Penpot page IA and MCP notes.)  
**Product direction:** [TCMS visual direction (concept)](../../.wiki/concepts/tcms-visual-direction.md) — tables-first, dark dense UI, folders/tree + grouped table, inline edit.

---

## 1. Purpose

Lock **tokens + a small set of UI building blocks** before expanding every screen. Primary review surface is the **web app** (seeded data, screenshots, PR previews). Penpot is optional for deeper canvas work; see §4 in the Penpot plan for folder-style page names when you use it.

---

## 2. Review workflow

1. Run **`npm run seed:demo`** (or use an existing workspace) and walk **`apps/web`** with **`DEMO-QA`** (or equivalent) loaded.
2. For each item in §3, confirm layout, density, states (default / empty / error), and alignment with the visual direction doc.
3. Record gaps as issues or a short bullet list; only then extend the component set or add Penpot element pages.

**Flows** (`01 Flows · …`) and full screen matrices are **out of scope** for this pass — defer until §3 is signed off (see Penpot plan §4.3).

---

## 3. First-pass component checklist (5–7)

Review these in the **web app** first; mirror in Penpot under `00 Foundations · Elements · {Name}` only if useful.

| # | Element | What to verify |
|---|---------|------------------|
| 1 | **AppShell** | Project scope, subnav, main + error region; with and without project selected if both exist. |
| 2 | **PageHeader** | Title, optional subtitle / actions; matches route chrome. |
| 3 | **DataTable** (or list-table pattern) | Header row, sort affordance, zebra / density, one populated row + empty row — see §4 for the current projects implementation. |
| 4 | **PrimaryButton** + **SecondaryButton** | Default, disabled; loading if applicable. |
| 5 | **EmptyState** | Placeholder + primary CTA on list surfaces (e.g. projects, requirements). |
| 6 | **ErrorBanner** | Transport / fatal-style messaging. |
| 7 | **FixHintCallout** | Row- or form-level `fixHint` (e.g. blocked delete); pairs with API error pattern. |

Expand the set only after these are stable (e.g. text fields, modals for destructive confirms).

---

## 4. Reference implementation: projects list table

The **`/projects`** list is a **dense, sortable table** implemented as a native **`<table>`** plus **`ProjectsPage.css`**, not a shared Tamagui `DataTable` primitive yet. Use it as a **concrete reference** for list density, sort buttons, row actions, and link-to-detail behavior.

| Topic | Location |
|-------|-----------|
| Page / logic | `apps/web/src/pages/ProjectsListPage.tsx` — `ProjectsListQuery`, sort keys, inline name edit, archive, “Show archived”. |
| Styles | `apps/web/src/pages/ProjectsPage.css` — `.projects-table`, toolbar, archived toggle, sort indicators. |
| Route | `apps/web/src/App.tsx` — `path="projects"` → `ProjectsListPage`. |

Other list pages import the same CSS for consistency until a shared table component exists.

---

## 5. Traceability

| Artifact | Role |
|----------|------|
| This file | **What** to review first and **where** to look in code. |
| [`penpot-flows-and-mcp-scaffold.md`](penpot-flows-and-mcp-scaffold.md) | Penpot **page naming**, flows later, optional MCP phases. |
| [`.wiki/concepts/tcms-visual-direction.md`](../../.wiki/concepts/tcms-visual-direction.md) | **Why** — locked visual and interaction decisions. |
