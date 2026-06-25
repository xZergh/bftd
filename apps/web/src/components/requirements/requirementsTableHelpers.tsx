import { useCallback, useMemo } from "react";
import type { RequirementListItem } from "../../graphql/types";
import { sortIndicator } from "../../hooks/useColumnSort";
import { requirementParentKeyById } from "./requirementsHierarchy";

type Props = {
  label: string;
  sortKey: string;
  activeSortKey: string | null;
  sortDir: "asc" | "desc";
  onSort: (key: string) => void;
  className?: string;
};

export function SortableTh({ label, sortKey, activeSortKey, sortDir, onSort, className }: Props) {
  const active = activeSortKey === sortKey;
  return (
    <th scope="col" className={className}>
      <button
        type="button"
        className="projects-table-sort-btn"
        onClick={() => onSort(sortKey)}
        data-testid={`sort-${sortKey}`}
      >
        {label}{" "}
        <span
          className={`projects-table-sort-ind${active ? "" : " projects-table-sort-ind--idle"}`}
          aria-hidden="true"
        >
          {sortIndicator(active, sortDir)}
        </span>
      </button>
    </th>
  );
}

export const requirementSortAccessors: Record<
  string,
  (row: RequirementListItem) => string | number | null | undefined
> = {
  externalKey: (r) => r.externalKey,
  title: (r) => r.title,
  status: (r) => r.status,
  priority: (r) => r.priority,
  requirementType: (r) => r.requirementType,
  releaseLabel: (r) => r.releaseLabel,
  sprintLabel: (r) => r.sprintLabel,
  tags: (r) => r.tags.join(", "),
  linkedManualTestCaseCount: (r) => r.linkedManualTestCaseCount
};

export function useRequirementRowPatch() {
  return useCallback(
    (row: RequirementListItem, patch: Partial<RequirementListItem>): RequirementListItem => ({
      ...row,
      ...patch
    }),
    []
  );
}

/** Sort accessors including derived parent external key. */
export function useRequirementSortAccessors(rows: RequirementListItem[]) {
  return useMemo(() => {
    const parentKeys = requirementParentKeyById(rows);
    return {
      ...requirementSortAccessors,
      parent: (r: RequirementListItem) => parentKeys.get(r.id) ?? ""
    };
  }, [rows]);
}
