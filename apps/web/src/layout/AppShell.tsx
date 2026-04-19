import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Paragraph, Text, XStack, YStack } from "tamagui";
import { ProjectPicker } from "../components/ProjectPicker";
import { writeLastProjectPath } from "../navigation/lastProjectPath";
import { RouterLink } from "../tamagui/RouterLink";
import { useShellErrors } from "../shell/ShellErrorsContext";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

export function AppShell() {
  const location = useLocation();
  const { transportMessage, payloadAppError } = useShellErrors();

  useEffect(() => {
    writeLastProjectPath(location.pathname);
  }, [location.pathname]);

  return (
    <div data-testid="app-root" style={{ minHeight: "100vh", width: "100%" }}>
      <a href="#main-content" className="skip-to-main" data-testid="skip-to-main">
        Skip to main content
      </a>

      <YStack
        minHeight="100vh"
        backgroundColor="$background"
        maxWidth={1120}
        marginHorizontal="auto"
        paddingHorizontal="$4"
        paddingVertical="$5"
        gap="$3"
      >
        <YStack gap="$1">
          <Text fontSize="$8" fontWeight="700" color="$color12">
            TCMS
          </Text>
          <Paragraph margin={0} size="$3" color="$color11">
            Local Test Case Management
          </Paragraph>
        </YStack>

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
          flexWrap="wrap"
          alignItems="flex-end"
          justifyContent="space-between"
          gap="$3"
          marginBottom="$2"
          role="navigation"
          aria-label="Main"
        >
          <XStack gap="$3" alignItems="center" flexWrap="wrap">
            <RouterLink to="/" data-testid="nav-home">
              Home
            </RouterLink>
            <XStack gap="$1" alignItems="center" aria-label="Projects">
              <RouterLink to="/projects" data-testid="nav-projects">
                Projects
              </RouterLink>
              <Text fontSize="$2" color="$color10" userSelect="none">
                ›
              </Text>
              <RouterLink to="/projects?new=1" data-testid="nav-projects-new">
                New
              </RouterLink>
            </XStack>
          </XStack>
          <ProjectPicker />
        </XStack>
        <main id="main-content" tabIndex={-1} style={{ outline: "none", width: "100%", paddingBottom: "1.5rem" }}>
          <YStack flex={1} gap="$3">
            <RouteErrorBoundary>
              <Outlet />
            </RouteErrorBoundary>
          </YStack>
        </main>
      </YStack>
    </div>
  );
}
