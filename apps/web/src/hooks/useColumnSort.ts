import { useCallback, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";
export type SortValueType = "string" | "number";

export type ColumnSortOptions = {
  type?: SortValueType;
  nullValue?: string | number;
};

export function useColumnSort<T>(
  rows: T[],
  accessors: Record<string, (row: T) => string | number | null | undefined>,
  optionsByKey?: Record<string, ColumnSortOptions>
) {
  const [sortState, setSortState] = useState<{ key: string | null; dir: SortDirection }>({
    key: null,
    dir: "asc"
  });

  const sortKey = sortState.key;
  const sortDir = sortState.dir;

  const toggleSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev.key === key) {
        return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
      }
      return { key, dir: "asc" };
    });
  }, []);

  const sorted = useMemo(() => {
    if (sortKey === null || accessors[sortKey] === undefined) {
      return rows;
    }
    const acc = accessors[sortKey]!;
    const opts = optionsByKey?.[sortKey];
    const copy = [...rows];
    copy.sort((a, b) => {
      const rawA = acc(a);
      const rawB = acc(b);
      const valueType = opts?.type ?? "string";

      const cmp =
        valueType === "number"
          ? (Number(rawA ?? (opts?.nullValue ?? 0)) || 0) - (Number(rawB ?? (opts?.nullValue ?? 0)) || 0)
          : String(rawA ?? (opts?.nullValue ?? "")).localeCompare(String(rawB ?? (opts?.nullValue ?? "")), undefined, {
              numeric: true,
              sensitivity: "base"
            });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [accessors, optionsByKey, rows, sortDir, sortKey]);

  return { sorted, sortKey, sortDir, toggleSort };
}

export function sortIndicator(active: boolean, dir: SortDirection): string {
  if (!active) {
    return "↕";
  }
  return dir === "asc" ? "↑" : "↓";
}
