import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterLink } from "../../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../PageLoading";
import { RowSaveIndicator } from "../workspace/RowSaveIndicator";
import { ValidationErrorPayloadPreview } from "../ValidationErrorPayloadPreview";
import {
  DeleteRequirementMutation,
  EpicsListQuery,
  RequirementByIdQuery,
  UpdateRequirementMutation
} from "../../graphql/documents";
import { formatGraphQlTransportError } from "../../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../../forms/mandatoryFields";
import { useDebouncedAutosaveEffect } from "../../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../../shell/ShellErrorsContext";

type RequirementBaseline = { title: string; description: string };

type Props = {
  projectId: string;
  requirementId: string;
  variant: "inspector" | "full";
  onDeleted?: () => void;
  onClose?: () => void;
  onUpdated?: () => void;
};

export function RequirementDetailPanel({ projectId, requirementId, variant, onDeleted, onClose, onUpdated }: Props) {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [baseline, setBaseline] = useState<RequirementBaseline | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);
  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);

  const [detailResult, reexecuteDetail] = useQuery({
    query: RequirementByIdQuery,
    variables: { id: requirementId, projectId },
    requestPolicy: "network-only"
  });

  const [epicsResult] = useQuery({
    query: EpicsListQuery,
    variables: { projectId },
    requestPolicy: "cache-and-network"
  });

  const [, updateRequirement] = useMutation(UpdateRequirementMutation);
  const [, deleteRequirement] = useMutation(DeleteRequirementMutation);

  const req = detailResult.data?.requirement;
  const epics = epicsResult.data?.epics ?? [];

  const onEpicChange = useCallback(
    async (nextEpicId: string) => {
      clearShellMessages();
      const res = await updateRequirement({
        input: {
          id: requirementId,
          epicId: nextEpicId === "" ? null : nextEpicId
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
      onUpdated?.();
    },
    [clearShellMessages, onUpdated, reexecuteDetail, requirementId, setPayloadAppError, setTransportMessage, updateRequirement]
  );

  useEffect(() => {
    if (req === undefined || req === null || req.id !== requirementId) {
      return;
    }
    setTitleDraft(req.title);
    setDescriptionDraft(req.description ?? "");
    setBaseline({ title: req.title, description: req.description ?? "" });
  }, [requirementId, req?.id, req?.title, req?.description]);

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(detailResult.error));
  }, [detailResult.error, setTransportMessage]);

  const dirty =
    baseline !== null &&
    (titleDraft.trim() !== baseline.title.trim() ||
      descriptionDraft.trim() !== baseline.description.trim());
  const canAutosave = trimmedNonEmpty(titleDraft.trim());

  const updateRequirementClientPayload = useMemo(() => {
    const t = titleDraft.trim();
    const d = descriptionDraft.trim();
    return {
      mutation: "UpdateRequirement",
      variables: {
        input: {
          id: requirementId,
          title: t.length > 0 ? t : null,
          description: d === "" ? null : d
        }
      }
    };
  }, [descriptionDraft, requirementId, titleDraft]);

  const performSave = useCallback(
    async (validateClient: boolean): Promise<boolean> => {
      const t = titleDraft.trim();
      if (!trimmedNonEmpty(t)) {
        if (validateClient) {
          clearShellMessages();
          setTitleError(REQUIRED_MSG);
          setShowValidationPayload(true);
        }
        return false;
      }
      if (validateClient) {
        clearShellMessages();
        setTitleError(null);
        setShowValidationPayload(false);
      }
      setSavePhase("saving");
      const res = await updateRequirement({
        input: {
          id: requirementId,
          title: t || undefined,
          description: descriptionDraft.trim() === "" ? null : descriptionDraft.trim()
        }
      });
      setSavePhase("idle");
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        setFailBump((n) => n + 1);
        return false;
      }
      const appErr = res.data?.updateRequirement?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        setFailBump((n) => n + 1);
        return false;
      }
      const r = res.data?.updateRequirement?.requirement;
      if (r !== undefined && r !== null) {
        setBaseline({ title: r.title, description: r.description ?? "" });
      }
      reexecuteDetail({ requestPolicy: "network-only" });
      return true;
    },
    [
      clearShellMessages,
      descriptionDraft,
      reexecuteDetail,
      requirementId,
      setPayloadAppError,
      setTransportMessage,
      titleDraft,
      updateRequirement
    ]
  );

  const autosaveResetKey = `${titleDraft}\0${descriptionDraft}\0${failBump}`;
  useDebouncedAutosaveEffect(dirty && canAutosave, autosaveResetKey, () => {
    void performSave(false);
  });

  const saveState =
    savePhase === "saving" ? "saving" : dirty ? "unsaved" : "saved";

  const onDelete = useCallback(async () => {
    clearShellMessages();
    const res = await deleteRequirement({ id: requirementId });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    onDeleted?.();
  }, [clearShellMessages, deleteRequirement, onDeleted, requirementId, setTransportMessage]);

  if (detailResult.fetching && detailResult.data === undefined) {
    return <PageLoading dataTestId="requirement-detail-loading" />;
  }

  if (!detailResult.fetching && detailResult.data !== undefined && req === null) {
    return <p className="projects-empty">Requirement not found.</p>;
  }

  if (req === undefined || req === null) {
    return <PageLoading dataTestId="requirement-detail-loading" />;
  }

  return (
    <div
      className={`requirement-detail-panel requirement-detail-panel--${variant}`}
      data-testid="requirement-detail-panel"
    >
      {variant === "full" ? (
        <nav className="detail-breadcrumbs" aria-label="Requirement breadcrumb">
          <RouterLink to={`/projects/${projectId}`}>Overview</RouterLink>
          <span className="detail-breadcrumbs-sep" aria-hidden="true">
            /
          </span>
          <RouterLink to={`/projects/${projectId}/requirements`}>Requirements</RouterLink>
          <span className="detail-breadcrumbs-sep" aria-hidden="true">
            /
          </span>
          <span data-testid="requirement-breadcrumb-key">{req.externalKey}</span>
        </nav>
      ) : null}
      <div className="detail-panel-header">
        {variant === "full" ? (
          <RouterLink to={`/projects/${projectId}/requirements`} data-testid="requirement-back-list">
            ← Requirements
          </RouterLink>
        ) : (
          <div className="detail-panel-header-actions">
            <RouterLink
              to={`/projects/${projectId}/requirements/${requirementId}`}
              data-testid="requirement-open-full"
            >
              Open full page
            </RouterLink>
            {onClose ? (
              <button type="button" className="detail-panel-close" onClick={onClose} data-testid="requirement-inspector-close">
                Close
              </button>
            ) : null}
          </div>
        )}
      </div>

      <dl className="detail-meta-strip" aria-label="Requirement summary">
        <div className="detail-meta-item">
          <dt className="detail-meta-label">Key</dt>
          <dd>
            <code data-testid="requirement-detail-key">{req.externalKey}</code>
          </dd>
        </div>
        {req.status ? (
          <div className="detail-meta-item">
            <dt className="detail-meta-label">Status</dt>
            <dd>{req.status}</dd>
          </div>
        ) : null}
        {req.priority ? (
          <div className="detail-meta-item">
            <dt className="detail-meta-label">Priority</dt>
            <dd>{req.priority}</dd>
          </div>
        ) : null}
        {req.requirementType ? (
          <div className="detail-meta-item">
            <dt className="detail-meta-label">Type</dt>
            <dd>{req.requirementType}</dd>
          </div>
        ) : null}
      </dl>

      <div className="detail-edit-fields">
        <label>
          Epic
          <select
            value={req.epicId ?? ""}
            onChange={(e) => void onEpicChange(e.target.value)}
            data-testid="requirement-edit-epic"
          >
            <option value="">— None —</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.externalKey} — {epic.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title <span className="required-star" aria-hidden="true">*</span>
          <input
            type="text"
            className="detail-title-input"
            value={titleDraft}
            onChange={(e) => {
              setTitleDraft(e.target.value);
              setTitleError(null);
              setShowValidationPayload(false);
            }}
            data-testid="requirement-edit-title"
            autoComplete="off"
            aria-invalid={titleError !== null}
          />
          {titleError !== null && (
            <p className="field-error" role="alert" data-testid="requirement-edit-title-error">
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

      <div className="form-edit-actions">
        <RowSaveIndicator state={saveState} />
      </div>

      <div className="project-detail-actions">
        <button type="button" onClick={() => void onDelete()} data-testid="requirement-delete">
          Delete requirement
        </button>
      </div>
    </div>
  );
}
