import type { ReactNode } from "react";
import { RowSaveIndicator } from "../workspace/RowSaveIndicator";

type PlanMetadataPanelProps = {
  title: string;
  name: string;
  description: string;
  releaseLabel: string;
  sprintLabel: string;
  onNameChange: (v: string) => void;
  onDescriptionChange: (v: string) => void;
  onReleaseLabelChange: (v: string) => void;
  onSprintLabelChange: (v: string) => void;
  saveState?: "idle" | "saving" | "unsaved" | "saved";
  onSave?: () => void;
  onDelete?: () => void;
  onCreateRun?: () => void;
  onClose?: () => void;
  mode: "edit" | "create";
  nameError?: string | null;
  onSubmitCreate?: () => void;
  nameTestId?: string;
  children?: ReactNode;
};

export function PlanMetadataPanel({
  title,
  name,
  description,
  releaseLabel,
  sprintLabel,
  onNameChange,
  onDescriptionChange,
  onReleaseLabelChange,
  onSprintLabelChange,
  saveState = "idle",
  onSave,
  onDelete,
  onCreateRun,
  onClose,
  mode,
  nameError,
  onSubmitCreate,
  nameTestId = "plan-edit-name",
  children
}: PlanMetadataPanelProps) {
  return (
    <section className="plan-metadata-panel" data-testid={mode === "create" ? "plan-create-panel" : "plan-manage-panel"}>
      {onClose ? (
        <div className="detail-panel-header">
          <button type="button" className="detail-panel-close" onClick={onClose} data-testid="plan-inspector-close">
            Close
          </button>
        </div>
      ) : null}
      <h3 className="projects-subheading">{title}</h3>
      <div className="projects-create-fields">
        <label>
          Name {mode === "create" ? <span className="required-star" aria-hidden="true">*</span> : null}
          <input
            className="detail-title-input"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            data-testid={nameTestId}
          />
          {nameError ? (
            <p className="field-error" role="alert" data-testid="plan-create-name-error">
              {nameError}
            </p>
          ) : null}
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            data-testid="plan-edit-description"
          />
        </label>
        <label>
          Release
          <input value={releaseLabel} onChange={(e) => onReleaseLabelChange(e.target.value)} data-testid="plan-edit-release-label" />
        </label>
        <label>
          Sprint
          <input value={sprintLabel} onChange={(e) => onSprintLabelChange(e.target.value)} data-testid="plan-edit-sprint-label" />
        </label>
      </div>
      {children}
      <div className="form-edit-actions">
        {mode === "edit" ? (
          <>
            <RowSaveIndicator state={saveState === "saving" ? "saving" : saveState === "unsaved" ? "unsaved" : "saved"} />
            {onSave ? (
              <button type="button" data-testid="plan-edit-save" onClick={onSave}>
                Save
              </button>
            ) : null}
            {onDelete ? (
              <button type="button" data-testid="plan-delete" onClick={onDelete}>
                Delete
              </button>
            ) : null}
            {onCreateRun ? (
              <button type="button" data-testid="plan-create-run" onClick={onCreateRun}>
                Create run
              </button>
            ) : null}
          </>
        ) : onSubmitCreate ? (
          <button type="button" data-testid="plan-create-submit" onClick={onSubmitCreate}>
            Create plan
          </button>
        ) : null}
      </div>
    </section>
  );
}
