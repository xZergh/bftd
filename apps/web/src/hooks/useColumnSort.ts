import { useCallback, useEffect, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export function useColumnSort<T>(
  rows: T[],
  accessors: Record<string, (row: T) => string | number | null | undefined>
) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const toggleSort = useCallback((key: string) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return key;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  const sorted = useMemo(() => {
    if (sortKey === null || accessors[sortKey] === undefined) {
      return rows;
    }
    const acc = accessors[sortKey]!;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = acc(a);
      const bv = acc(b);
      const as = av === null || av === undefined ? "" : String(av);
      const bs = bv === null || bv === undefined ? "" : String(bv);
      const cmp = as.localeCompare(bs, undefined, { numeric: true, sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [accessors, rows, sortDir, sortKey]);

  return { sorted, sortKey, sortDir, toggleSort };
}

export function sortIndicator(active: boolean, dir: SortDirection): string {
  if (!active) {
    return "↕";
  }
  return dir === "asc" ? "↑" : "↓";
}
