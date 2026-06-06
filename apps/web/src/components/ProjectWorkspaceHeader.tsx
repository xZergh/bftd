import { useLayoutEffect } from "react";
import { useOutletContext } from "react-router-dom";
import type { ReactNode } from "react";
import type { ProjectWorkspaceSection } from "./projectWorkspaceNav";
import type { WorkspaceOutletContextValue } from "../layout/workspaceOutletContext";

type Props = {
  title: ReactNode;
  titleId?: string;
  projectId: string;
  active: ProjectWorkspaceSection;
};

/** Registers title + section nav with AppShell; renders nothing in-page (chrome lives in the shell). */
export function ProjectWorkspaceHeader({ title, titleId, projectId, active }: Props) {
  const ctx = useOutletContext<WorkspaceOutletContextValue | undefined>();

  useLayoutEffect(() => {
    const set = ctx?.setWorkspaceChrome;
    if (set === undefined) {
      return;
    }
    set({ title, titleId, projectId, active });
    return () => {
      set(null);
    };
  }, [active, ctx?.setWorkspaceChrome, projectId, title, titleId]);

  return null;
}
