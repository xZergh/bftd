/**
 * Penpot MCP — Phase W1 (hoist **legacy** tree-table wire into **`03 Wire / …`**)
 *
 * If **`Wireframe / tree + table v1`** or **`Wireframe / requirements - tree-table-v1`** still lives **inside** **`SCR / requirements - tree-table-v1`**
 * on **`02 Screens / MVP`** (older Phase B), this **moves** it to **`03 Wire / requirements - tree-table-v1`**
 * at **x/y 40, 40** and ensures that wire page exists. Current Phase B already creates the wire on
 * **`03 Wire / …`**, so a re-run typically returns **`skipped: true`**.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

const WIRE_LEGACY = "Wireframe / tree + table v1";
const WIRE_NEW = "Wireframe / requirements - tree-table-v1";
const SCR_TREE = "SCR / requirements - tree-table-v1";
const SRC_SCREENS = "02 Screens / MVP";
const DST_WIRE_PAGE = "03 Wire / requirements - tree-table-v1";

function findShapeByName(shape, targetName) {
  if (!shape) return null;
  if (shape.name === targetName) return shape;
  const kids = shape.children && shape.children.length ? shape.children : [];
  for (let i = 0; i < kids.length; i++) {
    const hit = findShapeByName(kids[i], targetName);
    if (hit) return hit;
  }
  return null;
}

function findDirectChildByName(root, targetName) {
  const kids = root && root.children ? root.children : [];
  for (let i = 0; i < kids.length; i++) {
    const k = kids[i];
    if (k && k.name === targetName) return k;
  }
  return null;
}

function ensureWirePage() {
  let p = penpotUtils.getPageByName(DST_WIRE_PAGE);
  if (!p) {
    p = penpot.createPage();
    p.name = DST_WIRE_PAGE;
  }
  return p;
}

const srcPage = penpotUtils.getPageByName(SRC_SCREENS);
if (!srcPage || !srcPage.root) {
  return { error: "missing_src_page", page: SRC_SCREENS };
}

penpot.openPage(srcPage);
const scrTop = findDirectChildByName(srcPage.root, SCR_TREE);
let wire = null;
if (scrTop) {
  wire = findShapeByName(scrTop, WIRE_LEGACY) || findShapeByName(scrTop, WIRE_NEW);
}

const dstPage = ensureWirePage();
penpot.openPage(dstPage);
const alreadyRoot =
  dstPage.root &&
  dstPage.root.children &&
  dstPage.root.children.some(
    (c) => c && (c.name === WIRE_LEGACY || c.name === WIRE_NEW)
  );
if (alreadyRoot) {
  penpot.openPage(dstPage);
  return {
    ok: true,
    skipped: true,
    reason: "wireframe_already_on_wire_page",
    wirePage: DST_WIRE_PAGE
  };
}

if (!wire) {
  return {
    ok: true,
    skipped: true,
    reason: "no_embedded_wire_in_scr",
    detail: "Nothing to hoist from " + SRC_SCREENS + " (current Phase B keeps wire on " + DST_WIRE_PAGE + ")."
  };
}

const before = { x: wire.x, y: wire.y, parent: wire.parent && wire.parent.name };

try {
  dstPage.root.appendChild(wire);
} catch (e) {
  return {
    error: "appendChild_failed",
    message: e && e.message ? e.message : String(e)
  };
}

try {
  wire.x = 40;
  wire.y = 40;
} catch (e2) {
  /* position API may differ */
}

penpot.openPage(dstPage);

return {
  ok: true,
  moved: wire.name,
  from: SRC_SCREENS + " (inside " + SCR_TREE + ")",
  to: DST_WIRE_PAGE,
  boardId: wire.id,
  before
};
