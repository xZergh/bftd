import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  ArchiveProjectMutation,
  ProjectByIdQuery,
  UpdateProjectMutation
} from "../graphql/documents";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import { useDebouncedAutosaveEffect } from "../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

type ProjectBaseline = { name: string; keyNew: string };

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [nameDraft, setNameDraft] = useState("");
  const [keyNewDraft, setKeyNewDraft] = useState("");
  const [baseline, setBaseline] = useState<ProjectBaseline | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);
  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);

  const [detailResult, reexecuteDetail] = useQuery({
    query: ProjectByIdQuery,
    variables: { id: projectId ?? "" },
    pause: projectId === undefined || projectId === ""
  });

  const [, updateProject] = useMutation(UpdateProjectMutation);
  const [, archiveProject] = useMutation(ArchiveProjectMutation);

  const project = detailResult.data?.project;

  /**
   * Hydrate when opening a project (`projectId` / `project.id`), not when `project` is replaced by refetch.
   */
  useEffect(() => {
    if (projectId === undefined || projectId === "") {
      return;
    }
    if (project === undefined || project === null || project.id !== projectId) {
      return;
    }
    setNameDraft(project.name);
    setKeyNewDraft("");
    setBaseline({ name: project.name, keyNew: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-hydrate on navigation / entity id, not refetch
  }, [projectId, project?.id]);

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    const g = detailResult.error.graphQLErrors.map((e) => e.message);
    const n = detailResult.error.networkError?.message;
    const text = [...g, n].filter(Boolean).join("; ");
    setTransportMessage(text.length > 0 ? text : "Request failed");
  }, [detailResult.error, setTransportMessage]);

  const dirty =
    baseline !== null &&
    (nameDraft.trim() !== baseline.name || keyNewDraft.trim() !== baseline.keyNew);
  const canAutosave = trimmedNonEmpty(nameDraft.trim());

  const updateProjectClientPayload = useMemo(() => {
    const nm = nameDraft.trim();
    const kn = keyNewDraft.trim();
    return {
      mutation: "UpdateProject",
      variables: {
        id: projectId ?? null,
        name: nm.length > 0 ? nm : null,
        keyNew: kn.length > 0 ? kn : undefined
      }
    };
  }, [keyNewDraft, nameDraft, projectId]);

  const performSave = useCallback(
    async (validateClient: boolean): Promise<boolean> => {
      if (projectId === undefined || projectId === "") {
        return false;
      }
      const nm = nameDraft.trim();
      if (!trimmedNonEmpty(nm)) {
        if (validateClient) {
          clearShellMessages();
          setNameError(REQUIRED_MSG);
          setShowValidationPayload(true);
        }
        return false;
      }
      if (validateClient) {
        clearShellMessages();
        setNameError(null);
        setShowValidationPayload(false);
      }
      setSavePhase("saving");
      const kn = keyNewDraft.trim();
      const res = await updateProject({
        id: projectId,
        name: nm || undefined,
        keyNew: kn === "" ? undefined : kn
      });
      setSavePhase("idle");
      if (res.error) {
        const parts = [
          ...res.error.graphQLErrors.map((e) => e.message),
          res.error.networkError?.message
        ].filter(Boolean);
        setTransportMessage(parts.join("; ") || "Request failed");
        setFailBump((n) => n + 1);
        return false;
      }
      const appErr = res.data?.updateProject?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        setFailBump((n) => n + 1);
        return false;
      }
      const p = res.data?.updateProject?.project;
      if (p !== undefined && p !== null) {
        setBaseline({ name: p.name, keyNew: "" });
      }
      setKeyNewDraft("");
      reexecuteDetail({ requestPolicy: "network-only" });
      return true;
    },
    [
      clearShellMessages,
      keyNewDraft,
      nameDraft,
      projectId,
      reexecuteDetail,
      setPayloadAppError,
      setTransportMessage,
      updateProject
    ]
  );

  const autosaveResetKey = `${nameDraft}\0${keyNewDraft}\0${failBump}`;
  const cancelAutosave = useDebouncedAutosaveEffect(
    dirty && canAutosave,
    autosaveResetKey,
    () => {
      void performSave(false);
    }
  );

  const onSaveClick = useCallback(() => {
    cancelAutosave();
    void performSave(true);
  }, [cancelAutosave, performSave]);

  const saveState =
    savePhase === "saving" ? "saving" : dirty ? "unsaved" : "saved";
  const saveStatusLabel =
    savePhase === "saving" ? "Saving…" : dirty ? "Unsaved changes" : "All changes saved";

  const setArchived = useCallback(
    async (archived: boolean) => {
      if (projectId === undefined || projectId === "") {
        return;
      }
      clearShellMessages();
      const res = await archiveProject({ id: projectId, archived });
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
      navigate("/projects");
    },
    [archiveProject, clearShellMessages, navigate, projectId, setPayloadAppError, setTransportMessage]
  );

  if (projectId === undefined || projectId === "") {
    return null;
  }

  if (!detailResult.fetching && detailResult.data !== undefined && project === null) {
    return (
      <section className="projects-page" data-testid="project-not-found">
        <h2>Project not found</h2>
        <p>No project matches this id.</p>
        <RouterLink to="/projects">Back to projects</RouterLink>
      </section>
    );
  }

  if (project === undefined || project === null) {
    return (
      <section className="projects-page" data-testid="project-detail-loading">
        <PageLoading />
      </section>
    );
  }

  return (
    <section className="projects-page" data-testid="project-detail-page">
      <div className="project-detail-header">
        <h2 id="project-detail-heading">Project</h2>
        <div className="project-detail-header-links">
          <RouterLink to="/projects" data-testid="project-back-to-list">
            ← All projects
          </RouterLink>
          <RouterLink to={`/projects/${projectId}/requirements`} data-testid="project-nav-requirements">
            Requirements
          </RouterLink>
          <RouterLink to={`/projects/${projectId}/test-cases`} data-testid="project-nav-test-cases">
            Test cases
          </RouterLink>
          <RouterLink to={`/projects/${projectId}/runs`} data-testid="project-nav-runs">
            Runs
          </RouterLink>
          <RouterLink to={`/projects/${projectId}/reporting`} data-testid="project-nav-reporting">
            Reporting
          </RouterLink>
          <RouterLink to={`/projects/${projectId}/imports`} data-testid="project-nav-imports">
            Imports
          </RouterLink>
          <RouterLink to={`/projects/${projectId}/design-links`} data-testid="project-nav-design-links">
            Design links
          </RouterLink>
        </div>
      </div>

      <dl className="project-detail-meta">
        <div>
          <dt>Key</dt>
          <dd>
            <code data-testid="project-detail-key">{project.key}</code>
          </dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd data-testid="project-detail-status">
            {project.isArchived ? "Archived" : "Active"}
          </dd>
        </div>
      </dl>

      <div className="projects-create project-detail-edit">
        <h3 className="projects-subheading">Edit</h3>
        <div className="projects-create-fields">
          <label>
            Name <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => {
                setNameDraft(e.target.value);
                setNameError(null);
                setShowValidationPayload(false);
              }}
              data-testid="project-edit-name"
              required
              aria-invalid={nameError !== null}
              aria-describedby={nameError !== null ? "project-edit-name-err" : undefined}
            />
            {nameError !== null && (
              <p id="project-edit-name-err" className="field-error" role="alert" data-testid="project-edit-name-error">
                {nameError}
              </p>
            )}
          </label>
          <label>
            New key <span className="hint">(optional)</span>
            <input
              type="text"
              value={keyNewDraft}
              onChange={(e) => {
                setKeyNewDraft(e.target.value);
                setShowValidationPayload(false);
              }}
              data-testid="project-edit-key-new"
              placeholder={project.key}
            />
          </label>
        </div>
        <ValidationErrorPayloadPreview open={showValidationPayload} payload={updateProjectClientPayload} />
        <div className="form-edit-actions">
          <span
            className={`form-save-status form-save-status--${saveState}`}
            data-testid="form-save-status"
            data-save-state={saveState}
          >
            {saveStatusLabel}
          </span>
          <button type="button" onClick={onSaveClick} data-testid="project-save">
            Save changes
          </button>
        </div>
      </div>

      <div className="project-detail-actions">
        {project.isArchived ? (
          <button type="button" onClick={() => setArchived(false)} data-testid="project-restore">
            Restore project
          </button>
        ) : (
          <button type="button" onClick={() => setArchived(true)} data-testid="project-archive">
            Archive project
          </button>
        )}
      </div>
    </section>
  );
}
