import type { ReactNode } from "react";
import { ProjectSubNav } from "./ProjectSubNav";
import type { ProjectWorkspaceSection } from "./projectWorkspaceNav";

type Props = {
  title: ReactNode;
  titleId?: string;
  projectId: string;
  active: ProjectWorkspaceSection;
};

export function ProjectWorkspaceHeader({ title, titleId, projectId, active }: Props) {
  return (
    <div className="project-detail-header">
      {titleId !== undefined ? <h2 id={titleId}>{title}</h2> : <h2>{title}</h2>}
      <div className="project-detail-header-right">
        <div className="project-detail-header-links">
          <ProjectSubNav projectId={projectId} active={active} />
        </div>
      </div>
    </div>
  );
}
