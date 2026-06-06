# Penpot design system and wireframes — flows and MCP scaffold plan

Branch: `docs/penpot-flows-mcp-plan` (created from `main` after pull).  
Audience: designers and implementers automating a first Penpot draft via the **Penpot MCP** (`execute_code`, `penpot_api_info`, `export_shape`), then refining in Penpot and shipping in **`apps/web`** (React + Tamagui + urql).

**Web-first foundations checklist** (what to review before scaling screens): [`design-requirements-foundations.md`](design-requirements-foundations.md).

Canonical product journey (from `.notes/FE_TRACKED_BACKLOG.md`): **project → import or create requirements → manual tests + links → automated tests + links → plans (optional) → run + results → KPI / traceability**. Imports and design links can be prioritized early for adoption.

---

## 1. Preconditions

1. Penpot file open; **Penpot MCP plugin** connected to this workspace MCP server (see MCP `high_level_overview`).
2. Choose one Penpot **file** as the design source of truth (local library + tokens live in that file).
3. Optional: link a shared external library later; MVP plan assumes **one file** with `penpot.library.local`.

---

## 2. Primary persona flows (QA / TCMS operator)

Each flow below lists **user intent**, **route** (from `apps/web/src/App.tsx`), **happy path**, and **Penpot frame states** to wireframe (minimum). Use these names as **board titles** so exports and PRs stay searchable.

### F1 — Workspace entry and project scope

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | Open app, understand empty vs seeded state | `/` (`HomePage`) | Home — no project; Home — hint to pick project |
| 2 | List projects, create, archive | `/projects` | List; Create modal/inline; Archived hidden; Show archived |
| 3 | Enter project | `/projects/:projectId` | Project overview / hub (whatever `ProjectDetailPage` emphasizes) |

**Shell invariant:** every scoped frame sits inside **App shell** (skip link, project picker, subnav). One Penpot component: `CMP / AppShell` with slots: `slot:subnav`, `slot:main`, `slot:errors`.

### F2 — Requirements lifecycle

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | Browse requirements | `/projects/:projectId/requirements` | Table — populated; Empty |
| 2 | Create / edit | same + detail | Create; Detail — view; Detail — edit |
| 3 | Delete blocked by traceability | detail | Delete error with **`fixHint`** strip (copy from E2E / API contract) |

### F3 — Test cases and traceability (manual + automated)

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | Inline list | `/projects/:projectId/test-cases` | Dense table; filters if any |
| 2 | Detail, steps, links | `/projects/:projectId/test-cases/:testCaseId` | Manual steps; Automated panel; Link picker / graph affordance |
| 3 | Tombstone / restore (automated) | detail | Tombstoned banner; Restore CTA |

### F4 — Test plans (curate what runs)

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | List plans, create | `/projects/:projectId/plans` | Empty; List + inline create |
| 2 | Manage plan, link cases | same | Selected plan panel; Linked manual + automated rows; Unlink |
| 3 | Delete / update plan | same | Confirm destructive; Inline rename |

Source: `.wiki/features/apps-web-test-plans.md`, `projectWorkspaceNav.ts` section `plans`.

### F5 — Runs and results

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | List runs | `/projects/:projectId/runs` | Empty; List with aggregates hint |
| 2 | Create run (optional plan) | list or detail entry | Create — plan picker default **No plan**; Create — plan selected |
| 3 | Submit results | `/projects/:projectId/runs/:runId` | Result form; After submit — aggregate summary |

**Backend coupling (for annotations, not full UI):** creating a run captures **run traceability snapshot** (immutable edges). Wireframe **copy** can mention “snapshot at run creation” on run detail footer/tooltip. See `.wiki/flows/run-traceability-snapshot.md`.

### F6 — Reporting (KPI + traceability graph)

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | Open reporting | `/projects/:projectId/reporting` | KPI cards — loading; KPI — values + formula labels |
| 2 | Traceability / coverage | same | Graph summary; Coverage-by-status legend |
| 3 | Date / release filters (if surfaced) | same | Filter bar — collapsed; expanded |

**Backend coupling:** dashboard read can **trigger KPI recalculation** (see `.wiki/flows/kpi-snapshot-lifecycle.md`). Penpot: optional small “Refreshing metrics…” state on first load.

