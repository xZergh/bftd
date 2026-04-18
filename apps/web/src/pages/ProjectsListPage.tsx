import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, H2, H3, Input, Label, Paragraph, XStack, YStack } from "tamagui";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { CreateProjectMutation, ProjectsListQuery } from "../graphql/documents";
import {
  clearCreateProjectDraft,
  LOCAL_CREATE_DRAFT_DEBOUNCE_MS,
  readCreateProjectDraft,
  writeCreateProjectDraft
} from "../forms/localCreateDraftStorage";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { ProjectListItem } from "../graphql/types";
import { useDebouncedAutosaveEffect } from "../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

function initialProjectCreateFields(): { name: string; key: string } {
  const d = readCreateProjectDraft();
  return { name: d?.name ?? "", key: d?.key ?? "" };
}

export function ProjectsListPage() {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [includeArchived, setIncludeArchived] = useState(false);
  const initial = initialProjectCreateFields();
  const [name, setName] = useState(initial.name);
  const [key, setKey] = useState(initial.key);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const [listResult, reexecuteList] = useQuery({
    query: ProjectsListQuery,
    variables: { includeArchived },
    requestPolicy: "network-only"
  });

  const [, createProject] = useMutation(CreateProjectMutation);

  const cancelDraftWrite = useDebouncedAutosaveEffect(
    name !== "" || key !== "",
    `${name}\0${key}`,
    () => {
      writeCreateProjectDraft(name, key);
    },
    LOCAL_CREATE_DRAFT_DEBOUNCE_MS
  );

  useEffect(() => {
    if (name !== "" || key !== "") {
      return;
    }
    clearCreateProjectDraft();
  }, [name, key]);

  useEffect(() => {
    if (!listResult.error) {
      return;
    }
    const err = listResult.error;
    queueMicrotask(() => {
      const g = err.graphQLErrors.map((e) => e.message);
      const n = err.networkError?.message;
      const text = [...g, n].filter(Boolean).join("; ");
      setTransportMessage(text.length > 0 ? text : "Request failed");
    });
  }, [listResult.error, setTransportMessage]);

  const createProjectClientPayload = useMemo(() => {
    const trimmedName = name.trim();
    const trimmedKey = key.trim();
    return {
      mutation: "CreateProject",
      variables: {
        name: trimmedName.length > 0 ? trimmedName : null,
        key: trimmedKey.length > 0 ? trimmedKey : undefined
      }
    };
  }, [key, name]);

  const onCreate = useCallback(async () => {
    cancelDraftWrite();
    clearShellMessages();
    const trimmedName = name.trim();
    if (!trimmedNonEmpty(trimmedName)) {
      setNameError(REQUIRED_MSG);
      setShowValidationPayload(true);
      return;
    }
    setNameError(null);
    setShowValidationPayload(false);
    const trimmedKey = key.trim();
    const res = await createProject({
      name: trimmedName,
      key: trimmedKey === "" ? undefined : trimmedKey
    });
    if (res.error) {
      const parts = [
        ...res.error.graphQLErrors.map((e) => e.message),
        res.error.networkError?.message
      ].filter(Boolean);
      setTransportMessage(parts.join("; ") || "Request failed");
      return;
    }
    const appErr = res.data?.createProject?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setName("");
    setKey("");
    clearCreateProjectDraft();
    setShowValidationPayload(false);
    reexecuteList({ requestPolicy: "network-only" });
  }, [
    cancelDraftWrite,
    clearShellMessages,
    createProject,
    key,
    name,
    reexecuteList,
    setPayloadAppError,
    setTransportMessage
  ]);

  const projects: ProjectListItem[] = listResult.data?.projects ?? [];

  return (
    <section aria-labelledby="projects-heading">
      <div data-testid="projects-page">
      <YStack gap="$4" maxWidth="100%">
        <H2 id="projects-heading" size="$7" fontWeight="700" color="$color12">
          Projects
        </H2>

        <YStack
          data-testid="project-create-panel"
          padding="$4"
          borderWidth={1}
          borderColor="$borderColor"
          borderRadius="$4"
          backgroundColor="$background"
          gap="$3"
        >
          <H3 className="projects-subheading" size="$5" fontWeight="600" margin={0} color="$color12">
            New project
          </H3>
          <YStack gap="$3" className="projects-create-fields">
            <Label htmlFor="project-create-name">
              <Paragraph margin={0} size="$2" color="$color11">
                Name <span style={{ color: "#b42318", fontWeight: 600 }}>*</span>
              </Paragraph>
              <Input
                id="project-create-name"
                size="$4"
                maxWidth={384}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  setNameError(null);
                  setShowValidationPayload(false);
                }}
                data-testid="project-create-name"
                autoComplete="off"
                aria-invalid={nameError !== null}
                aria-describedby={nameError !== null ? "project-create-name-err" : undefined}
              />
              {nameError !== null && (
                <Paragraph id="project-create-name-err" role="alert" data-testid="project-create-name-error" margin={0} size="$2" color="$red10">
                  {nameError}
                </Paragraph>
              )}
            </Label>
            <Label htmlFor="project-create-key">
              <Paragraph margin={0} size="$2" color="$color11">
                Key <span style={{ fontWeight: "normal", color: "#666" }}>(optional)</span>
              </Paragraph>
              <Input
                id="project-create-key"
                size="$4"
                maxWidth={384}
                value={key}
                onChangeText={(t) => {
                  setKey(t);
                  setShowValidationPayload(false);
                }}
                data-testid="project-create-key"
                autoComplete="off"
              />
            </Label>
          </YStack>
          <ValidationErrorPayloadPreview open={showValidationPayload} payload={createProjectClientPayload} />
          <Button size="$3" onPress={onCreate} data-testid="project-create-submit">
            Create
          </Button>
        </YStack>

        <XStack alignItems="center" gap="$3" flexWrap="wrap" className="projects-list-toolbar">
          <label className="projects-checkbox-label" htmlFor="project-list-include-archived">
            <input
              id="project-list-include-archived"
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
              data-testid="project-list-include-archived"
            />
            Show archived
          </label>
          {listResult.fetching && <PageLoading inline dataTestId="projects-list-loading" />}
        </XStack>

        {projects.length === 0 && !listResult.fetching ? (
          <Paragraph margin={0} data-testid="projects-list-empty" color="$color10" size="$3">
            No projects yet. Create one above.
          </Paragraph>
        ) : (
          <YStack overflow="scroll" borderWidth={1} borderColor="$borderColor" borderRadius="$4">
            <table className="projects-table">
              <thead>
                <tr>
                  <th scope="col">Name</th>
                  <th scope="col">Key</th>
                  <th scope="col">Status</th>
                  <th scope="col"> </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} data-project-key={p.key} data-testid="project-row">
                    <td>{p.name}</td>
                    <td>
                      <code>{p.key}</code>
                    </td>
                    <td>
                      {p.isArchived ? (
                        <span className="badge archived" data-testid="project-archived-badge">
                          Archived
                        </span>
                      ) : (
                        <span className="badge active">Active</span>
                      )}
                    </td>
                    <td>
                      <RouterLink to={`/projects/${p.id}`} data-testid="project-open">
                        Open
                      </RouterLink>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </YStack>
        )}
      </YStack>
      </div>
    </section>
  );
}
