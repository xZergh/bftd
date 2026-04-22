import { RouterLink } from "../tamagui/RouterLink";
import type { ProjectWorkspaceSection } from "./projectWorkspaceNav";

type Props = {
  projectId: string;
  active: ProjectWorkspaceSection;
};

function navCurrent(active: ProjectWorkspaceSection, section: ProjectWorkspaceSection) {
  return active === section ? ("page" as const) : undefined;
}

export function ProjectSubNav({ projectId, active }: Props) {
  const base = `/projects/${projectId}`;

  return (
    <>
      <RouterLink
        to={base}
        data-testid="project-nav-project"
        aria-current={navCurrent(active, "project")}
      >
        Project
      </RouterLink>
      <RouterLink
        to={`${base}/requirements`}
        data-testid="project-nav-requirements"
        aria-current={navCurrent(active, "requirements")}
      >
        Requirements
      </RouterLink>
      <RouterLink
        to={`${base}/test-cases`}
        data-testid="project-nav-test-cases"
        aria-current={navCurrent(active, "test-cases")}
      >
        Test cases
      </RouterLink>
      <RouterLink
        to={`${base}/plans`}
        data-testid="project-nav-plans"
        aria-current={navCurrent(active, "plans")}
      >
        Plans
      </RouterLink>
      <RouterLink
        to={`${base}/runs`}
        data-testid="project-nav-runs"
        aria-current={navCurrent(active, "runs")}
      >
        Runs
      </RouterLink>
      <RouterLink
        to={`${base}/reporting`}
        data-testid="project-nav-reporting"
        aria-current={navCurrent(active, "reporting")}
      >
        Reporting
      </RouterLink>
      <RouterLink
        to={`${base}/imports`}
        data-testid="project-nav-imports"
        aria-current={navCurrent(active, "imports")}
      >
        Imports
      </RouterLink>
      <RouterLink
        to={`${base}/design-links`}
        data-testid="project-nav-design-links"
        aria-current={navCurrent(active, "design-links")}
      >
        Design links
      </RouterLink>
    </>
  );
}