### F7 — Imports (bulk adoption)

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | Choose import kind | `/projects/:projectId/imports` | Tabs or sections: Requirements / TRR / Design links |
| 2 | Paste JSON, submit | same | Editor; Success — counts |
| 3 | Partial failure | same | Error table — row index, message (matches `import` pipeline semantics) |

Pipeline reference: `.wiki/flows/import-pipelines.md` (validate → batch pre-check → transaction → per-item errors).

### F8 — Penpot design links (meta-loop)

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | List links | `/projects/:projectId/design-links` | Empty; Table — provider Penpot |
| 2 | Upsert | same | Form — requirement id + URL/title |
| 3 | Unlink | same | Row action; confirm optional |

This flow is **about linking requirements to Penpot**, not about authoring the library itself—keep a clear mental separation: **TCMS UI** vs **Penpot canvas**.

### F9 — Version history (test case)

| Step | Intent | Route | Penpot frames |
|------|--------|-------|----------------|
| 1 | View history after edits | `/projects/:projectId/test-cases/:testCaseId` | Version table — newest first; autosave bump |

---

## 3. Cross-cutting flows (system, shown as UI states)

These are not separate routes but **states** or **banners** worth standardizing in the design system.

| System flow | User-visible pattern | Notes |
|-------------|------------------------|--------|
| GraphQL request | Loading skeleton → data or **AppError** | `.wiki/flows/request-lifecycle.md` |
| Import pipeline | Progress then **row-level errors** | Partial success UI |
| KPI refresh | First paint may wait on recalc | Optional subtle loading on reporting |
| Run snapshot | Stable traceability on run detail | Educational tooltip / footnote |

---

## 4. Penpot file structure (recommended)

Penpot does not nest **pages** like folders; use a **stable prefix** so the page list reads as IA: `Area · Subarea · …` (or `Area / Subarea / …` if you prefer slash). Boards inside each page stay flat; group them with naming (`CMP / …`, `SCR / …`).

**Review workflow (current default):** validate **tokens and key components** in the **web app** (and screenshots / PR previews) first; treat Penpot as optional for deep canvas work. **Flows** (`01 Flows / …`) can wait until shells and elements are agreed.

### 4.1 Foundations (folder-style pages)

| Page name (example) | Contents |
|---------------------|----------|
| `00 Foundations · Tokens` | Token set `tcms-core`, semantic color/spacing/radius tokens; short **Text** note linking to Tamagui theme names |
| `00 Foundations · Styles` | Library colors / typographies (`TCMS / …`) used across components |
| `00 Foundations · Elements · {Name}` | One page per **key component** you want to review in isolation (e.g. `… · AppShell`, `… · DataTable`, `… · PageHeader`). Each page: one main board `CMP / {Name}` (source) + optional variant boards (states, errors) |

Start with a **small set** (AppShell, PageHeader, DataTable, PrimaryButton, EmptyState, ErrorBanner / FixHint) and expand after sign-off.

### 4.2 Screens (folder-style pages)

| Page name (example) | Contents |
|---------------------|----------|
| `02 Screens · MVP · {route tail}` | One **page per route or route group** so the sidebar does not become one endless canvas. Example: `02 Screens · MVP · requirements` holds all requirement-related **`SCR / …`** boards; `… · runs` holds run boards |
| Board naming (unchanged intent) | `SCR / {route segment} - {state}` on each page |

Wire pages can follow the same pattern when you add them again, e.g. `03 Wire · requirements · tree-table-v1` with board `Wireframe / …`.

### 4.3 Flows (later)

| Page name | Contents |
|-----------|----------|
| `01 Flows · Journeys` | **Deferred** until foundations + core screens are stable. Then: vertical column of boards `FLOW / F1-entry`, … with step callouts mapped to the flow tables in §2 |

**Naming convention for boards:** keep **`CMP / …`**, **`SCR / …`**, **`Wireframe / …`**, **`FLOW / …`** prefixes so exports and search stay consistent (ASCII hyphen inside slugs).

---

## 5. MCP automation — phased `execute_code` scripts

Run scripts only with the Penpot file connected. Use `storage` to persist IDs (token set, component roots, page names). Do not `console.log` return payloads.

