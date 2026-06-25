import { useCallback, useEffect, useState } from "react";

function storageKey(projectId: string) {
  return `tcms.requirements.treeCollapsed.${projectId}`;
}

function readCollapsed(projectId: string): Set<string> {
  if (typeof localStorage === "undefined") {
    return new Set();
  }
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === "string"));
  } catch {
    return new Set();
  }
}

function writeCollapsed(projectId: string, ids: Set<string>) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(storageKey(projectId), JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}

export function useRequirementTreeCollapse(projectId: string) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => readCollapsed(projectId));

  useEffect(() => {
    setCollapsedIds(readCollapsed(projectId));
  }, [projectId]);

  const toggleCollapsed = useCallback(
    (requirementId: string) => {
      setCollapsedIds((prev) => {
        const next = new Set(prev);
        if (next.has(requirementId)) {
          next.delete(requirementId);
        } else {
          next.add(requirementId);
        }
        writeCollapsed(projectId, next);
        return next;
      });
    },
    [projectId]
  );

  return { collapsedIds, toggleCollapsed };
}
