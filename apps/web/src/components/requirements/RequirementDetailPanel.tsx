import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterLink } from "../../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../PageLoading";
import { RowSaveIndicator } from "../workspace/RowSaveIndicator";
import { ValidationErrorPayloadPreview } from "../ValidationErrorPayloadPreview";
import {
  DeleteRequirementMutation,
  RequirementByIdQuery,
  RequirementsListQuery,
  UpdateRequirementMutation
} from "../../graphql/documents";
import { formatGraphQlTransportError } from "../../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../../forms/mandatoryFields";
import { useDebouncedAutosaveEffect } from "../../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../../shell/ShellErrorsContext";
import { buildParentSelectOptions, type ParentSelectOption } from "./requirementsHierarchy";

type RequirementBaseline = {
  title: string;
  description: string;
  parentRequirementId: string | null;
};

type Props = {
  projectId: string;
  requirementId: string;
  variant: "inspector" | "full";
  /** When set (e.g. inspector on list page), avoids a duplicate RequirementsListQuery subscription. */
  parentOptions?: ParentSelectOption[];
  onDeleted?: () => void;
  onClose?: () => void;
};

export function RequirementDetailPanel({
  projectId,
  requirementId,
  variant,
  parentOptions: parentOptionsProp,
  onDeleted,
  onClose
}: Props) {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [titleDraft, setTitleDraft] = useState("");
  const [descriptionDraft, setDescriptionDraft] = useState("");
  const [parentDraft, setParentDraft] = useState("");
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

  const ownsListQuery = parentOptionsProp === undefined;
  const [listQueryReady, setListQueryReady] = useState(false);

  useEffect(() => {
    if (!ownsListQuery) {
      return;
    }
    queueMicrotask(() => {
      setListQueryReady(true);
    });
  }, [ownsListQuery]);

  const [listResult] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId },
    requestPolicy: "cache-first",
    pause: !ownsListQuery || !listQueryReady
  });

  const [, updateRequirement] = useMutation(UpdateRequirementMutation);
  const [, deleteRequirement] = useMutation(DeleteRequirementMutation);

  const req = detailResult.data?.requirement;
  const parentOptions = useMemo(() => {
    if (parentOptionsProp !== undefined) {
      return parentOptionsProp;
    }
    return buildParentSelectOptions(listResult.data?.requirements ?? [], requirementId);
  }, [parentOptionsProp, listResult.data?.requirements, requirementId]);

  useEffect(() => {
    if (req === undefined || req === null || req.id !== requirementId) {
      return;
    }
    setTitleDraft(req.title);
    setDescriptionDraft(req.description ?? "");
    setParentDraft(req.parentRequirementId ?? "");
    setBaseline({
      title: req.title,
      description: req.description ?? "",
      parentRequirementId: req.parentRequirementId ?? null
    });
  }, [requirementId, req?.id, req?.title, req?.description, req?.parentRequirementId]);

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(detailResult.error));
  }, [detailResult.error, setTransportMessage]);

  const dirty =
    baseline !== null &&
    (titleDraft.trim() !== baseline.title.trim() ||
      descriptionDraft.trim() !== baseline.description.trim() ||
      (parentDraft || null) !== baseline.parentRequirementId);
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
          description: d === "" ? null : d,
          parentRequirementId: parentDraft || null
        }
      }
    };
  }, [descriptionDraft, parentDraft, requirementId, titleDraft]);

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
          description: descriptionDraft.trim() === "" ? null : descriptionDraft.trim(),
          parentRequirementId: parentDraft || null
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
        setBaseline({
          title: r.title,
          description: r.description ?? "",
          parentRequirementId: r.parentRequirementId ?? null
        });
        setParentDraft(r.parentRequirementId ?? "");
      }
      reexecuteDetail({ requestPolicy: "network-only" });
      return true;
    },
    [
      clearShellMessages,
      descriptionDraft,
      parentDraft,
      reexecuteDetail,
      requirementId,
      setPayloadAppError,
      setTransportMessage,
      titleDraft,
      updateRequirement
    ]
  );

  const autosaveResetKey = `${titleDraft}\0${descriptionDraft}\0${parentDraft}\0${failBump}`;
  const cancelAutosave = useDebouncedAutosaveEffect(dirty && canAutosave, autosaveResetKey, () => {
    void performSave(false);
  });

  const onSaveClick = useCallback(() => {
    cancelAutosave();
    void performSave(true);
  }, [cancelAutosave, performSave]);

  const saveState = savePhase === "saving" ? "saving" : dirty ? "unsaved" : "saved";

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

      <dl className="project-detail-meta project-detail-meta--compact">
        <div>
          <dt>Key</dt>
          <dd>
            <code data-testid="requirement-detail-key">{req.externalKey}</code>
          </dd>
        </div>
        {req.status ? (
          <div>
            <dt>Status</dt>
            <dd>{req.status}</dd>
          </div>
        ) : null}
      </dl>

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
          />
          {titleError !== null && (
            <p className="field-error" role="alert" data-testid="requirement-edit-title-error">
              {titleError}
            </p>
          )}
        </label>
        <label>
          Parent requirement
          <select
            value={parentDraft}
            onChange={(e) => {
              setParentDraft(e.target.value);
              setShowValidationPayload(false);
            }}
            data-testid="requirement-edit-parent"
          >
            <option value="">No parent (root)</option>
            {parentOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {"\u00a0".repeat(opt.depth * 2)}
                {opt.label}
              </option>
            ))}
          </select>
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
            rows={variant === "full" ? 6 : 4}
          />
        </label>
      </div>

      <ValidationErrorPayloadPreview open={showValidationPayload} payload={updateRequirementClientPayload} />

      <div className="form-edit-actions">
        <RowSaveIndicator state={saveState} data-testid="form-save-status" />
        <button type="button" onClick={onSaveClick} data-testid="requirement-save">
          Save
        </button>
      </div>

      <div className="project-detail-actions">
        <button type="button" onClick={() => void onDelete()} data-testid="requirement-delete">
          Delete requirement
        </button>
      </div>
    </div>
  );
}
