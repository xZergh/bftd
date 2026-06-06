import type { ReactNode } from "react";
import type { ProjectWorkspaceSection } from "../components/projectWorkspaceNav";

export type WorkspaceShellChrome = {
  title: ReactNode;
  titleId?: string;
  projectId: string;
  active: ProjectWorkspaceSection;
};

export type WorkspaceOutletContextValue = {
  setWorkspaceChrome: (chrome: WorkspaceShellChrome | null) => void;
};
