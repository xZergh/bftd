import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  DeleteRequirementMutation,
  RequirementByIdQuery,
  UpdateRequirementMutation
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function RequirementDetailPage() {
  const { projectId, requirementId } = useParams();
  const navigate = useNavigate();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const paused = requirementId === undefined || requirementId === "";
  const [detailResult, reexecuteDetail] = useQuery({
    query: RequirementByIdQuery,
    variables: { id: requirementId ?? "", projectId: projectId ?? undefined },
    pause: paused
  });

  const [, updateRequirement] = useMutation(UpdateRequirementMutation);
  const [, deleteRequirement] = useMutation(DeleteRequirementMutation);

  const req = detailResult.data?.requirement;

  /**
   * Hydrate drafts when navigating to a requirement (`requirementId` / `req.id` pair), not when `req` is replaced by refetch.
   * Deps intentionally omit `req` object identity so clearing the title is not overwritten by background queries.
   */
  useEffect(() => {
    if (requirementId === undefined || requirementId === "") {
      return;
    }
    if (req === undefined || req === null || req.id !== requirementId) {
      return;
    }
    setTitleDraft(req.title);
    setDescriptionDraft(req.description ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-hydrate on navigation / new entity id, not refetch
  }, [requirementId, req?.id]);

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(detailResult.error));
  }, [detailResult.error, setTransportMessage]);

  const updateRequirementClientPayload = useMemo(() => {
    const t = titleDraft.trim();
    const d = descriptionDraft.trim();
    return {
      mutation: "UpdateRequirement",
      variables: {
        input: {
          id: requirementId ?? null,
          title: t.length > 0 ? t : null,
          description: d === "" ? null : d
        }
      }
    };
  }, [descriptionDraft, requirementId, titleDraft]);

  const onSave = useCallback(async () => {
    if (requirementId === undefined || requirementId === "") {
      return;
    }
    clearShellMessages();
    const t = titleDraft.trim();
    if (!trimmedNonEmpty(t)) {
      setTitleError(REQUIRED_MSG);
      setShowValidationPayload(true);
      return;
    }
    setTitleError(null);
    setShowValidationPayload(false);
    const res = await updateRequirement({
      input: {
        id: requirementId,
        title: t || undefined,
        description: descriptionDraft.trim() === "" ? null : descriptionDraft.trim()
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.updateRequirement?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    reexecuteDetail({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    descriptionDraft,
    reexecuteDetail,
    requirementId,
    setPayloadAppError,
    setTransportMessage,
    titleDraft,
    updateRequirement
  ]);

  const onDelete = useCallback(async () => {
    if (requirementId === undefined || requirementId === "" || projectId === undefined) {
      return;
    }
    clearShellMessages();
    const res = await deleteRequirement({ id: requirementId });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    if (res.data?.deleteRequirement?.success === true) {
      navigate(`/projects/${projectId}/requirements`);
    }
  }, [clearShellMessages, deleteRequirement, navigate, projectId, requirementId, setTransportMessage]);

  if (paused || projectId === undefined) {
    return null;
  }

  if (detailResult.fetching && detailResult.data === undefined) {
    return (
      <section className="projects-page" data-testid="requirement-detail-loading">
        <p>Loading…</p>
      </section>
    );
  }

  if (!detailResult.fetching && detailResult.data !== undefined && req === null) {
    return (
      <section className="projects-page" data-testid="requirement-not-found">
        <h2>Requirement not found</h2>
        <Link to={`/projects/${projectId}/requirements`}>Back to requirements</Link>
      </section>
    );
  }

  if (req === undefined || req === null) {
    return (
      <section className="projects-page" data-testid="requirement-detail-loading">
        <p>Loading…</p>
      </section>
    );
  }

  return (
    <section className="projects-page" data-testid="requirement-detail-page">
      <div className="project-detail-header">
        <h2>Requirement</h2>
        <Link to={`/projects/${projectId}/requirements`} data-testid="requirement-back-list">
          ← Requirements
        </Link>
      </div>

      <dl className="project-detail-meta">
        <div>
          <dt>External key</dt>
          <dd>
            <code data-testid="requirement-detail-key">{req.externalKey}</code>
          </dd>
        </div>
      </dl>

      <div className="projects-create project-detail-edit">
        <h3 className="projects-subheading">Edit</h3>
        <div className="projects-create-fields">
          <label>
            Title <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => {
                setTitleDraft(e.target.value);
                setTitleError(null);
                setShowValidationPayload(false);
              }}
              data-testid="requirement-edit-title"
              autoComplete="off"
              aria-invalid={titleError !== null}
              aria-describedby={titleError !== null ? "requirement-edit-title-err" : undefined}
            />
            {titleError !== null && (
              <p
                id="requirement-edit-title-err"
                className="field-error"
                role="alert"
                data-testid="requirement-edit-title-error"
              >
                {titleError}
              </p>
            )}
          </label>
          <label>
            Description
            <textarea
              value={descriptionDraft}
              onChange={(e) => {
                setDescriptionDraft(e.target.value);
                setShowValidationPayload(false);
              }}
              data-testid="requirement-edit-description"
              rows={4}
            />
          </label>
        </div>
        <ValidationErrorPayloadPreview open={showValidationPayload} payload={updateRequirementClientPayload} />
        <button type="button" onClick={onSave} data-testid="requirement-save">
          Save
        </button>
      </div>

      <div className="project-detail-actions">
        <button type="button" onClick={onDelete} data-testid="requirement-delete">
          Delete requirement
        </button>
      </div>
    </section>
  );
}
