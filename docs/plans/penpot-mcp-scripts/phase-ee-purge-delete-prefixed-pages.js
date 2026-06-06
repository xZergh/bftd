/**
 * Penpot MCP — Phase EE (purge stale TCMS scaffold page renames)
 *
 * Removes **`DELETE IN PENPOT UI / …`** for **Flows**, **Screens / MVP**, and each canonical
 * **`03 Wire / …`** wire page (left when the plugin API could not delete pages). Does **not** touch
 * other `DELETE IN PENPOT UI / …` pages.
 *
 * ## Run
 * `npm run penpot:purge-stale-scaffold-pages` — single `execute_code` over HTTP MCP.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

const PREFIX = "DELETE IN PENPOT UI / ";
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

const STALE_NAMES = [PREFIX + "01 Flows / Journeys", PREFIX + "02 Screens / MVP"].concat(
  WIREFRAME_PAGES.map(function (n) {
    return PREFIX + n;
  })
);

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

const tried = [];
for (let i = 0; i < STALE_NAMES.length; i++) {
  const nm = STALE_NAMES[i];
  const live = file.pages.find((p) => p.name === nm);
  if (!live) {
    tried.push({ name: nm, status: "absent" });
    continue;
  }
  const how = tryDeletePage(file, live);
  tried.push({ name: nm, status: how ? "deleted" : "delete_failed", via: how || undefined });
}

return {
  tried,
  remainingPageNames: file.pages.map((p) => p.name)
};
