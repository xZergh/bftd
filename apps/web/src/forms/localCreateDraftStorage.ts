const DRAFT_VERSION = 2 as const;

/** Shorter than server autosave — localStorage only */
export const LOCAL_CREATE_DRAFT_DEBOUNCE_MS = 600;

const KEY_CREATE_PROJECT = "tcms.createProjectDraft.v1";

export function requirementCreateDraftKey(projectId: string): string {
  return `tcms.createRequirementDraft.v1.${projectId}`;
}

export type CreateProjectDraft = { v: typeof DRAFT_VERSION; name: string; key: string; description: string };

export type CreateRequirementDraft = {
  v: typeof DRAFT_VERSION;
  externalKey: string;
  title: string;
};

function safeParseProject(raw: string | null): CreateProjectDraft | null {
  if (raw === null || raw === "") {
    return null;
  }
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.name !== "string" || typeof o.key !== "string") {
      return null;
    }
    if (o.v === 1) {
      return { v: DRAFT_VERSION, name: o.name, key: o.key, description: "" };
    }
    if (o.v === DRAFT_VERSION && typeof o.description === "string") {
      return { v: DRAFT_VERSION, name: o.name, key: o.key, description: o.description };
    }
    return null;
  } catch {
    return null;
  }
}

function safeParseRequirement(raw: string | null): CreateRequirementDraft | null {
  if (raw === null || raw === "") {
    return null;
  }
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (
      o.v !== DRAFT_VERSION ||
      typeof o.externalKey !== "string" ||
      typeof o.title !== "string"
    ) {
      return null;
    }
    return { v: DRAFT_VERSION, externalKey: o.externalKey, title: o.title };
  } catch {
    return null;
  }
}

export function readCreateProjectDraft(): CreateProjectDraft | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return safeParseProject(localStorage.getItem(KEY_CREATE_PROJECT));
}

export function writeCreateProjectDraft(name: string, key: string, description: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    const payload: CreateProjectDraft = { v: DRAFT_VERSION, name, key, description };
    localStorage.setItem(KEY_CREATE_PROJECT, JSON.stringify(payload));
  } catch {
    /* quota or private mode */
  }
}

export function clearCreateProjectDraft(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(KEY_CREATE_PROJECT);
  } catch {
    /* ignore */
  }
}

export function readCreateRequirementDraft(projectId: string): CreateRequirementDraft | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return safeParseRequirement(localStorage.getItem(requirementCreateDraftKey(projectId)));
}

export function writeCreateRequirementDraft(
  projectId: string,
  externalKey: string,
  title: string
): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    const payload: CreateRequirementDraft = { v: DRAFT_VERSION, externalKey, title };
    localStorage.setItem(requirementCreateDraftKey(projectId), JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearCreateRequirementDraft(projectId: string): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.removeItem(requirementCreateDraftKey(projectId));
  } catch {
    /* ignore */
  }
}
