/**
 * Penpot MCP — Phase X (wipe all canvas content + trim pages)
 *
 * ## Purpose
 * **Hard reset** the open file for a clean MCP pass:
 * - Removes **every top-level shape** from **every page** (all boards, frames, SCR, backups content).
 * - Tries to **delete extra pages** via runtime API (`removePage` / `deletePage` on `File` or `penpot`) when
 *   available (Penpot versions differ). Pages that cannot be removed are renamed to
 *   **`DELETE IN PENPOT UI / …`** so you can remove them manually in the sidebar.
 * - Leaves **one** page named **`00 Foundations`** (empty) as the starting surface.
 *
 * Does **not** remove **library** colors / typographies / components (Phase A skips duplicates).
 *
 * ## Run
 * `npm run penpot:run-mcp-phases:fresh` — runs Phase X, then Phases A, B, C.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

function wipePageRoot(page) {
  const r = page.root;
  if (!r || !r.children || !r.children.length) return 0;
  let n = 0;
  const kids = [...r.children];
  for (let i = 0; i < kids.length; i++) {
    try {
      kids[i].remove();
      n++;
    } catch (e) {
      /* continue */
    }
  }
  return n;
}

function tryDeletePage(file, page) {
  const candidates = [
    [file, "removePage"],
    [file, "deletePage"],
    [penpot, "removePage"],
    [penpot, "deletePage"]
  ];
  for (let i = 0; i < candidates.length; i++) {
    const obj = candidates[i][0];
    const key = candidates[i][1];
    if (obj && typeof obj[key] === "function") {
      try {
        obj[key](page);
        return key;
      } catch (e) {
        /* try next */
      }
    }
  }
  return null;
}

const file = penpot.currentFile;
if (!file || !file.pages) {
  return { error: "No current Penpot file or pages list" };
}

const perPage = [];
let removedShapes = 0;
const initialPages = [...file.pages];
for (let i = 0; i < initialPages.length; i++) {
  const p = initialPages[i];
  const n = wipePageRoot(p);
  removedShapes += n;
  perPage.push({ page: p.name, removedShapes: n });
}

let keep =
  file.pages.find((p) => p.name === "00 Foundations") ||
  file.pages.find((p) => !/^BACKUP/i.test(p.name)) ||
  file.pages[0];

if (!keep) {
  keep = penpot.createPage();
  keep.name = "00 Foundations";
  penpot.openPage(keep);
} else {
  keep.name = "00 Foundations";
  penpot.openPage(keep);
  let safety = 0;
  while (file.pages.length > 1 && safety < 64) {
    safety += 1;
    const victim = file.pages.find((p) => p.id !== keep.id);
    if (!victim) break;
    if (!tryDeletePage(file, victim)) {
      break;
    }
  }
  if (file.pages.length > 1) {
    for (let j = 0; j < file.pages.length; j++) {
      const p = file.pages[j];
      if (p.id !== keep.id) {
        p.name = "DELETE IN PENPOT UI / " + p.name;
      }
    }
  }
}

storage.tcms = {};

const remainingPageCount = file.pages.length;
return {
  removedShapes,
  perPage,
  remainingPageCount,
  keepPage: keep.name,
  note:
    remainingPageCount > 1
      ? "Some pages could not be deleted via plugin API; remove names starting with DELETE IN PENPOT UI in the sidebar, then re-run fresh."
      : "Canvas wiped. Run Phases A, B, C.",
  storageCleared: true
};
