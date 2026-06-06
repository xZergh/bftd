---
title: "TCMS visual direction (dark, dense, tables-first)"
type: "concept"
status: "active"
source_paths:
  - "scripts/seed-demo-qa-project.ts"
  - ".wiki/flows/seed-demo-qa-project.md"
  - "docs/plans/penpot-mcp-scripts/phase-b-screen-scaffolds.js"
  - "docs/plans/penpot-mcp-scripts/phase-c-flow-map.js"
  - "docs/plans/penpot-mcp-scripts/phase-a-foundations.js"
updated_at: "2026-05-09"
---

# TCMS visual direction (dark, dense, tables-first)

Product goal: a **comfortable, intuitive CMS** that feels like a **professional tool**, not a marketing site. Visual references from external products are **IA-only**; palette and chrome are **generic** (no sampled colors from third-party screenshots).

## Locked decisions

| Topic | Choice |
|-------|--------|
| Primary posture | **Tables first**; long text lives in **large cells** or expanded rows |
| Forms vs grid | **Forms live in the table**; **no popups**; **minimal** extra form surfaces |
| Theme | **Charcoal** dark neutrals; **no brand color** for now; one **muted** accent later (TBD) |
| Viewport | **1920+** primary; **Full HD (1920x1080)** minimum; avoid large empty gutters |
| Drag-and-drop (MVP) | **(1)** reorder rows (steps, requirements, plan/run members), **(2)** reorder columns / saved views, **(3)** plan/run ordering; **requirements** reorder too |
| Grouping | **Folders** via **tree hierarchy** driving a **grouped table** (tree is source of truth for grouping). **Penpot wires:** one **`03 Wire / …`** page per **`SCR / …`** route; tree-table detail on **`03 Wire / requirements - tree-table-v1`** (MVP shell points there). |
| Inline edit | **Inline editing**, **debounced autosave**, **per-row save indicator** (idle / saving / saved / error); backend supports this |
| First tables | **Requirements** and **test cases** |

## Open decision: nesting depth

**Inclination:** allow **nested folders**, depth **not fixed** yet.

**Product data:** nesting depth still **TBD**; ship **UI** that tolerates deep trees (DND, keyboard nav) before locking a max depth in the API.

**Penpot / design v1:** `phase-b-screen-scaffolds.js` builds **`03 Wire / {route}`** pages (one wire board per route) plus **`02 Screens / MVP`** shells with pointers — tree-table wire stays richest; other routes get mode-specific structure notes. Product might still start with shallower default folders.

**Earlier note:** prototyping **2–3 levels** first remains a good **engineering** default for first backend iteration unless folders prove deeper in real projects.

**UI pattern:** **Tree column (left or outline)** + **grouped table** (right): selecting a node filters or scopes rows; **DND** can move rows **within** a group, **across** groups, and **onto** a folder node.

## Navigation pattern (no heavy modals)

Default: **routes + full-width table** for list surfaces. Prefer **expand row**, **resizable inspector**, or **query-selected row** over dialogs. Reserve **small confirms** for destructive bulk actions only.

## Penpot: use demo seed strings for realistic copy

When filling `SCR / ...` frames or `00 Foundations` examples, use the **same human-readable data** as `npm run seed:demo` so design reviews match walkthroughs. Canonical script: `scripts/seed-demo-qa-project.ts`. Command and behaviour: `[[flows-seed-demo-qa-project]]`.

### Project

| Field | Value |
|-------|--------|
| Name | `Demo QA sample workspace` |
| Key | `DEMO-QA` |

### Requirements (three)

| externalKey | title | description (short) | status | priority | tags | type |
|-------------|--------|---------------------|--------|----------|------|------|
| `DEMO-R1` | User can sign in with email and password | Covers primary authentication for the web client. | approved | high | demo, auth | functional |
| `DEMO-R2` | Session expires after configured idle timeout | Security requirement for idle logout. | draft | medium | demo, security | nonfunctional |
| `DEMO-R3` | Password reset sends a single-use link | Self-service recovery flow. | in_progress | high | demo, auth | functional |

### Manual test cases (three)

1. **Manual: successful login with valid credentials** - linked to R1 - steps: (1) Open sign-in page -> Email and password fields visible; (2) Enter valid credentials and submit -> User lands on home dashboard - release `1.0`, sprint `Sprint-1`.

2. **Manual: idle timeout logs user out** - linked to R2 - steps: (1) Sign in and remain idle past timeout -> Session ends; sign-in required - release `1.0`, sprint `Sprint-1`.

3. **Manual: password reset happy path** - linked to R3 - steps: (1) Request reset for known email -> Confirmation message shown; (2) Open reset link and set new password -> Can sign in with new password - release `1.0`, sprint `Sprint-2`.

### Automated test case (one)

- **API: token exchange returns access token** - linked to manual login case - release `1.0`, sprint `Sprint-1`.

### Sample run and results

- **Run:** name `Demo regression - staging` (seed source uses a unicode dash; use ASCII `-` in Penpot/UI copy), environment `staging`, build `demo-1.0.0`, trigger `seed-script`.
- **Results (in seed order):** login manual **passed** (1200 ms); idle timeout manual **failed** (800 ms); reset manual **skipped** (0 ms); automated auth **passed** (340 ms).

### Penpot hygiene

Use **ASCII-only** strings in MCP-generated layer names and long `Text` bodies when possible (avoid em dash `—`, ellipsis `…`, and smart quotes) so **encoding** stays stable across plugin / client paths. See `[[flows-penpot-mcp-chunked-execute]]`.

### Penpot Phase B (scripted)

- **Board names** use ASCII hyphen: `SCR / requirements - tree-table-v1` (not em dash). Older frames named with unicode punctuation can be deleted manually after re-running Phase B.
- **Wire pages (`03 Wire / …`):** mirror each **`SCR / …`** route; board name **`Wireframe / {same tail}`**. Tree-table page carries split pane + grouped table + DND/edit callouts; other pages carry short **React structure/behavior** notes per content mode. MVP **`SCR / …`** frames are shell + pointer only. All wire boards refresh when Phase B runs.
- Other `SCR / ...` frames carry **subtitle** lines built from the same **DEMO-QA** strings as `npm run seed:demo` (`docs/plans/penpot-mcp-scripts/phase-b-screen-scaffolds.js`).

## Related

- `[[flows-seed-demo-qa-project]]` — how to create `DEMO-QA` in a local DB for UI review.
- `[[flows-penpot-mcp-chunked-execute]]` — chunked Penpot scripts for foundations / screens / flow index.
- `[[concepts-ui-qa-layout-tamagui-and-mobile]]` — Tamagui layout direction for the web app.
