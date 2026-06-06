import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  ArchiveProjectMutation,
  ProjectByIdQuery,
  ProjectSummaryQuery,
  UpdateProjectMutation
} from "../graphql/documents";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import { useDebouncedAutosaveEffect } from "../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

type ProjectBaseline = { name: string; keyNew: string; description: string | null };

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [nameDraft, setNameDraft] = useState("");
  const [keyNewDraft, setKeyNewDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [baseline, setBaseline] = useState<ProjectBaseline | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);
  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [detailResult, reexecuteDetail] = useQuery({
    query: ProjectByIdQuery,
    variables: { id: projectId ?? "" },
    pause: projectId === undefined || projectId === ""
  });

  const [summaryResult] = useQuery({
    query: ProjectSummaryQuery,
    variables: { projectId: projectId ?? "" },
    pause: projectId === undefined || projectId === ""
  });

  const [, updateProject] = useMutation(UpdateProjectMutation);
  const [, archiveProject] = useMutation(ArchiveProjectMutation);

  const project = detailResult.data?.project;
  const summary = summaryResult.data?.projectSummary;
  const base = projectId !== undefined ? `/projects/${projectId}` : "";

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
    setDescriptionDraft(project.description ?? "");
    setBaseline({ name: project.name, keyNew: "", description: project.description ?? null });
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

  const descNorm = (s: string | null | undefined) => (s ?? "").trim();
  const dirty =
    baseline !== null &&
    (nameDraft.trim() !== baseline.name ||
      keyNewDraft.trim() !== baseline.keyNew ||
      descNorm(descriptionDraft) !== descNorm(baseline.description));
  const canAutosave = trimmedNonEmpty(nameDraft.trim());

  const updateProjectClientPayload = useMemo(() => {
    const nm = nameDraft.trim();
    const kn = keyNewDraft.trim();
    const d = descriptionDraft.trim();
    return {
      mutation: "UpdateProject",
      variables: {
        id: projectId ?? null,
        name: nm.length > 0 ? nm : null,
        keyNew: kn.length > 0 ? kn : undefined,
        description: d.length > 0 ? d : null
      }
    };
  }, [descriptionDraft, keyNewDraft, nameDraft, projectId]);

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
      const d = descriptionDraft.trim();
      const res = await updateProject({
        id: projectId,
        name: nm || undefined,
        keyNew: kn === "" ? undefined : kn,
        description: d === "" ? null : d
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
        setBaseline({ name: p.name, keyNew: "", description: p.description ?? null });
        setDescriptionDraft(p.description ?? "");
      }
      setKeyNewDraft("");
      reexecuteDetail({ requestPolicy: "network-only" });
      return true;
    },
    [
      clearShellMessages,
      descriptionDraft,
      keyNewDraft,
      nameDraft,
      projectId,
      reexecuteDetail,
      setPayloadAppError,
      setTransportMessage,
      updateProject
    ]
  );

  const autosaveResetKey = `${nameDraft}\0${keyNewDraft}\0${descriptionDraft}\0${failBump}`;
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
      <ProjectWorkspaceHeader
        title="Overview"
        titleId="project-detail-heading"
        projectId={projectId}
        active="project"
      />

      {summary ? (
        <div className="project-dashboard-kpi" data-testid="project-dashboard-kpi">
          <RouterLink to={`${base}/requirements`} className="project-kpi-tile" data-testid="project-kpi-requirements">
            <span className="project-kpi-value">{summary.totalRequirements}</span>
            <span className="project-kpi-label">Requirements</span>
          </RouterLink>
          <RouterLink to={`${base}/test-cases`} className="project-kpi-tile" data-testid="project-kpi-manual">
            <span className="project-kpi-value">{summary.totalManualCases}</span>
            <span className="project-kpi-label">Manual tests</span>
          </RouterLink>
          <RouterLink to={`${base}/test-cases`} className="project-kpi-tile" data-testid="project-kpi-automated">
            <span className="project-kpi-value">{summary.totalAutomatedCases}</span>
            <span className="project-kpi-label">Automated tests</span>
          </RouterLink>
          <RouterLink to={`${base}/plans`} className="project-kpi-tile" data-testid="project-kpi-plans">
            <span className="project-kpi-value">{summary.totalPlans}</span>
            <span className="project-kpi-label">Plans</span>
          </RouterLink>
        </div>
      ) : null}

      <div className="project-dashboard-quicklinks" data-testid="project-dashboard-quicklinks">
        <h3 className="projects-subheading">Quick links</h3>
        <ul className="project-quicklink-list">
          <li>
            <RouterLink to={`${base}/requirements`}>Requirements</RouterLink>
          </li>
          <li>
            <RouterLink to={`${base}/test-cases`}>Test cases</RouterLink>
          </li>
          <li>
            <RouterLink to={`${base}/plans`}>Plans</RouterLink>
          </li>
          <li>
            <RouterLink to={`${base}/runs`}>Runs</RouterLink>
          </li>
          <li>
            <RouterLink to={`${base}/reporting`}>Reporting</RouterLink>
          </li>
          {summary?.latestRunId ? (
            <li>
              <RouterLink to={`${base}/runs/${summary.latestRunId}`} data-testid="project-latest-run-link">
                Latest run: {summary.latestRunName}
              </RouterLink>
            </li>
          ) : null}
        </ul>
      </div>

      <div className="project-overview-grid">
        <div className="project-overview-summary">
          <h3 className="projects-subheading">Summary</h3>
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
        </div>
        <div className="project-detail-edit">
          <button
            type="button"
            className="project-settings-toggle"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((o) => !o)}
            data-testid="project-settings-toggle"
          >
            Project settings {settingsOpen ? "▾" : "▸"}
          </button>
          {settingsOpen ? (
            <>
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
              <label>
                Description <span className="hint">(optional)</span>
                <textarea
                  rows={3}
                  value={descriptionDraft}
                  onChange={(e) => {
                    setDescriptionDraft(e.target.value);
                    setShowValidationPayload(false);
                  }}
                  data-testid="project-edit-description"
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
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
