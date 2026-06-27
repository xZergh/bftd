import { useCallback, useEffect, useRef, useState } from "react";
import {
  ACTIVE_DATABASE_STORAGE_KEY,
  fetchDatabases,
  switchDatabase,
  type DatabaseProfileInfo
} from "../api/databases";
import { DatabaseIcon } from "./icons/DatabaseIcon";

const MENU_ID = "shell-database-menu";

export function ShellDatabaseMenu() {
  const [open, setOpen] = useState(false);
  const [profiles, setProfiles] = useState<DatabaseProfileInfo[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchDatabases();
      setProfiles(data.profiles);
      setActiveId(data.activeProfileId);

      const preferred = localStorage.getItem(ACTIVE_DATABASE_STORAGE_KEY);
      if (
        preferred !== null &&
        preferred !== "" &&
        data.activeProfileId !== null &&
        preferred !== data.activeProfileId &&
        data.profiles.some((p) => p.id === preferred)
      ) {
        setSwitching(true);
        await switchDatabase(preferred);
        localStorage.setItem(ACTIVE_DATABASE_STORAGE_KEY, preferred);
        window.location.reload();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load databases");
    } finally {
      setLoading(false);
      setSwitching(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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

  const activeLabel = profiles.find((p) => p.id === activeId)?.label ?? "Database";

  const onSelect = async (profileId: string) => {
    if (profileId === activeId || switching) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    setError(null);
    try {
      await switchDatabase(profileId);
      localStorage.setItem(ACTIVE_DATABASE_STORAGE_KEY, profileId);
      window.location.reload();
    } catch (err) {
      setSwitching(false);
      setError(err instanceof Error ? err.message : "Could not switch database");
    }
  };

  return (
    <div className="shell-settings-menu" ref={wrapRef}>
      <button
        type="button"
        className="shell-settings-icon-btn"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? MENU_ID : undefined}
        aria-label={`Database: ${activeLabel}. Open database switcher`}
        title={`Database: ${activeLabel}`}
        data-testid="shell-database-menu-trigger"
        disabled={loading || switching}
        onClick={() => setOpen((v) => !v)}
      >
        <DatabaseIcon />
      </button>
      {open ? (
        <div id={MENU_ID} className="shell-settings-popover" role="menu" aria-label="Database switcher">
          <p className="shell-settings-popover-title">Database</p>
          {error !== null ? (
            <p className="shell-settings-popover-error" role="alert">
              {error}
            </p>
          ) : null}
          <ul className="shell-settings-list">
            {profiles.map((profile) => {
              const selected = profile.id === activeId;
              return (
                <li key={profile.id} role="none">
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={selected}
                    className={[
                      "shell-settings-list-item",
                      selected ? "shell-settings-list-item--active" : ""
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    data-testid={`shell-database-option-${profile.id}`}
                    disabled={switching}
                    onClick={() => void onSelect(profile.id)}
                  >
                    <span className="shell-settings-list-label">{profile.label}</span>
                    <span className="shell-settings-list-desc">{profile.description}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
