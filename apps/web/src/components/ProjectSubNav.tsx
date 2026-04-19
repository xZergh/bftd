import { RouterLink } from "../tamagui/RouterLink";
import { ProjectNavLinkWithCreateMenu } from "./ProjectNavLinkWithCreateMenu";
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
      <ProjectNavLinkWithCreateMenu
        active={active}
        section="requirements"
        listTo={`${base}/requirements`}
        label="Requirements"
        linkTestId="project-nav-requirements"
        menuTriggerTestId="project-nav-requirements-menu"
        menuTriggerAriaLabel="Requirements: create and other actions"
        items={[
          {
            to: `${base}/requirements?new=1`,
            label: "New requirement",
            testId: "nav-project-create-requirement"
          }
        ]}
      />
      <ProjectNavLinkWithCreateMenu
        active={active}
        section="test-cases"
        listTo={`${base}/test-cases`}
        label="Test cases"
        linkTestId="project-nav-test-cases"
        menuTriggerTestId="project-nav-test-cases-menu"
        menuTriggerAriaLabel="Test cases: create and other actions"
        items={[
          {
            to: `${base}/test-cases?new=manual`,
            label: "New manual test case",
            testId: "nav-project-create-testcase-manual"
          },
          {
            to: `${base}/test-cases?new=auto`,
            label: "New automated test case",
            testId: "nav-project-create-testcase-auto"
          }
        ]}
      />
      <ProjectNavLinkWithCreateMenu
        active={active}
        section="runs"
        listTo={`${base}/runs`}
        label="Runs"
        linkTestId="project-nav-runs"
        menuTriggerTestId="project-nav-runs-menu"
        menuTriggerAriaLabel="Runs: create and other actions"
        items={[
          {
            to: `${base}/runs?new=1`,
            label: "New run",
            testId: "nav-project-create-run"
          }
        ]}
      />
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
