# Penpot design system and wireframes — flows and MCP scaffold plan

Branch: `docs/penpot-flows-mcp-plan` (created from `main` after pull).  
Audience: designers and implementers automating a first Penpot draft via the **Penpot MCP** (`execute_code`, `penpot_api_info`, `export_shape`), then refining in Penpot and shipping in **`apps/web`** (React + Tamagui + urql).

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

**Pages (Penpot `Page` objects):**

| Page name | Contents |
|-----------|----------|
| `00 Foundations` | Token sets, color styles, typography styles, core components only |
| `01 Flows / Journeys` | User-flow boards (swimlanes or numbered steps), one board per flow phase |
| `02 Screens / MVP` | Route-aligned frames, instances of shell + components |

**Naming convention for boards:** `SCR / {RouteSegment} — {State}` examples: `SCR / requirements — list-empty`, `SCR / runs — create-with-plan`.

**Flows page layout:** use a **vertical flex** column of boards: `FLOW / F1-entry`, `FLOW / F2-requirements`, … each board contains step callouts `1.`, `2.` mapped to the tables above.

---

## 5. MCP automation — phased `execute_code` scripts

Run scripts only with the Penpot file connected. Use `storage` to persist IDs (token set, component roots, page names). Do not `console.log` return payloads.

### Phase A — Foundations

**Runnable script (copy the execute block into MCP `execute_code`):** [`penpot-mcp-scripts/phase-a-foundations.js`](penpot-mcp-scripts/phase-a-foundations.js) — creates page `00 Foundations`, token set **`tcms-core`** (colors, spacing, radii), library colors/typographies prefixed `TCMS /`, and local components **`CMP / *`** (AppShell with subnav labels matching `projectWorkspaceNav.ts`, plus buttons, table shell, etc.). Results are summarized in **`storage.tcms.phaseA`**. Re-run is safe: existing tokens/components are skipped by name.

Manual checklist (what the script implements):

1. `penpot.library.local.tokens.addSet({ name: "tcms-core" })`; activate set.
2. Color, spacing, and border-radius tokens aligned to Tamagui-friendly names (`color.*`, `space.*`, `radius.*`).
3. `penpot.library.local.createColor()` / `createTypography()` for shared semantic styles.
4. `createComponent` from source boards for: `AppShell`, `PageHeader`, `DataTable`, `PrimaryButton`, `SecondaryButton`, `TextField`, `EmptyState`, `ErrorBanner`, `FixHintCallout`.
5. `return` payload + `storage.tcms.phaseA` for follow-up MCP calls.

### Phase B — Screen scaffolds

For each `SCR / …` board:

1. `penpot.createBoard()` (or API equivalent via shapes), set `name`, `resize(1440, 900)` (or 1280) for desktop MVP.
2. `penpotUtils.addFlexLayout(board, "column")`; set padding/gaps from tokens via `board.flex` and `shape.applyToken` where applicable.
3. Append `AppShell` instance; inside main slot, append `PageHeader` + placeholder `Rectangle` blocks for tables (tokenized fill).
4. Duplicate for **empty** vs **populated** by cloning boards and swapping text.

### Phase C — Flow map

1. On page `01 Flows / Journeys`, create parent board `FLOW / INDEX` with a **grid** or **flex** of thumbnails: small clones or `Text` checklist linking to full frames (Penpot does not require hyperlinks—use naming + order).
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

1. Connect MCP; run **Phase A**; export foundations page.
2. Run **Phase B** for F1–F3 and F5 (highest traffic); designer pass.
3. Add F4 (plans), F6–F9 frames; align with wiki flows for import/KPI/run snapshot copy.
4. Freeze **component set**; then Tamagui parity pass in code.
