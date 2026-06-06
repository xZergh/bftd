/**
 * Penpot MCP — Phase A (foundations)
 *
 * ## How to run (Cursor + Penpot MCP)
 *
 * 1. **Penpot desktop or browser:** open the design **file** you want to modify.
 * 2. **Penpot MCP plugin:** connect that file to this repo’s Penpot MCP server (same
 *    connection you use for other MCP tools). The plugin must show as connected for
 *    `execute_code` to run in *this* file’s context.
 * 3. **Cursor:** invoke the MCP tool **`execute_code`** on server **`penpot`** /
 *    **`project-0-tcms-penpot`** (your enabled Penpot server id may differ).
 * 4. **Code field:** paste **only** the JavaScript between the marker line
 *    `// --- paste everything below this line into execute_code ---` and the final
 *    `return { ... };` (inclusive). Do not wrap it in `function () { }` — the plugin
 *    already runs it as a function body.
 * 5. **Run once** per file (or re-run; the script skips existing tokens/components by name).
 * 6. **Optional check:** switch to page `00 Foundations` in Penpot, then MCP **`export_shape`**
 *    with `shapeId: "page"` to get a PNG/SVG of the whole page.
 *
 * Preconditions: Penpot file connected to MCP. Prefer a clean page for first run; the
 * script creates/opens `00 Foundations`.
 *
 * Idempotent: skips tokens/components that already exist by name.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

const lib = penpot.library.local;
const tokensCatalog = lib.tokens;

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

function ensureFoundationsPage() {
  let page = penpotUtils.getPageByName("00 Foundations");
  if (!page) {
    page = penpot.createPage();
    page.name = "00 Foundations";
  }
  penpot.openPage(page);
  return page;
}

function ensureTokenSet() {
  let set = tokensCatalog.sets.find((s) => s.name === "tcms-core");
  if (!set) {
    set = tokensCatalog.addSet({ name: "tcms-core" });
  }
  if (!set.active) {
    set.toggleActive();
  }
  return set;
}

function hasToken(set, name) {
  return set.tokens.some((t) => t.name === name);
}

/** Penpot path tokens may not match `t.name` exactly; still skip duplicates on re-run. */
function tryAddToken(set, spec) {
  if (hasToken(set, spec.name)) return;
  try {
    set.addToken(spec);
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (/already exists/i.test(msg)) return;
    throw e;
  }
}

function ensureTokens(set) {
  const colors = [
    ["color.bg", "#F7F7F8"],
    ["color.surface", "#FFFFFF"],
    ["color.text", "#111111"],
    ["color.muted", "#5C5C66"],
    ["color.border", "#D0D0D8"],
    ["color.primary", "#3355CC"],
    ["color.danger.fg", "#CC3344"],
    ["color.success", "#228855"],
    ["color.warning.bg", "#FFF4CC"],
    ["color.danger.bg", "#FCE8EA"]
  ];
  for (const [name, hex] of colors) {
    tryAddToken(set, { type: "color", name, value: hex });
  }
  const spacings = [
    ["space.1", "4"],
    ["space.2", "8"],
    ["space.3", "12"],
    ["space.4", "16"],
    ["space.5", "24"],
    ["space.6", "32"]
  ];
  for (const [name, px] of spacings) {
    tryAddToken(set, { type: "spacing", name, value: px });
  }
  const radii = [
    ["radius.sm", "4"],
    ["radius.md", "8"]
  ];
  for (const [name, px] of radii) {
    tryAddToken(set, { type: "borderRadius", name, value: px });
  }
}

function ensureLibraryColor(name, hex) {
  let c = lib.colors.find((x) => x.name === name);
  if (!c) {
    c = lib.createColor();
    c.name = name;
  }
  c.color = hex;
  c.opacity = 1;
  return c;
}

function ensureLibraryTypography(name, font, sizePx, weight) {
  let t = lib.typographies.find((x) => x.name === name);
  if (!t) {
    t = lib.createTypography();
    t.name = name;
  }
  if (font) {
    let variant = font.variants.find((v) => String(v.fontWeight) === String(weight));
    if (!variant) variant = font.variants[0];
    if (variant) {
      if (typeof t.setFont === "function") {
        t.setFont(font, variant);
      } else {
        t.fontId = font.fontId;
        t.fontVariantId = variant.fontVariantId;
        t.fontFamilies = font.fontFamily;
        t.fontWeight = String(variant.fontWeight);
        t.fontStyle = variant.fontStyle || "normal";
      }
    }
  }
  t.fontSize = String(sizePx);
  t.lineHeight = "1.4";
  t.letterSpacing = "0";
  return t;
}

