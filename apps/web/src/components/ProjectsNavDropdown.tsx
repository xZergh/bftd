import { useCallback, useEffect, useRef, useState } from "react";
import { RouterLink } from "../tamagui/RouterLink";

export function ProjectsNavDropdown() {
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

  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="projects-nav-dropdown" ref={wrapRef}>
      <button
        type="button"
        className="projects-nav-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        data-testid="nav-projects-menu"
        onClick={() => setOpen((v) => !v)}
      >
        Projects
        <span className="projects-nav-dropdown-caret" aria-hidden>
          ▾
        </span>
      </button>
      {open ? (
        <ul className="projects-nav-dropdown-menu" role="menu">
          <li role="none">
            <RouterLink to="/projects" role="menuitem" data-testid="nav-projects" onClick={close}>
              All projects
            </RouterLink>
          </li>
          <li role="none">
            <RouterLink to="/projects?new=1" role="menuitem" data-testid="nav-projects-new" onClick={close}>
              New project
            </RouterLink>
          </li>
        </ul>
      ) : null}
    </div>
  );
}
