import { useEffect, useRef, useState } from "react";
import { UserIcon } from "./icons/UserIcon";

const MENU_ID = "shell-account-menu";

export function ShellAccountMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="shell-settings-menu" ref={wrapRef}>
      <button
        type="button"
        className="shell-settings-icon-btn shell-settings-icon-btn--placeholder"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? MENU_ID : undefined}
        aria-label="Account (coming soon)"
        title="Account (coming soon)"
        data-testid="shell-account-menu-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        <UserIcon />
      </button>
      {open ? (
        <div id={MENU_ID} className="shell-settings-popover" role="menu" aria-label="Account">
          <p className="shell-settings-popover-title">Account</p>
          <p className="shell-settings-placeholder-text">Sign-in and user settings are not available yet.</p>
        </div>
      ) : null}
    </div>
  );
}
