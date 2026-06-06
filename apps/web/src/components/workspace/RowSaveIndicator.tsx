type SaveState = "idle" | "saving" | "saved" | "unsaved" | "error";

type Props = {
  state: SaveState;
  className?: string;
  "data-testid"?: string;
};

export function RowSaveIndicator({ state, className, "data-testid": testId = "form-save-status" }: Props) {
  const label =
    state === "saving"
      ? "Saving…"
      : state === "unsaved"
        ? "Unsaved"
        : state === "error"
          ? "Save failed"
          : state === "saved"
            ? "Saved"
            : "";

  if (label === "") {
    return null;
  }

  const cssState =
    state === "saving" ? "saving" : state === "unsaved" || state === "error" ? "unsaved" : "saved";

  return (
    <span
      className={`form-save-status form-save-status--${cssState}${className ? ` ${className}` : ""}`}
      data-testid={testId}
      data-save-state={cssState}
    >
      {label}
    </span>
  );
}
