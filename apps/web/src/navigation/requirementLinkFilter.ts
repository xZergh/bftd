export function buildLinkedRequirementQuery(requirementId: string | null | undefined): string {
  if (!requirementId) {
    return "";
  }
  return `linkedReq=${encodeURIComponent(requirementId)}`;
}

export function appendLinkedRequirementQuery(path: string, requirementId: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${buildLinkedRequirementQuery(requirementId)}`;
}

export function buildLinkedRequirementTestCasesPath(projectId: string, requirementId: string, epicId?: string | null): string {
  const params = new URLSearchParams();
  if (epicId) {
    params.set("epic", epicId);
  }
  params.set("linkedReq", requirementId);
  const query = params.toString();
  return `/projects/${projectId}/test-cases${query ? `?${query}` : ""}`;
}
