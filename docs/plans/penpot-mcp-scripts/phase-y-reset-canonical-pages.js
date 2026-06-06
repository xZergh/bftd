/**
 * Penpot MCP — Phase Y (reset canonical pages + named file version)
 *
 * ## Purpose
 * Penpot plugins do not expose a documented **delete page** API. This script **renames**
 * the canonical workspace pages so their **names are free** for Phase A/B/C (same effect
 * as removing them from the working tree). Old canvases remain in the file under
 * **`BACKUP PRE-RESET YYYY-MM-DD / …`**.
 *
 * **File version snapshot:** the HTTP runner (`run-phases-http.mjs`) calls `saveVersion` in a
 * follow-up `execute_code` so named history works without top-level `await` in this file.
 *
 * ## Run
 * `npm run penpot:run-mcp-phases:reset` (runs this, snapshot, then Phases A–C over HTTP MCP).
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
const prefix = "BACKUP PRE-RESET " + stamp + " / ";
const backed = [];

for (let i = 0; i < CANONICAL.length; i++) {
  const original = CANONICAL[i];
  const page = file.pages.find((p) => p.name === original);
  if (!page) continue;
  let backupName = prefix + original;
  let n = 0;
  while (file.pages.some((p) => p.name === backupName)) {
    n += 1;
    backupName = "BACKUP PRE-RESET " + stamp + " (" + n + ") / " + original;
  }
  page.name = backupName;
  backed.push({ from: original, to: backupName });
}

if (file.pages.length) {
  penpot.openPage(file.pages[0]);
}

storage.tcms = storage.tcms || {};
storage.tcms.pageReset = {
  stamp,
  backed
};

return {
  renamedPages: backed.length,
  backed,
  storageKey: "storage.tcms.pageReset",
  next: "Next: named file.saveVersion snapshot, then Phases A, B, C (see HTTP runner)."
};
