/**
 * Penpot MCP — Phase DD (delete Flow + Screens pages)
 *
 * Removes **`01 Flows / Journeys`**, **`02 Screens / MVP`**, and every **`03 Wire / …`** page
 * (one per SCR wire from Phase B) so Phase B/C can recreate them.
 * Uses the same runtime delete attempts as Phase X. If delete fails, renames the page to
 * **`DELETE IN PENPOT UI / …`** for manual removal.
 *
 * ## Run
 * `npm run penpot:run-mcp-phases:recreate-pages` — runs Phase DD, then Phases A, B, C.
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

const TARGET_NAMES = ["01 Flows / Journeys", "02 Screens / MVP"].concat(WIREFRAME_PAGES);

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

const results = [];
for (let t = 0; t < TARGET_NAMES.length; t++) {
  const want = TARGET_NAMES[t];
  const page = file.pages.find((p) => p.name === want);
  if (!page) {
    results.push({ name: want, status: "absent" });
    continue;
  }
  const how = tryDeletePage(file, page);
  if (how) {
    results.push({ name: want, status: "deleted", via: how });
  } else {
    page.name = "DELETE IN PENPOT UI / " + page.name;
    results.push({ name: want, status: "rename_only", newName: page.name });
  }
}

return {
  results,
  remainingPageNames: file.pages.map((p) => p.name)
};
