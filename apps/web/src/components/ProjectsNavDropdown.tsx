import { useCallback, useEffect, useRef, useState } from "react";
import { RouterLink } from "../tamagui/RouterLink";

const MENU_ID = "projects-nav-dropdown-menu";

type Props = {
  /** True on `/projects` only; false inside `/projects/:id/...` so the workspace chip carries primary context. */
  projectsListPageActive: boolean;
};

export function ProjectsNavDropdown({ projectsListPageActive }: Props) {
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

  const splitClass = ["projects-nav-dropdown-split", open ? "projects-nav-dropdown-split--open" : ""]
    .filter(Boolean)
    .join(" ");

  const linkClass = [
    "projects-nav-projects-link",
    projectsListPageActive ? "projects-nav-projects-link--active" : ""
  ]
    .filter(Boolean)
    .join(" ");

  const caretClass = ["projects-nav-split-caret", open ? "projects-nav-split-caret--open" : ""].filter(Boolean).join(" ");

  return (
    <div className="projects-nav-dropdown" ref={wrapRef}>
      <div className={splitClass}>
        <RouterLink to="/projects" data-testid="nav-projects" className={linkClass} onClick={close}>
          Projects
        </RouterLink>
        <button
          type="button"
          className={caretClass}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-controls={open ? MENU_ID : undefined}
          aria-label="Open project actions menu"
          data-testid="nav-projects-menu"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="projects-nav-dropdown-caret" aria-hidden>
            ▾
          </span>
        </button>
      </div>
      {open ? (
        <ul id={MENU_ID} className="projects-nav-dropdown-menu projects-nav-dropdown-menu--split" role="menu">
          <li role="none">
            <RouterLink to="/projects?new=1" role="menuitem" data-testid="nav-projects-new" onClick={close}>
              New project
            </RouterLink>
          </li>
          {import.meta.env.DEV ? (
            <li role="none">
              <RouterLink to="/admin" role="menuitem" data-testid="nav-admin" onClick={close}>
                Admin
              </RouterLink>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
