/**
 * Penpot MCP — Phase Z (backup canonical pages, in-place rename)
 *
 * ## Purpose
 * Frees the **exact page names** Phase A/B/C expect (`00 Foundations`, `01 Flows / Journeys`,
 * `02 Screens / MVP`, and each **`03 Wire / …`** wire page) by **renaming** existing pages to a
 * dated backup prefix. Nothing is deleted:
 * one full snapshot of those canvases stays in the same file under new names.
 *
 * ## When to use
 * - Stale `SCR /` frames, wrong encoding on old boards, or `FLOW / INDEX` skipped because it
 *   already exists. Run this once, then run Phase A, B, C again.
 *
 * ## How to run
 * `npm run penpot:run-mcp-phases:backup` (runs this via HTTP MCP, then Phases A–C), or paste the
 * body below into `execute_code` only.
 *
 * ## Optional extra names
 * Includes typo page **`02 Screens / MVT`** if present so you can recreate a single **`MVP`** page.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

const WIREFRAME_PAGES = [
  "03 Wire / home - no-project",
  "03 Wire / home - pick-project-hint",
  "03 Wire / projects - list",
  "03 Wire / project - hub",
  "03 Wire / requirements - list-empty",
  "03 Wire / requirements - list-populated",
  "03 Wire / requirements - delete-blocked",
  "03 Wire / requirements - tree-table-v1",
  "03 Wire / test-cases - list",
  "03 Wire / test-cases - detail-tombstone",
  "03 Wire / runs - list-empty",
  "03 Wire / runs - list",
  "03 Wire / runs - create-with-plan",
  "03 Wire / runs - detail-result-form"
];

const CANONICAL = [
  "00 Foundations",
  "01 Flows / Journeys",
  "02 Screens / MVP",
  "02 Screens / MVT"
].concat(WIREFRAME_PAGES);

function isoDate() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

const file = penpot.currentFile;
if (!file || !file.pages) {
  return { error: "No current Penpot file or pages list" };
}

const stamp = isoDate();
const backed = [];

for (let i = 0; i < CANONICAL.length; i++) {
  const original = CANONICAL[i];
  const page = file.pages.find((p) => p.name === original);
  if (!page) continue;
  let backupName = "BACKUP " + stamp + " / " + original;
  let n = 0;
  while (file.pages.some((p) => p.name === backupName)) {
    n += 1;
    backupName = "BACKUP " + stamp + " (" + n + ") / " + original;
  }
  page.name = backupName;
  backed.push({ from: original, to: backupName });
}

if (file.pages.length) {
  penpot.openPage(file.pages[0]);
}

storage.tcms = storage.tcms || {};
storage.tcms.pageBackup = {
  stamp,
  backed,
  note: "Canonical names are free. Run Phase A, then B, then C."
};

return {
  backedUp: backed.length,
  backed,
  storageKey: "storage.tcms.pageBackup",
  next: "Run penpot:run-mcp-phases (or Phase A/B/C chunks) to recreate 00, 01, 02 pages."
};
