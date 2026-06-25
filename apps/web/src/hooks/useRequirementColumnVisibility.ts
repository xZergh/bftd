import { useCallback, useState } from "react";
import {
  readStoredColumnVisibility,
  toggleColumnVisibility,
  writeStoredColumnVisibility,
  type RequirementColumnVisibility,
  type RequirementHideableColumnId
} from "../components/requirements/requirementsColumnConfig";

export function useRequirementColumnVisibility() {
  const [visibility, setVisibility] = useState<RequirementColumnVisibility>(() => readStoredColumnVisibility());

  const toggleColumn = useCallback((columnId: RequirementHideableColumnId) => {
    setVisibility((prev) => {
      const next = toggleColumnVisibility(prev, columnId);
      writeStoredColumnVisibility(next);
      return next;
    });
  }, []);

  const isColumnVisible = useCallback(
    (columnId: RequirementHideableColumnId) => visibility[columnId],
    [visibility]
  );

  return { visibility, toggleColumn, isColumnVisible };
}
