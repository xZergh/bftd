import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, H2, H3, Input, Label, Paragraph, Switch, XStack, YStack } from "tamagui";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  ArchiveProjectMutation,
  CreateProjectMutation,
  ProjectsListQuery,
  UpdateProjectMutation
} from "../graphql/documents";
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

function initialProjectCreateFields(): { name: string; key: string; description: string } {
  const d = readCreateProjectDraft();
  return { name: d?.name ?? "", key: d?.key ?? "", description: d?.description ?? "" };
}

function ArchiveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RestoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M12 5V1L7 6l5 5V7c2.76 0 5 2.24 5 5 0 2.64-2.05 4.78-4.65 4.96A5 5 0 0 1 7 12H5a7 7 0 0 0 7 7c3.87 0 7-3.13 7-7s-3.13-7-7-7z" />
    </svg>
  );
}

export function ProjectsListPage() {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [searchParams, setSearchParams] = useSearchParams();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const initial = initialProjectCreateFields();
  const [name, setName] = useState(initial.name);
  const [key, setKey] = useState(initial.key);
  const [description, setDescription] = useState(initial.description);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const [unlockedId, setUnlockedId] = useState<string | null>(null);
  const [nameDraftEdit, setNameDraftEdit] = useState("");

  const [listResult, reexecuteList] = useQuery({
    query: ProjectsListQuery,
    variables: { includeArchived },
    requestPolicy: "network-only"
  });

  const [, createProject] = useMutation(CreateProjectMutation);
  const [, updateProject] = useMutation(UpdateProjectMutation);
  const [, archiveProject] = useMutation(ArchiveProjectMutation);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateModalOpen(true);
    }
  }, [searchParams]);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("new");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const cancelDraftWrite = useDebouncedAutosaveEffect(
    name !== "" || key !== "" || description !== "",
    `${name}\0${key}\0${description}`,
    () => {
      writeCreateProjectDraft(name, key, description);
    },
    LOCAL_CREATE_DRAFT_DEBOUNCE_MS
  );

  useEffect(() => {
    if (name !== "" || key !== "" || description !== "") {
      return;
    }
    clearCreateProjectDraft();
  }, [name, key, description]);

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
    const trimmedDesc = description.trim();
    return {
      mutation: "CreateProject",
      variables: {
        name: trimmedName.length > 0 ? trimmedName : null,
        key: trimmedKey.length > 0 ? trimmedKey : undefined,
        description: trimmedDesc.length > 0 ? trimmedDesc : null
      }
    };
  }, [description, key, name]);

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
    const trimmedDesc = description.trim();
    const res = await createProject({
      name: trimmedName,
      key: trimmedKey === "" ? undefined : trimmedKey,
      description: trimmedDesc === "" ? null : trimmedDesc
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
    setDescription("");
    clearCreateProjectDraft();
    setShowValidationPayload(false);
    closeCreateModal();
    reexecuteList({ requestPolicy: "network-only" });
  }, [
    cancelDraftWrite,
    clearShellMessages,
    closeCreateModal,
    createProject,
    description,
    key,
    name,
    reexecuteList,
    setPayloadAppError,
    setTransportMessage
  ]);

  const projects: ProjectListItem[] = listResult.data?.projects ?? [];

  const editingProject = useMemo(
    () => (unlockedId === null ? null : projects.find((p) => p.id === unlockedId) ?? null),
    [projects, unlockedId]
  );

  const saveRowName = useCallback(
    async (id: string, nm: string): Promise<boolean> => {
      clearShellMessages();
      const res = await updateProject({ id, name: nm });
      if (res.error) {
        const parts = [
          ...res.error.graphQLErrors.map((e) => e.message),
          res.error.networkError?.message
        ].filter(Boolean);
        setTransportMessage(parts.join("; ") || "Request failed");
        return false;
      }
      const appErr = res.data?.updateProject?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        return false;
      }
      reexecuteList({ requestPolicy: "network-only" });
      return true;
    },
    [clearShellMessages, reexecuteList, setPayloadAppError, setTransportMessage, updateProject]
  );

  const nameRowDirty =
    unlockedId !== null &&
    editingProject !== null &&
    trimmedNonEmpty(nameDraftEdit.trim()) &&
    nameDraftEdit.trim() !== editingProject.name;

  const cancelRowAutosave = useDebouncedAutosaveEffect(
    Boolean(nameRowDirty),
    `${unlockedId ?? ""}\0${nameDraftEdit}`,
    () => {
      if (unlockedId === null) {
        return;
      }
      void saveRowName(unlockedId, nameDraftEdit.trim());
    }
  );

  const onUnlockName = useCallback((p: ProjectListItem) => {
    setUnlockedId(p.id);
    setNameDraftEdit(p.name);
  }, []);

  const onLockName = useCallback(async () => {
    cancelRowAutosave();
    if (unlockedId !== null && nameRowDirty) {
      const ok = await saveRowName(unlockedId, nameDraftEdit.trim());
      if (!ok) {
        return;
      }
    }
    setUnlockedId(null);
    setNameDraftEdit("");
  }, [cancelRowAutosave, nameRowDirty, nameDraftEdit, saveRowName, unlockedId]);

  const onArchiveToggleRow = useCallback(
    async (p: ProjectListItem, archived: boolean) => {
      clearShellMessages();
      const res = await archiveProject({ id: p.id, archived });
      if (res.error) {
        const parts = [
          ...res.error.graphQLErrors.map((e) => e.message),
          res.error.networkError?.message
        ].filter(Boolean);
        setTransportMessage(parts.join("; ") || "Request failed");
        return;
      }
      const appErr = res.data?.archiveProject?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        return;
      }
      if (unlockedId === p.id) {
        setUnlockedId(null);
        setNameDraftEdit("");
      }
      reexecuteList({ requestPolicy: "network-only" });
    },
    [archiveProject, clearShellMessages, reexecuteList, setPayloadAppError, setTransportMessage, unlockedId]
  );

  return (
    <section aria-labelledby="projects-heading">
      <div data-testid="projects-page">
        <YStack gap="$4" maxWidth="100%">
          <H2 id="projects-heading" size="$7" fontWeight="700" color="$color12">
            Projects
          </H2>

          {createModalOpen ? (
            <div
              className="projects-modal-backdrop"
              role="presentation"
              data-testid="project-create-dialog"
              onClick={closeCreateModal}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  closeCreateModal();
                }
              }}
            >
              <div
                className="projects-create-dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="project-create-dialog-title"
                onClick={(e) => e.stopPropagation()}
              >
              <YStack gap="$3" padding="$1">
                <H3 id="project-create-dialog-title" className="projects-subheading" size="$5" fontWeight="600" margin={0} color="$color12">
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
                      <Paragraph
                        id="project-create-name-err"
                        role="alert"
                        data-testid="project-create-name-error"
                        margin={0}
                        size="$2"
                        color="$red10"
                      >
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
                  <Label htmlFor="project-create-description">
                    <Paragraph margin={0} size="$2" color="$color11">
                      Description <span style={{ fontWeight: "normal", color: "#666" }}>(optional)</span>
                    </Paragraph>
                    <textarea
                      id="project-create-description"
                      className="projects-modal-textarea"
                      value={description}
                      rows={3}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        setShowValidationPayload(false);
                      }}
                      data-testid="project-create-description"
                      autoComplete="off"
                    />
                  </Label>
                </YStack>
                <ValidationErrorPayloadPreview open={showValidationPayload} payload={createProjectClientPayload} />
                <XStack gap="$2" flexWrap="wrap">
                  <button type="button" className="projects-modal-primary-button" data-testid="project-create-submit" onClick={() => void onCreate()}>
                    Create
                  </button>
                  <Button size="$3" chromeless type="button" onPress={closeCreateModal} data-testid="project-create-cancel">
                    Cancel
                  </Button>
                </XStack>
              </YStack>
              </div>
            </div>
          ) : null}

          <XStack alignItems="center" gap="$3" flexWrap="wrap" className="projects-list-toolbar">
            <XStack alignItems="center" gap="$2" flexWrap="wrap">
              <Paragraph id="show-archived-label" margin={0} size="$3" color="$color11">
                Show archived
              </Paragraph>
              <Switch
                id="project-list-include-archived"
                checked={includeArchived}
                onCheckedChange={(v) => setIncludeArchived(v === true)}
                aria-labelledby="show-archived-label"
                data-testid="project-list-include-archived-switch"
              />
            </XStack>
            {listResult.fetching && <PageLoading inline dataTestId="projects-list-loading" />}
          </XStack>

          {projects.length === 0 && !listResult.fetching ? (
            <Paragraph margin={0} data-testid="projects-list-empty" color="$color10" size="$3">
              No projects yet. Use Projects › New to create one.
            </Paragraph>
          ) : (
            <YStack overflow="scroll" borderWidth={1} borderColor="$borderColor" borderRadius="$4">
              <table className="projects-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Description</th>
                    {includeArchived ? <th scope="col">Status</th> : null}
                    <th scope="col" className="projects-table-actions-col">
                      {" "}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} data-project-key={p.key} data-testid="project-row">
                      <td className="projects-table-name-cell">
                        {unlockedId === p.id ? (
                          <Input
                            size="$3"
                            value={nameDraftEdit}
                            onChangeText={(t) => setNameDraftEdit(t)}
                            aria-label={`Edit name for ${p.name}`}
                            data-testid="project-row-name-input"
                          />
                        ) : (
                          <RouterLink to={`/projects/${p.id}`} data-testid="project-name-link">
                            {p.name}
                          </RouterLink>
                        )}
                      </td>
                      <td className="projects-table-desc-cell">
                        <span title={p.description ?? undefined}>{p.description ?? "—"}</span>
                      </td>
                      {includeArchived ? (
                        <td>
                          {p.isArchived ? (
                            <span className="badge archived" data-testid="project-archived-badge">
                              Archived
                            </span>
                          ) : (
                            <span className="badge active">Active</span>
                          )}
                        </td>
                      ) : null}
                      <td className="projects-table-actions-cell">
                        <XStack gap="$2" alignItems="center" flexWrap="wrap" justifyContent="flex-end">
                          <Button
                            size="$2"
                            chromeless
                            aria-label={
                              unlockedId === p.id
                                ? `Lock name edit for ${p.name}`
                                : `Unlock name edit for ${p.name}`
                            }
                            onPress={() => {
                              if (unlockedId === p.id) {
                                void onLockName();
                              } else {
                                void onUnlockName(p);
                              }
                            }}
                            data-testid={`project-name-edit-${p.id}`}
                          >
                            {unlockedId === p.id ? "Lock" : "Edit"}
                          </Button>
                          {p.isArchived ? (
                            <button
                              type="button"
                              className="projects-icon-button"
                              aria-label="Restore project"
                              data-testid="project-restore-row"
                              onClick={() => void onArchiveToggleRow(p, false)}
                            >
                              <RestoreIcon />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="projects-icon-button"
                              aria-label="Archive project"
                              data-testid="project-archive-row"
                              onClick={() => void onArchiveToggleRow(p, true)}
                            >
                              <ArchiveIcon />
                            </button>
                          )}
                        </XStack>
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
