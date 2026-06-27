const STORAGE_KEY = "tcms.projectEpicFilter";

type Stored = Record<string, string>;

function readAll(): Stored {
  if (typeof localStorage === "undefined") {
    return {};
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    return parsed as Stored;
  } catch {
    return {};
  }
}

function writeAll(next: Stored) {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / privacy errors
  }
}

export function readStoredEpicFilter(projectId: string): string | null {
  const value = readAll()[projectId];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function writeStoredEpicFilter(projectId: string, epicId: string | null) {
  const all = readAll();
  if (!epicId) {
    delete all[projectId];
  } else {
    all[projectId] = epicId;
  }
  writeAll(all);
}

export function buildEpicQuery(epicId: string | null | undefined): string {
  if (!epicId) {
    return "";
  }
  return `?epic=${encodeURIComponent(epicId)}`;
}

export function buildEpicFilterPath(
  projectId: string,
  section: "requirements" | "test-cases",
  epicId: string
): string {
  return `/projects/${projectId}/${section}${buildEpicQuery(epicId)}`;
}
