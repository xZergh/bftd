import { useCallback, useEffect } from "react";
import { Paragraph, XStack, YStack } from "tamagui";
import { useClient, useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { CreateProjectMutation, IntentionallyInvalidQuery, ProjectsQuery } from "../graphql/documents";
import { useShellErrors } from "../shell/ShellErrorsContext";

const DUPLICATE_KEY = "fe-a-shell-dup-key";

export function HomePage() {
  const client = useClient();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [projectResult, reexecuteProjects] = useQuery({
    query: ProjectsQuery,
    pause: true
  });

  const [, createProject] = useMutation(CreateProjectMutation);

  useEffect(() => {
    if (!projectResult.error) {
      return;
    }
    const g = projectResult.error.graphQLErrors.map((e) => e.message);
    const n = projectResult.error.networkError?.message;
    const text = [...g, n].filter(Boolean).join("; ");
    setTransportMessage(text.length > 0 ? text : "Request failed");
  }, [projectResult.error, setTransportMessage]);

  const onLoadProjects = useCallback(() => {
    clearShellMessages();
    reexecuteProjects({ requestPolicy: "network-only" });
  }, [clearShellMessages, reexecuteProjects]);

  const onIntentionalBadQuery = useCallback(async () => {
    clearShellMessages();
    const { error } = await client.query(IntentionallyInvalidQuery, {}).toPromise();
    if (error) {
      const parts = [
        ...error.graphQLErrors.map((e) => e.message),
        error.networkError?.message
      ].filter(Boolean);
      setTransportMessage(parts.join("; ") || "Request failed");
    }
  }, [client, clearShellMessages, setTransportMessage]);

  const onDuplicateProjectKey = useCallback(async () => {
    clearShellMessages();
    const first = await createProject({ name: "FE-A shell first", key: DUPLICATE_KEY });
    if (first.error) {
      const parts = [
        ...first.error.graphQLErrors.map((e) => e.message),
        first.error.networkError?.message
      ].filter(Boolean);
      setTransportMessage(parts.join("; ") || "Request failed");
      return;
    }
    const errPayload = first.data?.createProject?.error;
    if (errPayload) {
      setPayloadAppError(errPayload);
      return;
    }
    const second = await createProject({ name: "FE-A shell second", key: DUPLICATE_KEY });
    if (second.error) {
      const parts = [
        ...second.error.graphQLErrors.map((e) => e.message),
        second.error.networkError?.message
      ].filter(Boolean);
      setTransportMessage(parts.join("; ") || "Request failed");
      return;
    }
    const appErr = second.data?.createProject?.error;
    if (appErr) {
      setPayloadAppError(appErr);
    }
  }, [clearShellMessages, createProject, setPayloadAppError, setTransportMessage]);

  const projectsJson =
    projectResult.data !== undefined ? JSON.stringify(projectResult.data, null, 0) : null;

  return (
    <YStack gap="$3">
      <Paragraph margin={0} size="$3" color="$color11">
        Load data from the API or trigger error paths used by the app shell.
      </Paragraph>

      <YStack data-testid="projects-query-status" aria-live="polite">
        {projectResult.fetching ? <PageLoading inline /> : null}
      </YStack>

      <XStack flexWrap="wrap" gap="$2">
        <button type="button" data-testid="check-api" onClick={onLoadProjects}>
          Load projects
        </button>
        <button type="button" data-testid="trigger-graphql-error" onClick={onIntentionalBadQuery}>
          Trigger GraphQL error
        </button>
        <button type="button" data-testid="trigger-app-error" onClick={onDuplicateProjectKey}>
          Trigger AppError (duplicate key)
        </button>
      </XStack>

      {projectsJson !== null && !projectResult.fetching && projectResult.error === undefined && (
        <pre
          style={{
            margin: 0,
            padding: "0.75rem",
            fontSize: "0.875rem",
            fontFamily: "ui-monospace, monospace",
            borderRadius: 8,
            overflow: "auto",
            backgroundColor: "#f4f4f5"
          }}
          data-testid="api-ok"
        >
          {projectsJson}
        </pre>
      )}
    </YStack>
  );
}
