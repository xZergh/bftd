import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  ArchiveProjectMutation,
  ProjectByIdQuery,
  UpdateProjectMutation
} from "../graphql/documents";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [nameDraft, setNameDraft] = useState("");
  const [keyNewDraft, setKeyNewDraft] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const [detailResult, reexecuteDetail] = useQuery({
    query: ProjectByIdQuery,
    variables: { id: projectId ?? "" },
    pause: projectId === undefined || projectId === ""
  });

  const [, updateProject] = useMutation(UpdateProjectMutation);
  const [, archiveProject] = useMutation(ArchiveProjectMutation);

  const project = detailResult.data?.project;

  useEffect(() => {
    if (project === undefined || project === null) {
      return;
    }
    setNameDraft(project.name);
    setKeyNewDraft("");
  }, [project]);

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    const g = detailResult.error.graphQLErrors.map((e) => e.message);
    const n = detailResult.error.networkError?.message;
    const text = [...g, n].filter(Boolean).join("; ");
    setTransportMessage(text.length > 0 ? text : "Request failed");
  }, [detailResult.error, setTransportMessage]);

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

  const onSave = useCallback(async () => {
    if (projectId === undefined || projectId === "") {
      return;
    }
    clearShellMessages();
    const nm = nameDraft.trim();
    if (!trimmedNonEmpty(nm)) {
      setNameError(REQUIRED_MSG);
      setShowValidationPayload(true);
      return;
    }
    setNameError(null);
    setShowValidationPayload(false);
    const kn = keyNewDraft.trim();
    const res = await updateProject({
      id: projectId,
      name: nm || undefined,
      keyNew: kn === "" ? undefined : kn
    });
    if (res.error) {
      const parts = [
        ...res.error.graphQLErrors.map((e) => e.message),
        res.error.networkError?.message
      ].filter(Boolean);
      setTransportMessage(parts.join("; ") || "Request failed");
      return;
    }
    const appErr = res.data?.updateProject?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setKeyNewDraft("");
    reexecuteDetail({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    keyNewDraft,
    nameDraft,
    projectId,
    reexecuteDetail,
    setPayloadAppError,
    setTransportMessage,
    updateProject
  ]);

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
        <Link to="/projects">Back to projects</Link>
      </section>
    );
  }

  if (project === undefined || project === null) {
    return (
      <section className="projects-page" data-testid="project-detail-loading">
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section className="projects-page" data-testid="project-detail-page">
      <div className="project-detail-header">
        <h2 id="project-detail-heading">Project</h2>
        <div className="project-detail-header-links">
          <Link to="/projects" data-testid="project-back-to-list">
            ← All projects
          </Link>
          <Link to={`/projects/${projectId}/requirements`} data-testid="project-nav-requirements">
            Requirements
          </Link>
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
        <button type="button" onClick={onSave} data-testid="project-save">
          Save changes
        </button>
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
