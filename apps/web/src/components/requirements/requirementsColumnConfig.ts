export const REQUIREMENT_HIERARCHY_COLUMN = {
  id: "hierarchy",
  label: "Hierarchy"
} as const;

export const REQUIREMENT_HIDEABLE_COLUMNS = [
  { id: "parent", label: "Parent", sortKey: "parent" },
  { id: "externalKey", label: "Key", sortKey: "externalKey" },
  { id: "title", label: "Title", sortKey: "title" },
  { id: "status", label: "Status", sortKey: "status" },
  { id: "priority", label: "Priority", sortKey: "priority" },
  { id: "requirementType", label: "Type", sortKey: "requirementType" },
  { id: "releaseLabel", label: "Release", sortKey: "releaseLabel" },
  { id: "sprintLabel", label: "Sprint", sortKey: "sprintLabel" },
  { id: "tags", label: "Tags", sortKey: "tags" },
  { id: "linkedManualTestCaseCount", label: "Linked TC", sortKey: "linkedManualTestCaseCount" }
] as const;

export type RequirementHideableColumnId = (typeof REQUIREMENT_HIDEABLE_COLUMNS)[number]["id"];

const STORAGE_KEY = "tcms.requirements.columnVisibility.v1";

export type RequirementColumnVisibility = Record<RequirementHideableColumnId, boolean>;

export function defaultColumnVisibility(): RequirementColumnVisibility {
  return {
    parent: false,
    externalKey: true,
    title: true,
    status: true,
    priority: true,
    requirementType: true,
    releaseLabel: true,
    sprintLabel: true,
    tags: true,
    linkedManualTestCaseCount: true
  };
}

function isHideableColumnId(value: string): value is RequirementHideableColumnId {
  return REQUIREMENT_HIDEABLE_COLUMNS.some((c) => c.id === value);
}

export function readStoredColumnVisibility(): RequirementColumnVisibility {
  const defaults = defaultColumnVisibility();
  if (typeof localStorage === "undefined") {
    return defaults;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) {
      return defaults;
    }
    const out = { ...defaults };
    for (const col of REQUIREMENT_HIDEABLE_COLUMNS) {
      const v = (parsed as Record<string, unknown>)[col.id];
      if (typeof v === "boolean") {
        out[col.id] = v;
      }
    }
    return out;
  } catch {
    return defaults;
  }
}

export function writeStoredColumnVisibility(visibility: RequirementColumnVisibility) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility));
  } catch {
    /* ignore quota / private mode */
  }
}

export function countVisibleHideableColumns(visibility: RequirementColumnVisibility): number {
  return REQUIREMENT_HIDEABLE_COLUMNS.filter((c) => visibility[c.id]).length;
}

/** True when this is the only hideable column still shown — cannot be turned off. */
export function isLastSelectedHideableColumn(
  visibility: RequirementColumnVisibility,
  columnId: RequirementHideableColumnId
): boolean {
  return visibility[columnId] && countVisibleHideableColumns(visibility) === 1;
}

export function toggleColumnVisibility(
  visibility: RequirementColumnVisibility,
  columnId: RequirementHideableColumnId
): RequirementColumnVisibility {
  if (!isHideableColumnId(columnId)) {
    return visibility;
  }
  if (visibility[columnId] && isLastSelectedHideableColumn(visibility, columnId)) {
    return visibility;
  }
  return { ...visibility, [columnId]: !visibility[columnId] };
}

/** Header + body column count: hierarchy + visible data columns + actions. */
export function requirementTableColumnCount(visibility: RequirementColumnVisibility): number {
  const hideableVisible = REQUIREMENT_HIDEABLE_COLUMNS.filter((c) => visibility[c.id]).length;
  return hideableVisible + 2;
}
