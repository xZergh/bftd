---
title: "Penpot MCP — chunked execute_code"
type: "flow"
status: "active"
source_paths:
  - "docs/plans/penpot-flows-and-mcp-scaffold.md"
  - "docs/plans/penpot-mcp-scripts/phase-a-foundations.js"
  - "docs/plans/penpot-mcp-scripts/phase-b-screen-scaffolds.js"
  - "docs/plans/penpot-mcp-scripts/phase-c-flow-map.js"
  - "docs/plans/penpot-mcp-scripts/phase-z-backup-canonical-pages.js"
  - "docs/plans/penpot-mcp-scripts/phase-y-reset-canonical-pages.js"
  - "docs/plans/penpot-mcp-scripts/phase-x-wipe-all-canvas.js"
  - "package.json"
updated_at: "2026-05-09"
---

# Penpot MCP — chunked `execute_code`

Large Penpot automation scripts live under `docs/plans/penpot-mcp-scripts/` with a **paste marker** line (`// --- paste everything below this line into execute_code ---`). Everything after that marker is the exact body Penpot runs as a function (may use `return`).

## Why chunk

Some clients limit `execute_code` JSON size. The repo splits the marker body into **base64 slices**, pushed across several MCP calls into **`storage`**, then one **final** call decodes and runs the merged string.

## Generators and outputs

| Phase | Generator (Node) | Output directory | Staging key on `storage` |
|-------|------------------|------------------|---------------------------|
| A | `.cursor/gen-phase-a-chunks.mjs` | `.cursor/penpot-phase-a-chunks/` | `__tcmsPhA` |
| B | `npm run penpot:gen-phase-b` → `.cursor/gen-phase-b-chunks.mjs` | `.cursor/penpot-phase-b-chunks/` | `__tcmsPhB` |
| C | `npm run penpot:gen-phase-c` → `.cursor/gen-phase-c-chunks.mjs` | `.cursor/penpot-phase-c-chunks/` | `__tcmsPhC` |

### Run all phases over HTTP MCP (Cursor token)

From repo root (requires `PENPOT_MCP_USER_TOKEN`; install deps once: `npm install` inside `.cursor/penpot-phase-a-chunks/`):

- **`npm run penpot:run-mcp-phases`** — runs Phase **A**, **B**, **C** `execute_code` chains in order via Penpot’s streamable HTTP MCP.
- **`npm run penpot:run-mcp-phases:fresh`** — **Phase X** (wipe all top-level shapes on every page, best-effort page delete, clear `storage.tcms`), then **A**, **B**, **C**. Skips Phase Y/Z.
- **`npm run penpot:run-mcp-phases:backup`** — runs **Phase Z** first (gentler rename), then **A**, **B**, **C**.
- **`npm run penpot:run-mcp-phases:reset`** — **Phase Y** (rename messed pages to `BACKUP PRE-RESET …`), **`saveVersion`** snapshot, then **A**, **B**, **C** (use when canvases are corrupted).

### Phase X — wipe all canvas (start over in one file)

Script: `docs/plans/penpot-mcp-scripts/phase-x-wipe-all-canvas.js`. Removes every top-level node on each page, tries runtime page-delete APIs, renames undeletable extras to **`DELETE IN PENPOT UI / …`**, keeps one page **`00 Foundations`**, clears **`storage.tcms`**. Does not strip library tokens/components.

### Phase Y — reset working pages + named file version

Script: `docs/plans/penpot-mcp-scripts/phase-y-reset-canonical-pages.js`. Renames canonical pages to **`BACKUP PRE-RESET YYYY-MM-DD / …`** (plugins do not expose page delete). Runner then calls **`execute_code`** once more with an async IIFE that runs **`currentFile.saveVersion("TCMS MCP reset YYYY-MM-DD")`** for Penpot **file history**. Then Phases A–C recreate **`00`**, **`01`**, **`02 MVP`**.

### Phase Z — rename canonical pages to backup (same file, no delete)

Script: `docs/plans/penpot-mcp-scripts/phase-z-backup-canonical-pages.js`. Renames **`00 Foundations`**, **`01 Flows / Journeys`**, **`02 Screens / MVP`**, and **`02 Screens / MVT`** (if present) to **`BACKUP YYYY-MM-DD / …`** so Phase A/B/C can recreate clean pages. **Previous canvases stay** under the new names (one in-file backup generation).

Each directory holds `exec-0.json`, `exec-1.json`, … (each `{ "code": "..." }` per base64 chunk). Small scripts may ship only **`exec-0.json`** then **`exec-final.json`**. The final file joins the staging array, clears it, and runs:

`new Function('penpot', 'penpotUtils', 'storage', code)(penpot, penpotUtils, storage)`

That form keeps **top-level `return`** valid and injects plugin globals (bare `new Function(code)()` does not; `eval(code)` breaks on `return`).

Chunk loaders: first exec file **resets** the staging array (`[]`); later files append `atob("...")` segments.

## Run order

1. Penpot file open; MCP plugin connected (same token as the client).
2. Run **`execute_code`** in order: `exec-0.json` through the highest numbered `exec-N.json`, then **`exec-final.json`**.
3. See `docs/plans/penpot-flows-and-mcp-scaffold.md` for Phase A/B/C intent and manual checklists.

Phase B boards use **ASCII** names (`SCR / ... - ...`). Each **`SCR / …`** on **`02 Screens / MVP`** is **shell-only** (AppShell + PageHeader + subtitle + pointer in **Main**). Matching **`03 Wire / …`** pages hold **`Wireframe / …`** boards (structure + behavior for React; content mode `empty` | `plain` | `table` | `fix` | `fix-error` | `run-form` | `tree-table`). Scripts append to **`page.root`** after `openPage(page)` — not `penpot.root` — so shapes do not land on the wrong page if the active root updates asynchronously.

## Verify chunks locally (no committed helper script)

To confirm generated payloads match the source body after the paste marker:

1. Read the script file; take the substring **after** the paste marker line (same split as the generators use).
2. For each `exec-k.json` in the phase output folder, `JSON.parse` the file, take `code`, and extract the string inside `atob("...")` (regex `atob\\("([^"]+)"\\)` per chunk line).
3. Decode each segment from base64 and concatenate; the result must **equal** the body from step 1 (byte-for-byte with the generator’s line endings).

Phase order in the product plan: **A** (foundations) → **B** (`02 Screens / MVP`) → **C** (`01 Flows / Journeys` index board). Phase B expects **`CMP / AppShell`** and **`CMP / PageHeader`** from Phase A in the **same** file.

## Related

- Canonical plan: `docs/plans/penpot-flows-and-mcp-scaffold.md`
- Token sync for Cursor HTTP MCP: `npm run penpot:sync-mcp-token` and `scripts/sync-penpot-mcp-token-from-envlocal.ps1`
