/**
 * Penpot MCP — Phase W0 (focus tree-table wireframe on its **dedicated wire page**)
 *
 * Targets **`03 Wire / requirements - tree-table-v1`**: hides every **other** top-level node
 * on that page so **`Wireframe / requirements - tree-table-v1`** (or legacy **`Wireframe / tree + table v1`**)
 * is easy to find, then use **Shift+1** / **Shift+2** on the canvas.
 *
 * (Legacy `00 Foundations` clutter is no longer where this wireframe is authored; Phase B
 * puts it on **`03 Wire / …`**.)
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

const PAGE_NAME = "03 Wire / requirements - tree-table-v1";
const WIRE_PRIMARY = "Wireframe / requirements - tree-table-v1";
const WIRE_LEGACY = "Wireframe / tree + table v1";

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

function topLevelAncestor(pageRoot, shape) {
  let s = shape;
  while (s && s.parent && s.parent.id !== pageRoot.id) {
    s = s.parent;
  }
  return s;
}

function setHidden(shape, v) {
  try {
    if ("hidden" in shape) {
      shape.hidden = v;
      return "hidden";
    }
    if ("visible" in shape) {
      shape.visible = !v;
      return "visible";
    }
  } catch (e) {
    return String(e);
  }
  return "noop";
}

const page = penpotUtils.getPageByName(PAGE_NAME);
if (!page || !page.root) {
  return {
    error: "missing_page",
    page: PAGE_NAME,
    hint: "Run Phase B (`phase-b-screen-scaffolds.js`) so the wire page is created."
  };
}

penpot.openPage(page);

const wire =
  findShapeByName(page.root, WIRE_PRIMARY) || findShapeByName(page.root, WIRE_LEGACY);
if (!wire) {
  return { error: "wireframe_not_found", page: PAGE_NAME };
}

const topAnc = topLevelAncestor(page.root, wire);
const hidden = [];
const kids = page.root.children ? [...page.root.children] : [];
for (let i = 0; i < kids.length; i++) {
  const k = kids[i];
  if (!k || k.id === topAnc.id) continue;
  const how = setHidden(k, true);
  hidden.push({ name: k.name || "(unnamed)", how });
}

const focusBoardId =
  wire && topAnc && wire.id !== topAnc.id ? wire.id : topAnc && topAnc.id;

return {
  ok: true,
  wireName: wire.name,
  keptTopLevelName: topAnc.name,
  focusBoardId,
  wireId: wire.id,
  hiddenTopLevelCount: hidden.length,
  hidden
};
