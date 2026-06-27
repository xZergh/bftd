import { useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { H2, Paragraph, Text, XStack, YStack } from "tamagui";
import { ProjectPicker } from "../components/ProjectPicker";
import { ProjectSubNav } from "../components/ProjectSubNav";
import { ProjectsNavDropdown } from "../components/ProjectsNavDropdown";
import { ShellAccountMenu } from "../components/ShellAccountMenu";
import { ShellDatabaseMenu } from "../components/ShellDatabaseMenu";
import { writeLastProjectPath } from "../navigation/lastProjectPath";
import { RouterLink } from "../tamagui/RouterLink";
import { useShellErrors } from "../shell/ShellErrorsContext";
import { RouteErrorBoundary } from "./RouteErrorBoundary";
import "./AppShell.css";
import "../pages/ProjectsPage.css";
import type { WorkspaceOutletContextValue, WorkspaceShellChrome } from "./workspaceOutletContext";

function projectIdFromPath(pathname: string): string | undefined {
  const m = pathname.match(/^\/projects\/([^/]+)/);
  return m?.[1];
}

export function AppShell() {
  const location = useLocation();
  const { transportMessage, payloadAppError } = useShellErrors();
  const [workspaceChrome, setWorkspaceChrome] = useState<WorkspaceShellChrome | null>(null);
  const workspaceOutletContext = useMemo<WorkspaceOutletContextValue>(
    () => ({ setWorkspaceChrome }),
    [setWorkspaceChrome]
  );

  const projectIdInRoute = useMemo(() => projectIdFromPath(location.pathname), [location.pathname]);

  // Perf: avoid a second ProjectByIdQuery in the shell (pages already run it); duplicate urql subscriptions
  // caused React “Cannot update AppShell while rendering …” during fast route changes (FE-D guard).

  useEffect(() => {
    writeLastProjectPath(location.pathname);
  }, [location.pathname]);

  /** Any `/projects` or `/projects/...` URL (shell crumb “current” styling only when not in this subtree). */
  const onProjectsRouteSubtree =
    location.pathname === "/projects" || location.pathname.startsWith("/projects/");
  /** Highlight the Projects control only on the list page, not inside `/projects/:id/...`. */
  const projectsListPageActive = location.pathname === "/projects";

  const navContextHref = projectIdInRoute !== undefined ? `/projects/${projectIdInRoute}` : "/";
  /** In-project: project overview. No project in URL: home / last-project shortcut (distinct from “Projects” list). */
  const navContextLabel = projectIdInRoute !== undefined ? "Overview" : "Resume";
  const navContextTitle =
    projectIdInRoute === undefined
      ? location.pathname === "/projects"
        ? "Opens home, then your last project if saved; otherwise back to this list."
        : undefined
      : "Project overview";
  const navContextClassName =
    projectIdInRoute !== undefined
      ? "projects-nav-context-link"
      : ["projects-nav-place-link", !onProjectsRouteSubtree ? "projects-nav-place-link--current" : ""].filter(Boolean).join(" ");
  const navPlaceAriaLabel =
    projectIdInRoute === undefined && location.pathname === "/projects"
      ? "Resume last project or return via home"
      : undefined;
  const navContextAriaCurrent =
    projectIdInRoute === undefined
      ? location.pathname === "/"
        ? "page"
        : undefined
      : location.pathname === `/projects/${projectIdInRoute}`
        ? "page"
        : location.pathname.startsWith(`/projects/${projectIdInRoute}/`)
          ? "true"
          : undefined;

  return (
    <div data-testid="app-root" style={{ minHeight: "100vh", width: "100%" }}>
      <a href="#main-content" className="skip-to-main" data-testid="skip-to-main">
        Skip to main content
      </a>

      <YStack
        minHeight="100vh"
        width="100%"
        maxWidth="100%"
        backgroundColor="$background"
        paddingHorizontal="$4"
        paddingVertical="$3"
        gap="$2"
      >
        <XStack width="100%" alignItems="center" flexWrap="wrap" gap="$3" rowGap="$1">
          <Text flexShrink={0} fontSize="$7" fontWeight="700" color="$color12" letterSpacing={-0.5}>
            TCMS
          </Text>
          <Paragraph
            flex={1}
            flexBasis={280}
            margin={0}
            minWidth={0}
            size="$2"
            color="$color11"
            textAlign="right"
          >
            Local test case management
          </Paragraph>
        </XStack>

        {transportMessage !== null && (
          <YStack
            role="alert"
            data-testid="shell-transport-error"
            padding="$3"
            borderRadius="$3"
            backgroundColor="$red2"
            borderWidth={1}
            borderColor="$red6"
          >
            <Paragraph margin={0} color="$red11" size="$3">
              {transportMessage}
            </Paragraph>
          </YStack>
        )}

        {payloadAppError !== null && (
          <YStack
            role="alert"
            data-testid="shell-app-error"
            padding="$3"
            borderRadius="$3"
            backgroundColor="$yellow2"
            borderWidth={1}
            borderColor="$yellow6"
            gap="$2"
          >
            <Text
              fontFamily="$mono"
              fontSize="$2"
              fontWeight="600"
              color="$color12"
              data-testid="shell-app-error-code"
            >
              {payloadAppError.code}
            </Text>
            <Paragraph margin={0} data-testid="shell-app-error-message" size="$3">
              {payloadAppError.message}
            </Paragraph>
            <Paragraph margin={0} size="$3" color="$color10" data-testid="shell-app-error-fixhint">
              {payloadAppError.fixHint}
            </Paragraph>
            {payloadAppError.context != null && payloadAppError.context !== "" && (
              <Text
                fontFamily="$mono"
                fontSize="$2"
                overflow="scroll"
                data-testid="shell-app-error-context"
                userSelect="text"
              >
                {payloadAppError.context}
              </Text>
            )}
          </YStack>
        )}

        <XStack
          width="100%"
          flexWrap="wrap"
          alignItems="flex-end"
          justifyContent="space-between"
          gap="$3"
          paddingVertical="$2"
          borderTopWidth={1}
          borderBottomWidth={1}
          borderColor="$borderColor"
          marginBottom="$1"
          role="navigation"
          aria-label="Project list, workspace, and picker"
        >
          <XStack gap="$3" alignItems="center" flexWrap="wrap" flexShrink={0} minWidth={0}>
            {location.pathname === "/projects" && projectIdInRoute === undefined ? (
              <span id="nav-resume-crumb-desc" className="sr-only">
                Goes to home, then opens your last saved project, or returns to this list if none is saved.
              </span>
            ) : null}
            <RouterLink
              to={navContextHref}
              data-testid="nav-shell-crumb"
              className={navContextClassName}
              title={navContextTitle}
              aria-label={navPlaceAriaLabel}
              aria-describedby={
                location.pathname === "/projects" && projectIdInRoute === undefined
                  ? "nav-resume-crumb-desc"
                  : undefined
              }
              aria-current={navContextAriaCurrent}
              style={{ color: "var(--tcms-text)" }}
            >
              {navContextLabel}
            </RouterLink>
            <ProjectsNavDropdown projectsListPageActive={projectsListPageActive} />
          </XStack>
          <XStack flex={1} minWidth={0} justifyContent="flex-end" alignItems="center" gap="$2" flexShrink={1}>
            <ProjectPicker />
            <XStack gap="$1" alignItems="center" flexShrink={0} className="shell-settings-cluster">
              <ShellDatabaseMenu />
              <ShellAccountMenu />
            </XStack>
          </XStack>
        </XStack>
        <main id="main-content" tabIndex={-1} style={{ outline: "none", width: "100%", paddingBottom: "1.5rem" }}>
          {workspaceChrome !== null ? (
            <XStack
              role="group"
              aria-label="Project workspace"
              alignItems="flex-end"
              justifyContent="space-between"
              flexWrap="wrap"
              gap="$3"
              width="100%"
              paddingBottom="$2"
              marginBottom="$2"
              borderBottomWidth={1}
              borderColor="$borderColor"
              className="workspace-shell-chrome"
            >
              {workspaceChrome.titleId !== undefined ? (
                <H2
                  id={workspaceChrome.titleId}
                  size="$6"
                  fontWeight="700"
                  color="$color12"
                  margin={0}
                  flexShrink={0}
                  textTransform="none"
                >
                  {workspaceChrome.title}
                </H2>
              ) : (
                <H2 size="$6" fontWeight="700" color="$color12" margin={0} flexShrink={0} textTransform="none">
                  {workspaceChrome.title}
                </H2>
              )}
              <div className="project-detail-header-links workspace-shell-chrome-nav">
                <ProjectSubNav projectId={workspaceChrome.projectId} active={workspaceChrome.active} />
              </div>
            </XStack>
          ) : null}
          <YStack flex={1} gap="$3">
            <RouteErrorBoundary>
              <Outlet context={workspaceOutletContext} />
            </RouteErrorBoundary>
          </YStack>
        </main>
      </YStack>
    </div>
  );
}
