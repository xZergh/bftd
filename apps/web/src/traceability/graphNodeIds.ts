/** IDs returned by `traceabilityGraph` use these prefixes. */

export function reqNodeId(requirementId: string): string {
  return `req:${requirementId}`;
}

export function manNodeId(manualTestCaseId: string): string {
  return `man:${manualTestCaseId}`;
}

export function autoNodeId(automatedTestCaseId: string): string {
  return `auto:${automatedTestCaseId}`;
}

export function parseGraphNodeId(prefixed: string): { kind: "req" | "man" | "auto"; id: string } | null {
  const m = /^(req|man|auto):(.+)$/.exec(prefixed);
  if (m === null) {
    return null;
  }
  return { kind: m[1] as "req" | "man" | "auto", id: m[2]! };
}
