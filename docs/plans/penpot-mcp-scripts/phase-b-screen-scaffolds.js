/**
 * Penpot MCP - Phase B (screen scaffolds)
 *
 * ## Preconditions
 * - Phase A completed in the same file (`CMP / *` components exist).
 * - Penpot file connected to MCP; plugin session active.
 *
 * ## How to run
 * Same as Phase A: paste only the JavaScript **below** the marker into `execute_code`
 * (body of a function - use `return` at the end). Or use chunked payloads from
 * `.cursor/penpot-phase-b-chunks/` if generated via `npm run penpot:gen-phase-b`.
 *
 * ## What this does
 * - Page **`02 Screens / MVP`** (created if missing): route-aligned **`SCR / ...`** boards - **shell only**:
 *   AppShell + PageHeader + subtitle + **one pointer line** in **Main** to the matching wire page.
 * - Pages **`03 Wire / {same tail as SCR}`** (one per screen): **`Wireframe / {tail}`** boards with
 *   low-fi **structure + behavior** notes for React (`empty`, `plain`, `table`, `fix`, `fix-error`,
 *   `run-form`, `tree-table`). Every Phase B run **refreshes** those boards so MVP stays uncluttered.
 *
 * Idempotent: re-run skips existing `SCR /` board names.
 */

/* eslint-disable no-undef -- Penpot plugin globals: penpot, penpotUtils, storage */

// --- paste everything below this line into `execute_code` ---

const lib = penpot.library.local;

function sliceChildren(shape) {
  if (!shape || !shape.children) return [];
  const ch = shape.children;
  const out = [];
  for (let i = 0; i < ch.length; i++) {
    out.push(ch[i]);
  }
  return out;
}

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

function libComp(name) {
  const list = lib.components || [];
  let c = list.find((x) => x.name === name);
  if (c) return c;
  const tail = name.replace(/^CMP \/ /, "");
  c = list.find((x) => x.name === tail);
  if (c) return c;
  c = list.find((x) => x.path === name || x.path === tail || (x.path && x.path.endsWith("/" + tail)));
  if (c) return c;
  return list.find((x) => String(x.name || "").includes(tail)) || null;
}

function prepareMain(main) {
  if (!main || main.type !== "board") return;
  const kids = sliceChildren(main);
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].name === "Content placeholder") {
      kids[i].remove();
    }
  }
  if (!main.flex) {
    penpotUtils.addFlexLayout(main, "column");
  }
  const flex = main.flex;
  flex.rowGap = 16;
  flex.columnGap = 0;
  flex.alignItems = "stretch";
  flex.justifyContent = "start";
  flex.horizontalPadding = 16;
  flex.verticalPadding = 16;
}

function appendFilledLayoutChild(board, shape) {
  board.appendChild(shape);
  if (shape.layoutChild) {
    shape.layoutChild.horizontalSizing = "fill";
    shape.layoutChild.verticalSizing = "fix";
  }
}

function flexRowBoard(board, gap, hPad, vPad) {
  if (!board.flex) {
    penpotUtils.addFlexLayout(board, "row");
  }
  const f = board.flex;
  f.rowGap = 0;
  f.columnGap = gap;
  f.alignItems = "center";
  f.justifyContent = "start";
  f.horizontalPadding = hPad;
  f.verticalPadding = vPad;
}

function flexColumnBoard(board, gap, hPad, vPad) {
  if (!board.flex) {
    penpotUtils.addFlexLayout(board, "column");
  }
  const f = board.flex;
  f.rowGap = gap;
  f.columnGap = 0;
  f.alignItems = "stretch";
  f.justifyContent = "start";
  f.horizontalPadding = hPad;
  f.verticalPadding = vPad;
}

const WIRE_PAGE_PREFIX = "03 Wire / ";
const WIRE_BOARD_PREFIX = "Wireframe / ";

function wireTailFromScr(scrName) {
  if (scrName.indexOf("SCR / ") === 0) return scrName.slice(6);
  return scrName;
}

function wirePageForSpec(spec) {
  return WIRE_PAGE_PREFIX + wireTailFromScr(spec.name);
}

function wireBoardForSpec(spec) {
  return WIRE_BOARD_PREFIX + wireTailFromScr(spec.name);
}