function flexColumn(board, gap, pad) {
  const flex = board.flex || board.addFlexLayout();
  flex.dir = "column";
  flex.rowGap = gap;
  flex.columnGap = 0;
  flex.alignItems = "stretch";
  flex.justifyContent = "start";
  flex.verticalPadding = pad;
  flex.horizontalPadding = pad;
  flex.horizontalSizing = "auto";
  flex.verticalSizing = "auto";
}

function flexRow(board, gap, pad, justify) {
  const flex = board.flex || board.addFlexLayout();
  flex.dir = "row";
  flex.rowGap = 0;
  flex.columnGap = gap;
  flex.alignItems = "center";
  flex.justifyContent = justify || "start";
  flex.verticalPadding = pad;
  flex.horizontalPadding = pad;
  flex.horizontalSizing = "auto";
  flex.verticalSizing = "auto";
}

function fillChild(shape) {
  if (shape.layoutChild) {
    shape.layoutChild.verticalSizing = "fill";
    shape.layoutChild.horizontalSizing = "fill";
  }
}

function fixChild(shape) {
  if (shape.layoutChild) {
    shape.layoutChild.verticalSizing = "fix";
    shape.layoutChild.horizontalSizing = "fix";
  }
}

function mkText(parent, content, opts) {
  const t = penpot.createText(content);
  if (!t) return null;
  t.name = opts.name || "Text";
  t.fontSize = String(opts.size || 14);
  t.growType = opts.growType || "auto-width";
  t.fills = [{ fillColor: opts.color || "#111111", fillOpacity: 1 }];
  applyFontToText(t, opts.font, opts.weight || "400");
  parent.appendChild(t);
  return t;
}

function mkRect(parent, w, h, fill, stroke, name) {
  const r = penpot.createRectangle();
  r.name = name || "Rectangle";
  r.resize(w, h);
  if (fill) {
    r.fills = [{ fillColor: fill, fillOpacity: 1 }];
  } else {
    r.fills = [];
  }
  if (stroke) {
    r.strokes = [{ strokeColor: stroke, strokeOpacity: 1, strokeWidth: 1 }];
  } else {
    r.strokes = [];
  }
  parent.appendChild(r);
  return r;
}

function hasComponent(name) {
  return lib.components.some((c) => c.name === name);
}

function registerComponent(board, name) {
  if (hasComponent(name)) {
    board.remove();
    return null;
  }
  const comp = lib.createComponent([board]);
  comp.name = name;
  return comp;
}

function buildPrimaryButton(font) {
  const b = penpot.createBoard();
  b.name = "CMP / PrimaryButton (source)";
  b.resize(128, 40);
  b.fills = [{ fillColor: "#3355CC", fillOpacity: 1 }];
  b.borderRadius = 6;
  flexRow(b, 8, 0, "center");
  mkText(b, "Save", { name: "Label", size: 14, color: "#FFFFFF", font, weight: "600" });
  return b;
}

function buildSecondaryButton(font) {
  const b = penpot.createBoard();
  b.name = "CMP / SecondaryButton (source)";
  b.resize(128, 40);
  b.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  b.strokes = [{ strokeColor: "#3355CC", strokeOpacity: 1, strokeWidth: 1 }];
  b.borderRadius = 6;
  flexRow(b, 8, 0, "center");
  mkText(b, "Cancel", { name: "Label", size: 14, color: "#3355CC", font, weight: "500" });
  return b;
}

function buildTextField(font) {
  const b = penpot.createBoard();
  b.name = "CMP / TextField (source)";
  b.resize(320, 72);
  flexColumn(b, 6, 0);
  mkText(b, "Label", { name: "Caption", size: 12, color: "#5C5C66", font, weight: "500" });
  const input = mkRect(b, 312, 36, "#FFFFFF", "#D0D0D8", "Input");
  input.borderRadius = 6;
  return b;
}

