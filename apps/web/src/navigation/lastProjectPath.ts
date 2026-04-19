export const LAST_PROJECT_PATH_KEY = "tcms.lastProjectPath";

/** Paths under a concrete project id (detail or nested routes). */
export function isPersistableProjectPath(pathname: string): boolean {
  return /^\/projects\/[^/]+(\/.*)?$/.test(pathname);
}

export function readLastProjectPath(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  try {
    const raw = localStorage.getItem(LAST_PROJECT_PATH_KEY);
    if (raw === null || raw === "" || !raw.startsWith("/")) {
      return null;
    }
    return isPersistableProjectPath(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function writeLastProjectPath(pathname: string): void {
  if (typeof localStorage === "undefined" || !isPersistableProjectPath(pathname)) {
    return;
  }
  try {
    localStorage.setItem(LAST_PROJECT_PATH_KEY, pathname);
  } catch {
    /* ignore */
  }
}
