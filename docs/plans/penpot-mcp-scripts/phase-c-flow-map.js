/**
 * Penpot MCP — Phase C (flow map index)
 *
 * ## Preconditions
 * - Penpot file connected to MCP.
 *
 * ## How to run
 * Paste the JavaScript **below** the marker into `execute_code`, or use chunked
 * payloads from `.cursor/penpot-phase-c-chunks/` (`npm run penpot:gen-phase-c`).
 *
 * ## What this does
 * - Page **`01 Flows / Journeys`** (created if missing).
 * - Board **`FLOW / INDEX`**: column of text lines acting as a checklist from F1–F9
 *   to the `SCR / …` frames on **`02 Screens / MVP`** (naming + order; no hyperlinks).
 *
 * Idempotent: if **`FLOW / INDEX`** already exists at the page root, returns `skipped: true`.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

function pickFont() {
  return (
    penpot.fonts.findByName("Inter") ||
    penpot.fonts.findByName("Work Sans") ||
    penpot.fonts.findByName("Source Sans Pro") ||
    penpot.fonts.all[0] ||
    null
  );
}

function applyFontToText(text, font, weight) {
  if (!font || !text) return;
  let variant = font.variants.find((v) => String(v.fontWeight) === String(weight));
  if (!variant) variant = font.variants[0];
  if (variant) font.applyToText(text, variant);
}

function mkText(parent, content, opts) {
  const t = penpot.createText(content);
  if (!t) return null;
  t.name = opts.name || "Text";
  t.fontSize = String(opts.size || 13);
  t.growType = opts.growType || "auto-height";
  t.fills = [{ fillColor: opts.color || "#111111", fillOpacity: 1 }];
  applyFontToText(t, opts.font, opts.weight || "400");
  parent.appendChild(t);
  return t;
}

function ensureFlowsPage() {
  let page = penpotUtils.getPageByName("01 Flows / Journeys");
  if (!page) {
    page = penpot.createPage();
    page.name = "01 Flows / Journeys";
  }
  penpot.openPage(page);
  return page;
}

const INDEX = "FLOW / INDEX";
const page = ensureFlowsPage();
const root = page.root;
const font = pickFont();

const existing = root.children && root.children.some((c) => c.name === INDEX);
if (existing) {
  storage.tcms = storage.tcms || {};
  storage.tcms.phaseC = { page: page.name, board: INDEX, skipped: true };
  return {
    page: page.name,
    board: INDEX,
    skipped: true,
    storageKey: "storage.tcms.phaseC"
  };
}

const board = penpot.createBoard();
board.name = INDEX;
board.resize(920, 1280);
board.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
penpotUtils.addFlexLayout(board, "column");
const flex = board.flex;
flex.rowGap = 10;
flex.columnGap = 0;
flex.alignItems = "stretch";
flex.justifyContent = "start";
flex.horizontalPadding = 24;
flex.verticalPadding = 24;

const lines = [
  "TCMS journey index: open 02 Screens / MVP for SCR / … shells (pointers in Main). Open matching 03 Wire / … page per route for structure+behavior wires (Phase B).",
  "",
  "F1 Workspace: / (home), /projects, /projects/:id",
  "F2 Requirements: /requirements, tree+table v1 wire on 03 Wire page (5 folder levels), inline edit, DEMO-R1 R2 R3",
  "F3 Test cases: /test-cases, /test-cases/:id (tombstone / restore)",
  "F4 Plans: /plans",
  "F5 Runs: /runs, /runs/:id (snapshot traceability)",
  "F6 Reporting: /reporting (KPI refresh)",
  "F7 Imports: /imports (pipelines)",
  "F8 Design links: /design-links",
  "F9 Version history: testcase detail history"
];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line === "") continue;
  mkText(board, line, {
    name: "Line " + (i + 1),
    size: 13,
    color: line.startsWith("F") ? "#111111" : "#5C5C66",
    font,
    weight: line.startsWith("F") ? "600" : "400"
  });
}

board.x = 48;
board.y = 48;
root.appendChild(board);

storage.tcms = storage.tcms || {};
storage.tcms.phaseC = {
  page: page.name,
  board: INDEX,
  lines: lines.filter((l) => l.length > 0).length
};

return {
  page: page.name,
  board: INDEX,
  skipped: false,
  storageKey: "storage.tcms.phaseC"
};