function buildPageHeader(font) {
  const b = penpot.createBoard();
  b.name = "CMP / PageHeader (source)";
  b.resize(720, 88);
  flexColumn(b, 8, 0);
  mkText(b, "Page title", { name: "Title", size: 22, color: "#111111", font, weight: "600" });
  const row = penpot.createBoard();
  row.name = "Actions row";
  row.resize(700, 36);
  flexRow(row, 12, 0);
  mkText(row, "Optional subtitle or context.", {
    name: "Subtitle",
    size: 13,
    color: "#5C5C66",
    font,
    weight: "400",
    growType: "auto-height"
  });
  const spacer = penpot.createRectangle();
  spacer.name = "Spacer";
  spacer.resize(1, 1);
  spacer.fills = [];
  spacer.strokes = [];
  row.appendChild(spacer);
  if (spacer.layoutChild) {
    spacer.layoutChild.horizontalSizing = "fill";
    spacer.layoutChild.verticalSizing = "fix";
  }
  const action = mkRect(row, 120, 36, "#3355CC", null, "Primary slot");
  action.borderRadius = 6;
  b.appendChild(row);
  return b;
}

function buildEmptyState(font) {
  const b = penpot.createBoard();
  b.name = "CMP / EmptyState (source)";
  b.resize(480, 160);
  flexColumn(b, 8, 0);
  b.fills = [];
  mkText(b, "Nothing here yet", { name: "Headline", size: 18, color: "#111111", font, weight: "600" });
  mkText(b, "Create an item or adjust filters to see results.", {
    name: "Body",
    size: 14,
    color: "#5C5C66",
    font,
    weight: "400",
    growType: "auto-height"
  });
  return b;
}

function buildErrorBanner(font) {
  const b = penpot.createBoard();
  b.name = "CMP / ErrorBanner (source)";
  b.resize(720, 56);
  b.fills = [{ fillColor: "#FCE8EA", fillOpacity: 1 }];
  b.borderRadius = 6;
  flexRow(b, 12, 12);
  mkText(b, "Something went wrong. Check the message and retry.", {
    name: "Message",
    size: 14,
    color: "#CC3344",
    font,
    weight: "500",
    growType: "auto-height"
  });
  return b;
}

function buildFixHintCallout(font) {
  const b = penpot.createBoard();
  b.name = "CMP / FixHintCallout (source)";
  b.resize(720, 72);
  b.fills = [{ fillColor: "#FFF4CC", fillOpacity: 1 }];
  b.strokes = [{ strokeColor: "#C9A227", strokeOpacity: 1, strokeWidth: 1 }];
  b.borderRadius = 6;
  flexColumn(b, 6, 12);
  mkText(b, "Action blocked", { name: "Title", size: 13, color: "#111111", font, weight: "600" });
  mkText(b, "fixHint: Unlink manual test case REQ-... before delete.", {
    name: "Hint",
    size: 12,
    color: "#333333",
    font,
    weight: "400",
    growType: "auto-height"
  });
  return b;
}

function buildDataTable(font) {
  const b = penpot.createBoard();
  b.name = "CMP / DataTable (source)";
  b.resize(720, 220);
  flexColumn(b, 0, 0);
  const header = penpot.createBoard();
  header.name = "Header";
  header.resize(720, 40);
  header.fills = [{ fillColor: "#F7F7F8", fillOpacity: 1 }];
  header.strokes = [{ strokeColor: "#D0D0D8", strokeOpacity: 1, strokeWidth: 1 }];
  header.borderRadius = 6;
  flexRow(header, 24, 10, "start");
  mkText(header, "Column A", { name: "H1", size: 12, color: "#111111", font, weight: "600" });
  mkText(header, "Column B", { name: "H2", size: 12, color: "#111111", font, weight: "600" });
  mkText(header, "Status", { name: "H3", size: 12, color: "#111111", font, weight: "600" });
  b.appendChild(header);
  for (let i = 0; i < 3; i++) {
    const row = mkRect(b, 720, 36, i % 2 === 0 ? "#FFFFFF" : "#FAFAFC", "#EEEEEE", `Row ${i + 1}`);
    row.borderRadius = 4;
  }
  return b;
}

