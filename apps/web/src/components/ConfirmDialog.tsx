import type { ReactNode } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  dialogTestId?: string;
  confirmTestId?: string;
  cancelTestId?: string;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  dialogTestId = "confirm-dialog",
  confirmTestId = "confirm-dialog-confirm",
  cancelTestId = "confirm-dialog-cancel",
  destructive = false
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="projects-modal-backdrop"
      role="presentation"
      data-testid={dialogTestId}
      onClick={onCancel}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onCancel();
        }
      }}
    >
      <div
        className="projects-create-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dialogTestId}-title`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={`${dialogTestId}-title`} className="projects-subheading">
          {title}
        </h3>
        <div className="confirm-dialog-message">{message}</div>
        <div className="confirm-dialog-actions">
          <button type="button" data-testid={cancelTestId} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={destructive ? "confirm-dialog-confirm--destructive" : undefined}
            data-testid={confirmTestId}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
