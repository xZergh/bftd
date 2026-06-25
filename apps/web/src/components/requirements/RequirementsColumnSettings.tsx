import { useCallback, useEffect, useRef, useState } from "react";
import {
  isLastSelectedHideableColumn,
  REQUIREMENT_HIDEABLE_COLUMNS,
  type RequirementColumnVisibility,
  type RequirementHideableColumnId
} from "./requirementsColumnConfig";

type Props = {
  visibility: RequirementColumnVisibility;
  onToggle: (columnId: RequirementHideableColumnId) => void;
};

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RequirementsColumnSettings({ visibility, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = "requirements-column-settings-panel";

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current !== null && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  return (
    <div className={`requirements-column-settings${open ? " requirements-column-settings--open" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="requirements-column-settings-trigger"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-label="Configure displayed columns"
        data-testid="requirements-column-settings"
        onClick={() => setOpen((v) => !v)}
      >
        <SettingsIcon />
      </button>
      {open ? (
        <div
          id={panelId}
          className="requirements-column-settings-panel"
          role="dialog"
          aria-label="Displayed columns"
          data-testid="requirements-column-settings-panel"
        >
          <p className="requirements-column-settings-title">Columns</p>
          <ul className="requirements-column-settings-list">
            {REQUIREMENT_HIDEABLE_COLUMNS.map((col) => {
              const locked = isLastSelectedHideableColumn(visibility, col.id);
              return (
                <li key={col.id}>
                  <label
                    className={`requirements-column-settings-option${locked ? " requirements-column-settings-option--locked" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={visibility[col.id]}
                      disabled={locked}
                      aria-disabled={locked || undefined}
                      title={locked ? "At least one column must stay visible" : undefined}
                      onChange={() => onToggle(col.id)}
                      data-testid={`requirements-column-toggle-${col.id}`}
                    />
                    <span>{col.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button type="button" className="requirements-column-settings-done" onClick={close}>
            Done
          </button>
        </div>
      ) : null}
    </div>
  );
}