/* One table row: fixed-ish columns (HTML table or CSS grid) for React to match. */
function wireTableDataRow(parent, font, name, key, title, status, priority, tags) {
  const row = penpot.createBoard();
  row.name = name;
  row.resize(820, 30);
  flexRowBoard(row, 6, 6, 4);
  mkText(row, key, {
    name: "Col key",
    size: 11,
    color: "#111111",
    font,
    weight: "600",
    growType: "auto-width"
  });
  mkText(row, title, {
    name: "Col title",
    size: 11,
    color: "#111111",
    font,
    weight: "400",
    growType: "auto-height"
  });
  mkText(row, status, {
    name: "Col status",
    size: 11,
    color: "#111111",
    font,
    weight: "400",
    growType: "auto-width"
  });
  mkText(row, priority, {
    name: "Col priority",
    size: 11,
    color: "#111111",
    font,
    weight: "400",
    growType: "auto-width"
  });
  mkText(row, tags, {
    name: "Col tags",
    size: 10,
    color: "#5C5C66",
    font,
    weight: "400",
    growType: "auto-height"
  });
  parent.appendChild(row);
  return row;
}

/*
 * Low-fi wire for React: tree scopes table; grouped headers + columns; inline edit + DND notes.
 */
function buildWireEmpty(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(760, 420);
  flexColumnBoard(wrap, 12, 16, 16);
  wrap.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  wrap.strokes = [{ strokeColor: "#C8C8D0", strokeOpacity: 1, strokeWidth: 1 }];
  mkText(wrap, "React - empty list / hub: Main is dominated by EmptyState (or illustration + CTA).", {
    name: "R1",
    size: 11,
    color: "#3D3D47",
    font,
    weight: "600",
    growType: "auto-height"
  });
  mkText(
    wrap,
    "Behavior: primary action routes (create project, import, pick workspace). No modal - full-width content below PageHeader.",
    {
      name: "R2",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );
  mkText(wrap, "Shell: AppShell keeps project nav + Main flex column; EmptyState is single flex child with fill.", {
    name: "R3",
    size: 10,
    color: "#5C5C66",
    font,
    weight: "400",
    growType: "auto-height"
  });
  return wrap;
}

function buildWirePlain(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(900, 520);
  flexColumnBoard(wrap, 12, 16, 16);
  wrap.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  wrap.strokes = [{ strokeColor: "#C8C8D0", strokeOpacity: 1, strokeWidth: 1 }];
  mkText(wrap, "React - hint / prose screen: one column under PageHeader.", {
    name: "R1",
    size: 11,
    color: "#3D3D47",
    font,
    weight: "600",
    growType: "auto-height"
  });
  mkText(wrap, spec.caption || "(caption from route spec)", {
    name: "Body",
    size: 13,
    color: "#111111",
    font,
    weight: "400",
    growType: "auto-height"
  });
  mkText(
    wrap,
    "Behavior: optional secondary links row; no popups for primary flow. URL stays source of truth for project scope.",
    {
      name: "R3",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );
  return wrap;
}

function buildWireTable(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(960, 560);
  flexColumnBoard(wrap, 10, 14, 14);
  wrap.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  wrap.strokes = [{ strokeColor: "#C8C8D0", strokeOpacity: 1, strokeWidth: 1 }];
  mkText(wrap, "React: populated list (DataTable or semantic table) with sortable columns; row click opens detail route.", {
    name: "R1",
    size: 11,
    color: "#3D3D47",
    font,
    weight: "600",
    growType: "auto-height"
  });
  if (spec.subtitle) {
    mkText(wrap, "Seed / demo copy: " + spec.subtitle, {
      name: "Sub",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    });
  }
  mkText(wrap, "Columns: Key / id | Title | Status | Meta", {
    name: "Col hdr",
    size: 10,
    color: "#5C5C66",
    font,
    weight: "600",
    growType: "auto-height"
  });
  mkText(
    wrap,
    "Rows: align copy with npm run seed:demo. Inline row actions in last column. Virtualize when list grows.",
    {
      name: "R4",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );
  return wrap;
}

function buildWireFix(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(880, 480);
  flexColumnBoard(wrap, 12, 16, 16);
  wrap.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  wrap.strokes = [{ strokeColor: "#C8C8D0", strokeOpacity: 1, strokeWidth: 1 }];
  mkText(wrap, "React - blocked action: show context line + FixHintCallout from AppError (code, message, fixHint).", {
    name: "R1",
    size: 11,
    color: "#3D3D47",
    font,
    weight: "600",
    growType: "auto-height"
  });
  mkText(
    wrap,
    "Layout stack: PageHeader -> optional subtitle -> FixHint (fill width). Actions: dismiss / undo inline, not modal unless destructive bulk.",
    {
      name: "R2",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );
  mkRect(wrap, 820, 100, "#FFF4E5", "#E2B354", "FixHint zone");
  return wrap;
}

function buildWireFixError(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(880, 520);
  flexColumnBoard(wrap, 12, 16, 16);
  wrap.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  wrap.strokes = [{ strokeColor: "#C8C8D0", strokeOpacity: 1, strokeWidth: 1 }];
  mkText(wrap, "React - error + recovery: ErrorBanner (transport or fatal) then FixHintCallout for row-level fix.", {
    name: "R1",
    size: 11,
    color: "#3D3D47",
    font,
    weight: "600",
    growType: "auto-height"
  });
  mkRect(wrap, 820, 56, "#FDECEC", "#D95C5C", "ErrorBanner zone");
  mkRect(wrap, 820, 100, "#FFF4E5", "#E2B354", "FixHint zone");
  mkText(
    wrap,
    "Example: tombstone test case - explain restore path; surface fixHint from API.",
    {
      name: "R4",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );
  return wrap;
}

function buildWireRunForm(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(920, 580);
  flexColumnBoard(wrap, 12, 16, 16);
  wrap.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  wrap.strokes = [{ strokeColor: "#C8C8D0", strokeOpacity: 1, strokeWidth: 1 }];
  mkText(wrap, "React - run result submit: stacked rows (test case x outcome x duration) + primary submit.", {
    name: "R1",
    size: 11,
    color: "#3D3D47",
    font,
    weight: "600",
    growType: "auto-height"
  });
  mkText(wrap, spec.caption || "Scenario copy from seed run.", {
    name: "Cap",
    size: 10,
    color: "#111111",
    font,
    weight: "400",
    growType: "auto-height"
  });
  mkText(
    wrap,
    "Fields live in Main (TextField rows). Validation inline; mutation returns AppError -> FixHint pattern.",
    {
      name: "R3",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );
  mkRect(wrap, 800, 120, "#F0F0F4", "#B8B8C4", "Form block");
  return wrap;
}

function buildWireFallback(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(640, 240);
  flexColumnBoard(wrap, 8, 12, 12);
  mkText(wrap, "Wire placeholder - extend phase-b-screen-scaffolds.js for content mode: " + (spec.content || "?"), {
    name: "T",
    size: 11,
    color: "#111111",
    font,
    weight: "400",
    growType: "auto-height"
  });
  return wrap;
}

function buildTreeTableWireframe(spec, font) {
  const wrap = penpot.createBoard();
  wrap.resize(1180, 768);
  flexColumnBoard(wrap, 10, 14, 14);
  wrap.fills = [{ fillColor: "#FAFAFB", fillOpacity: 1 }];
  wrap.strokes = [{ strokeColor: "#C8C8D0", strokeOpacity: 1, strokeWidth: 1 }];

  mkText(
    wrap,
    spec.name +
      " - React targets: split pane; tree selection filters + scopes rows; table is grouped by folder path; cells inline-edit with debounced save + row status pill.",
    {
      name: "Build intent",
      size: 11,
      color: "#3D3D47",
      font,
      weight: "600",
      growType: "auto-height"
    }
  );

  const mainRow = penpot.createBoard();
  mainRow.name = "Split pane (tree | table)";
  mainRow.resize(1152, 620);
  flexRowBoard(mainRow, 14, 0, 0);

  const tree = penpot.createBoard();
  tree.name = "Region: folder tree";
  tree.resize(276, 600);
  tree.fills = [{ fillColor: "#EEF0F4", fillOpacity: 1 }];
  tree.strokes = [{ strokeColor: "#B8B8C4", strokeOpacity: 1, strokeWidth: 1 }];
  flexColumnBoard(tree, 8, 10, 10);
  mkText(tree, "Folder tree (grouping source)", {
    name: "Tree title",
    size: 11,
    color: "#5C5C66",
    font,
    weight: "600"
  });
  mkText(
    tree,
    "Behavior: click node -> table shows rows under that folder (descendants). DND: drag requirement row onto a folder node -> re-parent (API TBD).",
    {
      name: "Tree behavior",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );
  const treeLevels = ["DEMO-QA (workspace)", "  Auth / sign-in <- selected", "  Security"];
  for (let i = 0; i < treeLevels.length; i++) {
    const row = penpot.createBoard();
    row.name = "Tree node " + (i + 1);
    row.resize(256, 26);
    flexRowBoard(row, 6, 4 + Math.min(i, 3) * 8, 4);
    if (i === 1) {
      row.fills = [{ fillColor: "#DCE6F8", fillOpacity: 1 }];
    }
    mkText(row, treeLevels[i], {
      name: "Label",
      size: 11,
      color: "#111111",
      font,
      weight: i === 1 ? "600" : "400"
    });
    tree.appendChild(row);
  }

  const tbl = penpot.createBoard();
  tbl.name = "Region: grouped requirements table";
  tbl.resize(848, 600);
  tbl.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  tbl.strokes = [{ strokeColor: "#B8B8C4", strokeOpacity: 1, strokeWidth: 1 }];
  flexColumnBoard(tbl, 10, 12, 12);

  mkText(tbl, "Grouped rows (one block per folder path; aligns with tree)", {
    name: "Table hint",
    size: 10,
    color: "#6E6E78",
    font,
    weight: "400",
    growType: "auto-height"
  });

  const colHead = penpot.createBoard();
  colHead.name = "Column headers";
  colHead.resize(800, 24);
  flexRowBoard(colHead, 16, 6, 4);
  const headers = ["Key", "Title", "Status", "Priority", "Tags"];
  for (let hi = 0; hi < headers.length; hi++) {
    mkText(colHead, headers[hi], {
      name: "H " + headers[hi],
      size: 10,
      color: "#5C5C66",
      font,
      weight: "600",
      growType: hi === 1 ? "auto-height" : "auto-width"
    });
  }
  tbl.appendChild(colHead);

  const g1 = penpot.createBoard();
  g1.name = "Group: Authentication / Sign-in";
  g1.resize(800, 120);
  g1.fills = [{ fillColor: "#F6F7FA", fillOpacity: 1 }];
  flexColumnBoard(g1, 6, 8, 8);
  mkText(g1, "v Authentication / Sign-in & session", {
    name: "Group label",
    size: 11,
    color: "#3D3D47",
    font,
    weight: "600",
    growType: "auto-height"
  });
  wireTableDataRow(
    g1,
    font,
    "Row DEMO-R1",
    "DEMO-R1",
    "User can sign in with email and password",
    "approved",
    "high",
    "demo, auth"
  );
  mkText(
    g1,
    "Inline row example: DND :: + DEMO-R3 cell edit + pill saving->saved (in_progress | high | demo, auth).",
    {
      name: "Row inline hint",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );

  tbl.appendChild(g1);

  mkText(
    tbl,
    "DND within table: :: reorder rows inside a group and across groups. Persist order + parent folder via GraphQL when API supports it.",
    {
      name: "DND note",
      size: 10,
      color: "#6E6E78",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );

  mainRow.appendChild(tree);
  mainRow.appendChild(tbl);
  if (tree.layoutChild) {
    tree.layoutChild.horizontalSizing = "fix";
    tree.layoutChild.verticalSizing = "fill";
  }
  if (tbl.layoutChild) {
    tbl.layoutChild.horizontalSizing = "fill";
    tbl.layoutChild.verticalSizing = "fill";
  }

  wrap.appendChild(mainRow);
  if (mainRow.layoutChild) {
    mainRow.layoutChild.horizontalSizing = "fill";
    mainRow.layoutChild.verticalSizing = "fill";
  }

  return wrap;
}

function ensurePenpotPageByName(pageName) {
  let p = penpotUtils.getPageByName(pageName);
  if (!p) {
    p = penpot.createPage();
    p.name = pageName;
  }
  return p;
}

function pickWireBuilder(mode) {
  if (mode === "tree-table") return buildTreeTableWireframe;
  if (mode === "empty") return buildWireEmpty;
  if (mode === "plain") return buildWirePlain;
  if (mode === "table") return buildWireTable;
  if (mode === "fix") return buildWireFix;
  if (mode === "fix-error") return buildWireFixError;
  if (mode === "run-form") return buildWireRunForm;
  return buildWireFallback;
}

/* One dedicated 03 Wire page per SCR; Wireframe board per tail; refresh on every run. */
function refreshWireForSpec(spec, font) {
  const pageNm = wirePageForSpec(spec);
  const boardNm = wireBoardForSpec(spec);
  const builder = pickWireBuilder(spec.content);
  const wp = ensurePenpotPageByName(pageNm);
  penpot.openPage(wp);
  const root = wp.root;
  const kids = sliceChildren(root);
  for (let i = 0; i < kids.length; i++) {
    const c = kids[i];
    if (c && c.name === boardNm) {
      try {
        c.remove();
      } catch (e) {
        /* ignore */
      }
    }
  }
  const wrap = builder(spec, font);
  wrap.name = boardNm;
  wrap.x = 32;
  wrap.y = 32;
  root.appendChild(wrap);
  return { page: pageNm, board: boardNm, mode: spec.content };
}

function refreshAllScreenWires(screensList, font) {
  const out = [];
  for (let i = 0; i < screensList.length; i++) {
    out.push(refreshWireForSpec(screensList[i], font));
  }
  return out;
}

function ensureScreensPage() {
  let page = penpotUtils.getPageByName("02 Screens / MVP");
  if (!page) {
    page = penpot.createPage();
    page.name = "02 Screens / MVP";
  }
  penpot.openPage(page);
  return page;
}

function layoutScaffolds(root, boards) {
  const gapX = 40;
  const gapY = 48;
  const colW = 1360;
  let x = gapX;
  let y = gapY;
  let rowH = 0;
  for (let i = 0; i < boards.length; i++) {
    const board = boards[i];
    if (!board) continue;
    board.x = x;
    board.y = y;
    if (board.parent !== root) {
      root.appendChild(board);
    }
    rowH = Math.max(rowH, board.bounds.height);
    x += board.bounds.width + gapX;
    if (x + colW > 12000) {
      x = gapX;
      y += rowH + gapY;
      rowH = 0;
    }
  }
}

function scaffoldFrame(spec, font, missing, screensPage) {
  const appShell = libComp("CMP / AppShell");
  const pageHeader = libComp("CMP / PageHeader");

  if (!appShell || !pageHeader) {
    if (!appShell) missing.push("CMP / AppShell");
    if (!pageHeader) missing.push("CMP / PageHeader");
    return null;
  }

  const frame = penpot.createBoard();
  frame.name = spec.name;
  frame.resize(1280, 900);
  frame.fills = [{ fillColor: "#ECECEF", fillOpacity: 1 }];
  penpotUtils.addFlexLayout(frame, "column");
  frame.flex.rowGap = 12;
  frame.flex.columnGap = 0;
  frame.flex.alignItems = "stretch";
  frame.flex.justifyContent = "start";
  frame.flex.horizontalPadding = 12;
  frame.flex.verticalPadding = 12;

  const shellShape = appShell.instance();
  frame.appendChild(shellShape);
  if (shellShape.layoutChild) {
    shellShape.layoutChild.horizontalSizing = "fill";
    shellShape.layoutChild.verticalSizing = "fix";
  }

  const main = findShapeByName(shellShape, "Main");
  if (!main) {
    missing.push("Main slot in AppShell instance");
    frame.remove();
    return null;
  }
  prepareMain(main);

  const ph = pageHeader.instance();
  appendFilledLayoutChild(main, ph);

  if (spec.subtitle) {
    mkText(main, spec.subtitle, {
      name: "Subtitle",
      size: 12,
      color: "#5C5C66",
      font,
      weight: "400",
      growType: "auto-height"
    });
  }

  penpot.openPage(screensPage);
  const wp = wirePageForSpec(spec);
  mkText(
    main,
    "Structure + behavior wire: open page \"" +
      wp +
      "\" (board \"" +
      wireBoardForSpec(spec) +
      "\"; refreshed every Phase B). MVP frame stays shell-only.",
    {
      name: "Wireframe pointer",
      size: 12,
      color: "#5C5C66",
      font,
      weight: "400",
      growType: "auto-height"
    }
  );

  return frame;
}

const screens = [
  { name: "SCR / home - no-project", content: "empty" },
  {
    name: "SCR / home - pick-project-hint",
    content: "plain",
    caption: "Open seeded project DEMO-QA (Demo QA sample workspace) or choose from Recents."
  },
  {
    name: "SCR / projects - list",
    content: "table",
    subtitle: "Example row title: Demo QA sample workspace | key DEMO-QA"
  },
  {
    name: "SCR / project - hub",
    content: "plain",
    caption: "Hub for Demo QA sample workspace (DEMO-QA): requirements, tests, runs from seed."
  },
  { name: "SCR / requirements - list-empty", content: "empty" },
  {
    name: "SCR / requirements - list-populated",
    content: "table",
    subtitle: "Seed: DEMO-R1 approved | DEMO-R2 draft | DEMO-R3 in_progress"
  },
  { name: "SCR / requirements - delete-blocked", content: "fix" },
  { name: "SCR / requirements - tree-table-v1", content: "tree-table" },
  {
    name: "SCR / test-cases - list",
    content: "table",
    subtitle:
      "Manual: successful login with valid credentials | idle timeout logs user out | password reset happy path. Auto: API token exchange returns access token."
  },
  { name: "SCR / test-cases - detail-tombstone", content: "fix-error" },
  { name: "SCR / runs - list-empty", content: "empty" },
  {
    name: "SCR / runs - list",
    content: "table",
    subtitle: "Example run: Demo regression - staging | staging | demo-1.0.0 | trigger seed-script"
  },
  {
    name: "SCR / runs - create-with-plan",
    content: "plain",
    caption: "Create run flow; seed example name Demo regression - staging with optional plan picker."
  },
  {
    name: "SCR / runs - detail-result-form",
    content: "run-form",
    caption:
      "Submit results: login passed 1200ms, idle failed 800ms, reset skipped 0ms, API token passed 340ms (seed order)."
  }
];

const page = ensureScreensPage();
// Use page.root, not penpot.root: after openPage(), the active root can lag one tick
// and shapes would attach to the wrong page (e.g. 00 Foundations), yielding an "empty" frame.
const root = page.root;
const font = pickFont();
const missing = [];
const skipped = [];
const created = [];

for (let i = 0; i < screens.length; i++) {
  const spec = screens[i];
  const exists = root.children && root.children.some((c) => c.name === spec.name);
  if (exists) {
    skipped.push(spec.name);
    continue;
  }
  const frame = scaffoldFrame(spec, font, missing, page);
  if (!frame) {
    return {
      error: "Scaffold failed (see missing)",
      hint: "Run Phase A (phase-a-foundations.js) in this same Penpot file so CMP components exist.",
      missing,
      skipped,
      created
    };
  }
  root.appendChild(frame);
  created.push(spec.name);
}

const ordered = [];
for (let i = 0; i < screens.length; i++) {
  const spec = screens[i];
  const b = root.children && root.children.find((c) => c.name === spec.name);
  if (b) ordered.push(b);
}
layoutScaffolds(root, ordered);

const wirePages = refreshAllScreenWires(screens, font);
penpot.openPage(page);

storage.tcms = storage.tcms || {};
storage.tcms.phaseB = {
  page: page.name,
  boards: screens.map((s) => s.name),
  created,
  skipped,
  wirePagePrefix: WIRE_PAGE_PREFIX,
  wirePages
};

return {
  page: page.name,
  created,
  skipped,
  totalSpecs: screens.length,
  wirePagePrefix: WIRE_PAGE_PREFIX,
  wirePages,
  storageKey: "storage.tcms.phaseB",
  missing: missing.length ? missing : undefined
};
