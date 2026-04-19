import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button, H2, H3, Input, Label, Paragraph, XStack, YStack } from "tamagui";
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

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M7 11V7a5 5 0 0 1 10 0v4M6 11h12v10H6z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type SortKey = "name" | "description" | "status";
type SortDir = "asc" | "desc";

function compareProjects(a: ProjectListItem, b: ProjectListItem, key: SortKey, dir: SortDir): number {
  const m = dir === "asc" ? 1 : -1;
  if (key === "name") {
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * m;
  }
  if (key === "description") {
    return (a.description ?? "").localeCompare(b.description ?? "", undefined, { sensitivity: "base" }) * m;
  }
  const sa = a.isArchived ? 1 : 0;
  const sb = b.isArchived ? 1 : 0;
  if (sa !== sb) {
    return (sa - sb) * m;
  }
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" }) * m;
}

type RowEdit = { id: string; name: string; description: string };

export function ProjectsListPage() {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [searchParams, setSearchParams] = useSearchParams();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const initial = initialProjectCreateFields();
  const [name, setName] = useState(initial.name);
  const [key, setKey] = useState(initial.key);
  const [description, setDescription] = useState(initial.description);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const [rowEdit, setRowEdit] = useState<RowEdit | null>(null);

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

  const projectsRaw: ProjectListItem[] = listResult.data?.projects ?? [];

  const sortedProjects = useMemo(() => {
    const copy = [...projectsRaw];
    copy.sort((a, b) => compareProjects(a, b, sortKey, sortDir));
    return copy;
  }, [projectsRaw, sortKey, sortDir]);

  const editingProject = useMemo(
    () => (rowEdit === null ? null : projectsRaw.find((p) => p.id === rowEdit.id) ?? null),
    [projectsRaw, rowEdit]
  );

  const saveRowPatch = useCallback(async (): Promise<boolean> => {
    if (rowEdit === null || editingProject === null || rowEdit.id !== editingProject.id) {
      return false;
    }
    const nm = rowEdit.name.trim();
    if (!trimmedNonEmpty(nm)) {
      return false;
    }
    const descTrim = rowEdit.description.trim();
    const nameDirty = nm !== editingProject.name;
    const descDirty = descTrim !== (editingProject.description ?? "").trim();
    if (!nameDirty && !descDirty) {
      return true;
    }
    clearShellMessages();
    const res = await updateProject({
      id: rowEdit.id,
      ...(nameDirty ? { name: nm } : {}),
      ...(descDirty ? { description: descTrim === "" ? null : descTrim } : {})
    });
    if (res.error) {
      const parts = [
        ...res.error.graphQLErrors.map((e) => e.message),
        res.error.networkError?.message
      ].filter(Boolean);
      setTransportMessage(parts.length > 0 ? parts.join("; ") : "Request failed");
      return false;
    }
    const appErr = res.data?.updateProject?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return false;
    }
    reexecuteList({ requestPolicy: "network-only" });
    return true;
  }, [clearShellMessages, editingProject, reexecuteList, rowEdit, setPayloadAppError, setTransportMessage, updateProject]);

  const nameDirty =
    rowEdit !== null &&
    editingProject !== null &&
    trimmedNonEmpty(rowEdit.name.trim()) &&
    rowEdit.name.trim() !== editingProject.name;

  const descDirty =
    rowEdit !== null &&
    editingProject !== null &&
    rowEdit.description.trim() !== (editingProject.description ?? "").trim();

  const rowPatchDirty = Boolean(nameDirty || descDirty) && trimmedNonEmpty(rowEdit?.name.trim() ?? "");

  const cancelRowAutosave = useDebouncedAutosaveEffect(
    rowPatchDirty,
    `${rowEdit?.id ?? ""}\0${rowEdit?.name ?? ""}\0${rowEdit?.description ?? ""}`,
    () => {
      void saveRowPatch();
    }
  );

  const flushRowEdit = useCallback(async (): Promise<boolean> => {
    cancelRowAutosave();
    if (rowEdit === null) {
      return true;
    }
    if (!rowPatchDirty) {
      return true;
    }
    return saveRowPatch();
  }, [cancelRowAutosave, rowEdit, rowPatchDirty, saveRowPatch]);

  const onLockRow = useCallback(async () => {
    const ok = await flushRowEdit();
    if (!ok) {
      return;
    }
    setRowEdit(null);
  }, [flushRowEdit]);

  const onUnlockRow = useCallback(
    async (p: ProjectListItem) => {
      if (rowEdit?.id === p.id) {
        return;
      }
      if (rowEdit !== null) {
        const ok = await flushRowEdit();
        if (!ok) {
          return;
        }
        setRowEdit(null);
      }
      setRowEdit({ id: p.id, name: p.name, description: p.description ?? "" });
    },
    [rowEdit, flushRowEdit]
  );

  const onSortClick = useCallback((key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }, [sortKey]);

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
      if (rowEdit?.id === p.id) {
        setRowEdit(null);
      }
      reexecuteList({ requestPolicy: "network-only" });
    },
    [archiveProject, clearShellMessages, reexecuteList, rowEdit?.id, setPayloadAppError, setTransportMessage]
  );

  const sortIndicator = (key: SortKey) => {
    if (sortKey !== key) {
      return <span className="projects-table-sort-ind projects-table-sort-ind--idle" aria-hidden />;
    }
    return (
      <span className="projects-table-sort-ind" aria-hidden>
        {sortDir === "asc" ? "▲" : "▼"}
      </span>
    );
  };

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
            <label className="projects-show-archived-toggle" htmlFor="project-list-include-archived">
              <span className="projects-show-archived-switch">
                <input
                  id="project-list-include-archived"
                  type="checkbox"
                  checked={includeArchived}
                  onChange={(e) => setIncludeArchived(e.target.checked)}
                  data-testid="project-list-include-archived-switch"
                />
                <span className="projects-show-archived-track" aria-hidden />
                <span className="projects-show-archived-thumb" aria-hidden />
              </span>
              <span className="projects-show-archived-label">Show archived</span>
            </label>
            {listResult.fetching && <PageLoading inline dataTestId="projects-list-loading" />}
          </XStack>

          {projectsRaw.length === 0 && !listResult.fetching ? (
            <Paragraph margin={0} data-testid="projects-list-empty" color="$color10" size="$3">
              No projects yet. Open the Projects menu and choose New project.
            </Paragraph>
          ) : (
            <YStack overflow="scroll" borderWidth={1} borderColor="$borderColor" borderRadius="$4">
              <table className="projects-table">
                <thead>
                  <tr>
                    <th scope="col">
                      <button type="button" className="projects-table-sort-btn" onClick={() => onSortClick("name")}>
                        Name {sortIndicator("name")}
                      </button>
                    </th>
                    <th scope="col">
                      <button type="button" className="projects-table-sort-btn" onClick={() => onSortClick("description")}>
                        Description {sortIndicator("description")}
                      </button>
                    </th>
                    {includeArchived ? (
                      <th scope="col">
                        <button type="button" className="projects-table-sort-btn" onClick={() => onSortClick("status")}>
                          Status {sortIndicator("status")}
                        </button>
                      </th>
                    ) : null}
                    <th scope="col" className="projects-table-actions-col">
                      {" "}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProjects.map((p) => (
                    <tr key={p.id} data-project-key={p.key} data-testid="project-row">
                      <td className="projects-table-name-cell">
                        <XStack alignItems="center" gap="$2" flexWrap="nowrap" maxWidth="100%">
                          <div className="projects-table-name-text" style={{ flex: 1, minWidth: 0 }}>
                            {rowEdit?.id === p.id ? (
                              <Input
                                size="$3"
                                width="100%"
                                value={rowEdit.name}
                                onChangeText={(t) => setRowEdit((re) => (re && re.id === p.id ? { ...re, name: t } : re))}
                                aria-label={`Edit name for ${p.name}`}
                                data-testid="project-row-name-input"
                              />
                            ) : (
                              <RouterLink to={`/projects/${p.id}`} data-testid="project-name-link">
                                {p.name}
                              </RouterLink>
                            )}
                          </div>
                          <button
                            type="button"
                            className="projects-table-inline-icon-btn"
                            aria-label={rowEdit?.id === p.id ? `Save and lock row for ${p.name}` : `Edit ${p.name}`}
                            data-testid={`project-name-edit-${p.id}`}
                            onClick={() => {
                              if (rowEdit?.id === p.id) {
                                void onLockRow();
                              } else {
                                void onUnlockRow(p);
                              }
                            }}
                          >
                            {rowEdit?.id === p.id ? <LockIcon /> : <PencilIcon />}
                          </button>
                        </XStack>
                      </td>
                      <td className="projects-table-desc-cell">
                        {rowEdit?.id === p.id ? (
                          <textarea
                            className="projects-table-desc-input"
                            rows={2}
                            value={rowEdit.description}
                            onChange={(e) =>
                              setRowEdit((re) => (re && re.id === p.id ? { ...re, description: e.target.value } : re))
                            }
                            aria-label={`Edit description for ${p.name}`}
                            data-testid="project-row-description-input"
                          />
                        ) : (
                          <span title={p.description ?? undefined}>{p.description ?? "—"}</span>
                        )}
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
