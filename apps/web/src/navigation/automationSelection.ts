const STORAGE_KEY = "tcms.projectAutomationSelection";

export type AutomationStoredSelection = {
  manualId?: string;
  autoId?: string;
};

type Stored = Record<string, AutomationStoredSelection>;

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

export function readStoredAutomationSelection(projectId: string): AutomationStoredSelection {
  return readAll()[projectId] ?? {};
}

function writeStoredField(projectId: string, field: keyof AutomationStoredSelection, value: string | null) {
  const all = readAll();
  const entry = { ...(all[projectId] ?? {}) };
  if (value) {
    entry[field] = value;
  } else {
    delete entry[field];
  }
  if (Object.keys(entry).length === 0) {
    delete all[projectId];
  } else {
    all[projectId] = entry;
  }
  writeAll(all);
}

export function writeStoredAutomationManual(projectId: string, manualId: string | null) {
  writeStoredField(projectId, "manualId", manualId);
}

export function writeStoredAutomationAuto(projectId: string, autoId: string | null) {
  writeStoredField(projectId, "autoId", autoId);
}
