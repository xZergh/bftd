import { useCallback, useEffect, useRef, useState } from "react";
import { RouterLink } from "../tamagui/RouterLink";
import type { ProjectWorkspaceSection } from "./projectWorkspaceNav";

type MenuItem = { to: string; label: string; testId: string };

type Props = {
  active: ProjectWorkspaceSection;
  section: Extract<ProjectWorkspaceSection, "requirements" | "test-cases" | "runs">;
  listTo: string;
  label: string;
  linkTestId: string;
  menuTriggerTestId: string;
  menuTriggerAriaLabel: string;
  items: MenuItem[];
};

function navCurrent(active: ProjectWorkspaceSection, section: ProjectWorkspaceSection) {
  return active === section ? ("page" as const) : undefined;
}

export function ProjectNavLinkWithCreateMenu({
  active,
  section,
  listTo,
  label,
  linkTestId,
  menuTriggerTestId,
  menuTriggerAriaLabel,
  items
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

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
    <span className="project-nav-section-inline projects-nav-dropdown" ref={wrapRef}>
      <RouterLink to={listTo} data-testid={linkTestId} aria-current={navCurrent(active, section)}>
        {label}
      </RouterLink>
      <button
        type="button"
        className="projects-nav-dropdown-trigger projects-nav-dropdown-trigger--chevron"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={menuTriggerAriaLabel}
        data-testid={menuTriggerTestId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="projects-nav-dropdown-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul className="projects-nav-dropdown-menu project-nav-section-menu" role="menu">
          {items.map((it) => (
            <li key={it.to} role="none">
              <RouterLink to={it.to} role="menuitem" data-testid={it.testId} onClick={close}>
                {it.label}
              </RouterLink>
            </li>
          ))}
        </ul>
      ) : null}
    </span>
  );
}