**Refresh / reset:** **`npm run penpot:run-mcp-phases:fresh`** runs **Phase X** (wipe every page’s root, best-effort delete extra pages, clear `storage.tcms`) then A–C — [`phase-x-wipe-all-canvas.js`](penpot-mcp-scripts/phase-x-wipe-all-canvas.js). **`npm run penpot:run-mcp-phases:backup`** runs **Phase Z** (rename to `BACKUP YYYY-MM-DD / …`) then A–C — [`phase-z-backup-canonical-pages.js`](penpot-mcp-scripts/phase-z-backup-canonical-pages.js). **`npm run penpot:run-mcp-phases:reset`** runs **Phase Y** (`BACKUP PRE-RESET …`), a **`saveVersion`** snapshot, then A–C — [`phase-y-reset-canonical-pages.js`](penpot-mcp-scripts/phase-y-reset-canonical-pages.js). Setting **fresh** (`PENPOT_NUKE_ALL_PAGES`) skips Y/Z. Plugins do not document **page delete**; reset uses **rename off canonical names** plus **file version** for review. Requires `PENPOT_MCP_USER_TOKEN` and `npm install` under `.cursor/penpot-phase-a-chunks/`.

### Phase A — Foundations

**Runnable script (copy the execute block into MCP `execute_code`):** [`penpot-mcp-scripts/phase-a-foundations.js`](penpot-mcp-scripts/phase-a-foundations.js) — creates page `00 Foundations`, token set **`tcms-core`** (colors, spacing, radii), library colors/typographies prefixed `TCMS /`, and local components **`CMP / *`** (AppShell with subnav labels matching `projectWorkspaceNav.ts`, plus buttons, table shell, etc.). Results are summarized in **`storage.tcms.phaseA`**. Re-run is safe: existing tokens/components are skipped by name.

Manual checklist (what the script implements):

1. `penpot.library.local.tokens.addSet({ name: "tcms-core" })`; activate set.
2. Color, spacing, and border-radius tokens aligned to Tamagui-friendly names (`color.*`, `space.*`, `radius.*`).
3. `penpot.library.local.createColor()` / `createTypography()` for shared semantic styles.
4. `createComponent` from source boards for: `AppShell`, `PageHeader`, `DataTable`, `PrimaryButton`, `SecondaryButton`, `TextField`, `EmptyState`, `ErrorBanner`, `FixHintCallout`.
5. `return` payload + `storage.tcms.phaseA` for follow-up MCP calls.

### Phase B — Screen scaffolds

**Runnable script:** [`penpot-mcp-scripts/phase-b-screen-scaffolds.js`](penpot-mcp-scripts/phase-b-screen-scaffolds.js) — page **`02 Screens / MVP`**: boards **`SCR / …`** (AppShell + PageHeader + optional subtitle + **wire pointer** in **Main** only). For **each** spec, a matching **`03 Wire / …`** page holds a **`Wireframe / …`** board (content-mode-specific low-fi: empty, plain, table, fix, fix-error, run-form, tree-table). Chunk payloads: `npm run penpot:gen-phase-b`, then MCP `execute_code` on `.cursor/penpot-phase-b-chunks/exec-*.json` in order (`storage.__tcmsPhB`). Re-run skips existing `SCR /` board names; **`wirePages`** in `storage.tcms.phaseB` lists refreshed wire artifacts.

Manual steps (what the script encodes):

1. `penpot.createBoard()` per screen, `resize(1280, 900)`, outer column flex + padding.
2. `penpotUtils.addFlexLayout` where needed; inner **Main** gets column flex after removing the default placeholder rect.
3. `LibraryComponent.instance()` for **`CMP / AppShell`** and **`CMP / PageHeader`** only on MVP; detailed UI lives on **`03 Wire / …`** boards.
4. Re-run skips existing `SCR /` board names; **`refreshAllScreenWires`** rewrites every **`03 Wire / …`** board from script.

### Phase C — Flow map

**Runnable script:** [`penpot-mcp-scripts/phase-c-flow-map.js`](penpot-mcp-scripts/phase-c-flow-map.js) — page **`01 Flows / Journeys`**, board **`FLOW / INDEX`**: **`Text`** checklist (ASCII; F1–F9 routes; points at `02 Screens / MVP` and DEMO-QA seed copy). Chunks: `npm run penpot:gen-phase-c`, then MCP `execute_code` on `.cursor/penpot-phase-c-chunks/exec-*.json` in order (`storage.__tcmsPhC`). Idempotent if `FLOW / INDEX` already exists.

1. Optional extension: add thumbnails (small clones) or a **grid** layout inside `FLOW / INDEX`.
2. Optional: `export_shape` with `shapeId: "page"` after each page for PNG review.

