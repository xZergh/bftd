import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { readStoredEpicFilter, writeStoredEpicFilter } from "../navigation/epicFilter";

export function useEpicFilter(projectId: string) {
  const [searchParams, setSearchParams] = useSearchParams();
  const epicFilterId = searchParams.get("epic") ?? "";
  const restoredRef = useRef(false);

  useEffect(() => {
    restoredRef.current = false;
  }, [projectId]);

  useEffect(() => {
    const urlEpic = searchParams.get("epic");
    if (urlEpic) {
      writeStoredEpicFilter(projectId, urlEpic);
      return;
    }
    if (restoredRef.current) {
      return;
    }
    restoredRef.current = true;
    const stored = readStoredEpicFilter(projectId);
    if (!stored) {
      return;
    }
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("epic", stored);
        return n;
      },
      { replace: true }
    );
  }, [projectId, searchParams, setSearchParams]);

  const setEpicFilter = useCallback(
    (epicId: string) => {
      writeStoredEpicFilter(projectId, epicId === "" ? null : epicId);
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          if (epicId === "") {
            n.delete("epic");
          } else {
            n.set("epic", epicId);
          }
          return n;
        },
        { replace: true }
      );
    },
    [projectId, setSearchParams]
  );

  return { epicFilterId, setEpicFilter };
}
