import { useParams } from "react-router-dom";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { RequirementDetailPanel } from "../components/requirements/RequirementDetailPanel";
import "./ProjectsPage.css";

export function RequirementDetailPage() {
  const { projectId, requirementId } = useParams();

  if (projectId === undefined || requirementId === undefined) {
    return null;
  }

  return (
    <section className="projects-page" data-testid="requirement-detail-page">
      <ProjectWorkspaceHeader title="Requirement" projectId={projectId} active="requirements" />
      <RequirementDetailPanel projectId={projectId} requirementId={requirementId} variant="full" />
    </section>
  );
}
