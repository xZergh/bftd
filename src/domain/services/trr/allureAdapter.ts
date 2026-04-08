import type { NormalizedTrrStep } from "./types";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/**
 * Maps Allure-style TRR step payloads into the internal normalized shape.
 * Accepts an array of objects with optional nesting via `children`.
 */
export function parseAllureTrrSteps(raw: unknown): NormalizedTrrStep[] {
  if (!Array.isArray(raw)) return [];
  const out: NormalizedTrrStep[] = [];
  let order = 0;

  const walk = (nodes: unknown[], parentId: string | undefined) => {
    for (const node of nodes) {
      if (!isRecord(node)) continue;
      order += 1;
      const name = typeof node.name === "string" ? node.name : typeof node.title === "string" ? node.title : "Step";
      const expectedResult =
        typeof node.expectedResult === "string"
          ? node.expectedResult
          : typeof node.expected === "string"
            ? node.expected
            : undefined;
      const sourceStepId = typeof node.sourceStepId === "string" ? node.sourceStepId : undefined;
      const meta =
        node.metadata && isRecord(node.metadata)
          ? JSON.stringify(node.metadata)
          : node.meta && isRecord(node.meta)
            ? JSON.stringify(node.meta)
            : undefined;
      out.push({
        order,
        name,
        expectedResult,
        sourceStepId,
        parentStepId: parentId,
        metaJson: meta
      });
      const id = typeof node.id === "string" ? node.id : `s-${order}`;
      const children = node.children;
      if (Array.isArray(children) && children.length > 0) {
        walk(children, id);
      }
    }
  };

  walk(raw, undefined);
  return out;
}
