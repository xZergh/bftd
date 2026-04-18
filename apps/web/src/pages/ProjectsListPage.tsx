import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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
    <section className="projects-page" aria-labelledby="projects-heading" data-testid="projects-page">
      <h2 id="projects-heading">Projects</h2>

      <div className="projects-create" data-testid="project-create-panel">
        <h3 className="projects-subheading">New project</h3>
        <div className="projects-create-fields">
          <label>
            Name <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
                setShowValidationPayload(false);
              }}
              data-testid="project-create-name"
              autoComplete="off"
              required
              aria-invalid={nameError !== null}
              aria-describedby={nameError !== null ? "project-create-name-err" : undefined}
            />
            {nameError !== null && (
              <p id="project-create-name-err" className="field-error" role="alert" data-testid="project-create-name-error">
                {nameError}
              </p>
            )}
          </label>
          <label>
            Key <span className="hint">(optional)</span>
            <input
              type="text"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setShowValidationPayload(false);
              }}
              data-testid="project-create-key"
              autoComplete="off"
            />
          </label>
        </div>
        <ValidationErrorPayloadPreview open={showValidationPayload} payload={createProjectClientPayload} />
        <button type="button" onClick={onCreate} data-testid="project-create-submit">
          Create
        </button>
      </div>

      <div className="projects-list-toolbar">
        <label className="projects-checkbox-label">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(e) => setIncludeArchived(e.target.checked)}
            data-testid="project-list-include-archived"
          />
          Show archived
        </label>
        {listResult.fetching && <PageLoading inline dataTestId="projects-list-loading" />}
      </div>

      {projects.length === 0 && !listResult.fetching ? (
        <p className="projects-empty" data-testid="projects-list-empty">
          No projects yet. Create one above.
        </p>
      ) : (
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
                  <Link to={`/projects/${p.id}`} data-testid="project-open">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