function buildAppShell(font) {
  const b = penpot.createBoard();
  b.name = "CMP / AppShell (source)";
  b.resize(1280, 800);
  b.fills = [{ fillColor: "#F7F7F8", fillOpacity: 1 }];
  penpotUtils.addFlexLayout(b, "column");
  b.flex.rowGap = 0;
  b.flex.columnGap = 0;
  b.flex.alignItems = "stretch";
  b.flex.justifyContent = "start";
  b.flex.verticalPadding = 0;
  b.flex.horizontalPadding = 0;
  b.flex.horizontalSizing = "auto";
  b.flex.verticalSizing = "auto";

  const top = penpot.createBoard();
  top.name = "Top bar";
  top.resize(1280, 56);
  top.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  flexRow(top, 12, 12);
  mkRect(top, 32, 32, "#3355CC", null, "Logo");
  mkText(top, "TCMS", { name: "Product", size: 15, color: "#111111", font, weight: "700" });
  const sp1 = penpot.createRectangle();
  sp1.name = "Spacer1";
  sp1.resize(1, 1);
  sp1.fills = [];
  sp1.strokes = [];
  top.appendChild(sp1);
  if (sp1.layoutChild) sp1.layoutChild.horizontalSizing = "fill";
  mkRect(top, 220, 32, "#F7F7F8", "#D0D0D8", "Project picker");
  b.appendChild(top);
  fixChild(top);

  const sub = penpot.createBoard();
  sub.name = "Subnav";
  sub.resize(1280, 48);
  sub.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  flexRow(sub, 8, 8);
  const tabs = ["Project", "Requirements", "Test cases", "Plans", "Runs", "Reporting", "Imports", "Design links"];
  for (const label of tabs) {
    const pill = mkRect(sub, 88, 28, "#FFFFFF", "#D0D0D8", label);
    pill.borderRadius = 6;
  }
  b.appendChild(sub);
  fixChild(sub);

  const main = penpot.createBoard();
  main.name = "Main";
  main.resize(1280, 696);
  main.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  mkRect(main, 1248, 640, "#F3F3F5", null, "Content placeholder");
  b.appendChild(main);
  fillChild(main);

  return b;
}

function layoutSourcesOnCanvas(root, boards) {
  const gapX = 40;
  const gapY = 40;
  const colW = 760;
  let x = gapX;
  let y = gapY;
  let rowH = 0;
  for (const board of boards) {
    board.x = x;
    board.y = y;
    root.appendChild(board);
    rowH = Math.max(rowH, board.bounds.height);
    x += board.bounds.width + gapX;
    if (x + colW > 4000) {
      x = gapX;
      y += rowH + gapY;
      rowH = 0;
    }
  }
}

const page = ensureFoundationsPage();
const root = page.root;
const font = pickFont();

const set = ensureTokenSet();
ensureTokens(set);

ensureLibraryColor("TCMS / Primary", "#3355CC");
ensureLibraryColor("TCMS / Text", "#111111");
ensureLibraryColor("TCMS / Muted", "#5C5C66");
ensureLibraryColor("TCMS / Border", "#D0D0D8");
ensureLibraryTypography("TCMS / Body", font, 14, "400");
ensureLibraryTypography("TCMS / Title", font, 22, "600");

const sources = [];
function addSource(name, builder) {
  if (hasComponent(name)) {
    return;
  }
  const board = builder();
  sources.push(board);
}

addSource("CMP / PrimaryButton", () => buildPrimaryButton(font));
addSource("CMP / SecondaryButton", () => buildSecondaryButton(font));
addSource("CMP / TextField", () => buildTextField(font));
addSource("CMP / PageHeader", () => buildPageHeader(font));
addSource("CMP / EmptyState", () => buildEmptyState(font));
addSource("CMP / ErrorBanner", () => buildErrorBanner(font));
addSource("CMP / FixHintCallout", () => buildFixHintCallout(font));
addSource("CMP / DataTable", () => buildDataTable(font));
addSource("CMP / AppShell", () => buildAppShell(font));

layoutSourcesOnCanvas(root, sources);

const createdComponents = [];
for (const board of sources) {
  const compName = board.name.replace(" (source)", "");
  const comp = registerComponent(board, compName);
  if (comp) {
    createdComponents.push(comp.name);
  }
}

storage.tcms = storage.tcms || {};
storage.tcms.phaseA = {
  page: page.name,
  tokenSet: set.name,
  libraryColors: lib.colors.filter((c) => c.name.startsWith("TCMS /")).map((c) => c.name),
  libraryTypographies: lib.typographies.filter((t) => t.name.startsWith("TCMS /")).map((t) => t.name),
  createdComponents,
  existingSkipped: lib.components
    .filter((c) => c.name.startsWith("CMP /"))
    .map((c) => c.name)
};

return {
  page: page.name,
  tokenSet: set.name,
  tokensAdded: set.tokens.map((t) => t.name),
  createdComponents,
  allLocalComponents: lib.components.filter((c) => c.name.startsWith("CMP /")).map((c) => c.name),
  storageKey: "storage.tcms.phaseA"
};
