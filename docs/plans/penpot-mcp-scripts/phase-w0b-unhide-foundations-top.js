/**
 * Penpot MCP — Phase W0b (unhide all top-level on `00 Foundations`)
 *
 * Reverses **Phase W0** if the canvas was over-hidden. Safe to run anytime.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

const PAGE_NAME = "00 Foundations";

const page = penpotUtils.getPageByName(PAGE_NAME);
if (!page || !page.root) {
  return { error: "missing_page", page: PAGE_NAME };
}

penpot.openPage(page);
const kids = page.root.children ? [...page.root.children] : [];
const out = [];
for (let i = 0; i < kids.length; i++) {
  const k = kids[i];
  if (!k) continue;
  try {
    if ("hidden" in k) k.hidden = false;
    else if ("visible" in k) k.visible = true;
    out.push(k.name || "(unnamed)");
  } catch (e) {
    out.push(String(e));
  }
}

return { ok: true, unhiddenTopLevel: out.length, names: out };