### Phase D — Verification

1. `penpotUtils.shapeStructure(penpot.root, 4)` across pages (switch page in UI between calls, or use `penpotUtils.getPageByName` + set active page if API allows—confirm via `penpot_api_info` for `Penpot` / `Page`).
2. `export_shape` for representative boards.

---

## 6. Flow → implementation checklist (code)

After Penpot sign-off:

1. **Tokens:** map Penpot `resolvedValue` to `apps/web/src/tamagui.config.ts` themes; keep semantic names aligned.
2. **Shell / subnav:** `AppShell`, `ProjectSubNav`, `projectWorkspaceNav.ts` — order must match design: `Project`, `Requirements`, `Test cases`, `Plans`, `Runs`, `Reporting`, `Imports`, `Design links`.
3. **Per route:** implement or tune one page component under `apps/web/src/pages/` per `SCR` board; reuse Tamagui primitives mirroring Penpot components.
4. **E2E:** extend or add specs alongside existing `fe-*` specs for any new interaction (plans: `fe-j-plans.spec.ts`).

---

## 7. Demo data for reviews

`npm run seed:demo` creates **`DEMO-QA`** project with representative requirements, tests, run, and mixed results (`.wiki/flows/seed-demo-qa-project.md`). Use that project when exporting Penpot **populated** states for stakeholder walkthroughs.

---

## 8. Next actions (execution order)

1. **Web / product review:** walk `apps/web` with demo seed; capture what to lock for **tokens + key components** (no Penpot required).
2. **Penpot (optional):** create pages per §4.1 (`00 Foundations · …`); one board per component you care about; export or screenshot for async review.
3. **Screens:** add `02 Screens · MVP · …` pages per §4.2 when you are ready to pin route states; keep each page small enough to review in one sitting.
4. **Flows:** add `01 Flows · Journeys` (§4.3) after shells and elements are agreed.
5. Freeze **component set**; Tamagui parity pass in code.

MCP **Phase A–C** scripts remain a **bootstrap** for the older flat page layout; they do not yet generate the §4.1–4.3 folder-style page names—either adjust the scripts or create those pages manually.

---

## 9. Penpot MCP troubleshooting

Official reference: [Penpot MCP server](https://help.penpot.app/mcp/) (includes **Troubleshooting** and client-specific snippets).

### When tools return `No plugin instance connected for user token`

That message means the **remote MCP server** accepted the HTTP call, but **no Penpot plugin** has registered a session for the **same** `userToken` your client sends. Typical causes:

1. **Token mismatch** — The value in `userToken=…` must be exactly your **MCP key** from **Your account → Integrations → MCP Server** (the URL Penpot shows already embeds it). After **Regenerate MCP key**, Penpot revokes the old key immediately: update **both** Cursor (or your env var) **and** the plugin connection. The plugin’s token and the client URL must stay in lockstep.
2. **Plugin not actually bound** — In Penpot: **File → MCP Server → Connect** for the open file. Keep the **plugin window open** while using MCP (Penpot’s checklist). Only **one browser tab** may own MCP at a time; pick the active MCP tab explicitly if you use multiple tabs.
3. **Cursor not sending the token you think** — `.cursor/mcp.json` uses Penpot’s **`type: "http"`** URL with **`${env:PENPOT_MCP_USER_TOKEN}`**. Cursor does **not** read `.env.local` for that interpolation. After you change the token in `.env.local`, run **`npm run penpot:sync-mcp-token`** (or `scripts/sync-penpot-mcp-token-from-envlocal.ps1`), which copies the value into your **Windows User** env var `PENPOT_MCP_USER_TOKEN`, then **fully restart Cursor** so MCP sees it.
4. **Why not rely on `.env.local` alone?** — Cursor’s docs: **`envFile` is only for stdio MCP servers**, not for remote `url` entries. Syncing into a real user env var is the supported way to keep secrets in `.env.local` while satisfying `${env:…}` in the Penpot stream URL.

### Penpot’s general checklist (remote)

From the same help page: restart the **plugin** connection in Penpot; **restart Cursor** (or reconnect the MCP server in the client); keep the plugin UI open while agents run tools.

### First prompts (sanity)

After connection works, use read-only prompts first (list pages, components, tokens) before write operations such as Phase A `execute_code`.
