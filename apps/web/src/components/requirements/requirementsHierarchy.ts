import type { RequirementListItem } from "../../graphql/types";

export type RequirementTreeNode = {
  row: RequirementListItem;
  children: RequirementTreeNode[];
};

export type FlatRequirementRow = {
  row: RequirementListItem;
  depth: number;
  hasChildren: boolean;
  isCollapsed: boolean;
};

export function requirementParentKeyById(rows: RequirementListItem[]): Map<string, string> {
  const byId = new Map(rows.map((r) => [r.id, r.externalKey]));
  const out = new Map<string, string>();
  for (const row of rows) {
    if (row.parentRequirementId) {
      const key = byId.get(row.parentRequirementId);
      if (key) {
        out.set(row.id, key);
      }
    }
  }
  return out;
}

export function buildRequirementTree(rows: RequirementListItem[]): RequirementTreeNode[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const childrenByParent = new Map<string | null, RequirementListItem[]>();

  for (const row of rows) {
    const parentId =
      row.parentRequirementId && byId.has(row.parentRequirementId) ? row.parentRequirementId : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(row);
    childrenByParent.set(parentId, siblings);
  }

  const sortSiblings = (items: RequirementListItem[]) =>
    [...items].sort((a, b) => a.externalKey.localeCompare(b.externalKey, undefined, { numeric: true }));

  const build = (parentId: string | null): RequirementTreeNode[] =>
    sortSiblings(childrenByParent.get(parentId) ?? []).map((row) => ({
      row,
      children: build(row.id)
    }));

  return build(null);
}

export function flattenRequirementTree(
  nodes: RequirementTreeNode[],
  collapsedIds: ReadonlySet<string>
): FlatRequirementRow[] {
  const out: FlatRequirementRow[] = [];

  const walk = (node: RequirementTreeNode, depth: number) => {
    const hasChildren = node.children.length > 0;
    const isCollapsed = collapsedIds.has(node.row.id);
    out.push({ row: node.row, depth, hasChildren, isCollapsed });
    if (hasChildren && !isCollapsed) {
      for (const child of node.children) {
        walk(child, depth + 1);
      }
    }
  };

  for (const node of nodes) {
    walk(node, 0);
  }
  return out;
}

export type ParentSelectOption = {
  id: string;
  label: string;
  depth: number;
};

/** Depth-indented options for parent picker (excludes self and descendants when editing). */
export function buildParentSelectOptions(
  rows: RequirementListItem[],
  excludeId?: string
): ParentSelectOption[] {
  const exclude = new Set<string>();
  if (excludeId) {
    const byParent = new Map<string | null, RequirementListItem[]>();
    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const row of rows) {
      const pid = row.parentRequirementId && byId.has(row.parentRequirementId) ? row.parentRequirementId : null;
      const list = byParent.get(pid) ?? [];
      list.push(row);
      byParent.set(pid, list);
    }
    const mark = (id: string) => {
      exclude.add(id);
      for (const child of byParent.get(id) ?? []) {
        mark(child.id);
      }
    };
    mark(excludeId);
  }

  const tree = buildRequirementTree(rows);
  const flat = flattenRequirementTree(tree, new Set());
  return flat
    .filter((item) => !exclude.has(item.row.id))
    .map((item) => ({
      id: item.row.id,
      depth: item.depth,
      label: `${item.row.externalKey} — ${item.row.title}`
    }));
}
