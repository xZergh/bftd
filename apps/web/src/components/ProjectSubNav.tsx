import { RouterLink } from "../tamagui/RouterLink";
import { useSearchParams } from "react-router-dom";
import { buildEpicQuery, readStoredEpicFilter } from "../navigation/epicFilter";
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
  const [searchParams] = useSearchParams();
  const epicQuery = buildEpicQuery(searchParams.get("epic") ?? readStoredEpicFilter(projectId));

  const chipLinkStyle = { color: "var(--tcms-text)" as const };

  return (
    <>
      <RouterLink
        to={base}
        data-testid="project-nav-overview"
        aria-current={navCurrent(active, "project")}
        style={chipLinkStyle}
      >
        Overview
      </RouterLink>
      <RouterLink
        to={`${base}/requirements${epicQuery}`}
        data-testid="project-nav-requirements"
        aria-current={navCurrent(active, "requirements")}
        style={chipLinkStyle}
      >
        Requirements
      </RouterLink>
      <RouterLink
        to={`${base}/test-cases${epicQuery}`}
        data-testid="project-nav-test-cases"
        aria-current={navCurrent(active, "test-cases")}
        style={chipLinkStyle}
      >
        Test cases
      </RouterLink>
      <RouterLink
        to={`${base}/plans`}
        data-testid="project-nav-plans"
        aria-current={navCurrent(active, "plans")}
        style={chipLinkStyle}
      >
        Plans
      </RouterLink>
      <RouterLink
        to={`${base}/runs`}
        data-testid="project-nav-runs"
        aria-current={navCurrent(active, "runs")}
        style={chipLinkStyle}
      >
        Runs
      </RouterLink>
      <RouterLink
        to={`${base}/reporting`}
        data-testid="project-nav-reporting"
        aria-current={navCurrent(active, "reporting")}
        style={chipLinkStyle}
      >
        Reporting
      </RouterLink>
      <RouterLink
        to={`${base}/imports`}
        data-testid="project-nav-imports"
        aria-current={navCurrent(active, "imports")}
        style={chipLinkStyle}
      >
        Imports
      </RouterLink>
      <RouterLink
        to={`${base}/design-links`}
        data-testid="project-nav-design-links"
        aria-current={navCurrent(active, "design-links")}
        style={chipLinkStyle}
      >
        Design links
      </RouterLink>
    </>
  );
}
