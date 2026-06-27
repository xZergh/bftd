import { useCallback, useEffect, useRef } from "react";
import type { AutomationWorkspaceTab } from "../automation/automationStatus";
import {
  readStoredAutomationSelection,
  writeStoredAutomationAuto,
  writeStoredAutomationManual
} from "../navigation/automationSelection";

type Options = {
  projectId: string;
  tab: AutomationWorkspaceTab;
  loading: boolean;
  showingSample: boolean;
  sortedManualIds: string[];
  sortedAutoIds: string[];
  selectedManualId: string | null;
  selectedAutoId: string | null;
  selectManual: (id: string) => void;
  selectAuto: (id: string) => void;
  clearManual: () => void;
  clearAuto: () => void;
};

export function useAutomationInspectorSelection({
  projectId,
  tab,
  loading,
  showingSample,
  sortedManualIds,
  sortedAutoIds,
  selectedManualId,
  selectedAutoId,
  selectManual,
  selectAuto,
  clearManual,
  clearAuto
}: Options) {
  const dismissedRef = useRef(false);

  useEffect(() => {
    dismissedRef.current = false;
  }, []);

  useEffect(() => {
    dismissedRef.current = false;
  }, [projectId, tab]);

  const resetDismissed = useCallback(() => {
    dismissedRef.current = false;
  }, []);

  const dismissInspector = useCallback(() => {
    dismissedRef.current = true;
  }, []);

  useEffect(() => {
    if (loading || showingSample) {
      return;
    }

    if (tab === "coverage") {
      if (sortedManualIds.length === 0) {
        if (selectedManualId !== null) {
          clearManual();
        }
        return;
      }

      if (selectedManualId !== null && sortedManualIds.includes(selectedManualId)) {
        writeStoredAutomationManual(projectId, selectedManualId);
        dismissedRef.current = false;
        if (selectedAutoId !== null && sortedAutoIds.includes(selectedAutoId)) {
          writeStoredAutomationAuto(projectId, selectedAutoId);
        }
        return;
      }

      if (dismissedRef.current) {
        return;
      }

      const stored = readStoredAutomationSelection(projectId).manualId;
      const candidate =
        stored !== undefined && sortedManualIds.includes(stored) ? stored : sortedManualIds[0];
      if (candidate === undefined) {
        return;
      }
      if (candidate !== selectedManualId) {
        selectManual(candidate);
      }
      return;
    }

    if (sortedAutoIds.length === 0) {
      if (selectedAutoId !== null) {
        clearAuto();
      }
      return;
    }

    if (selectedAutoId !== null && sortedAutoIds.includes(selectedAutoId)) {
      writeStoredAutomationAuto(projectId, selectedAutoId);
      dismissedRef.current = false;
      return;
    }

    if (dismissedRef.current) {
      return;
    }

    const stored = readStoredAutomationSelection(projectId).autoId;
    const candidate = stored !== undefined && sortedAutoIds.includes(stored) ? stored : sortedAutoIds[0];
    if (candidate === undefined) {
      return;
    }
    if (candidate !== selectedAutoId) {
      selectAuto(candidate);
    }
  }, [
    clearAuto,
    clearManual,
    loading,
    projectId,
    selectAuto,
    selectManual,
    selectedAutoId,
    selectedManualId,
    showingSample,
    sortedAutoIds,
    sortedManualIds,
    tab
  ]);

  return { resetDismissed, dismissInspector };
}
