import { describe, expect, it } from "vitest";
import { filterRequirementSubtree } from "./requirementsHierarchy";
import type { RequirementListItem } from "../../graphql/types";

function req(id: string, key: string, parentRequirementId: string | null): RequirementListItem {
  return {
    id,
    externalKey: key,
    title: `Req ${key}`,
    description: null,
    releaseLabel: null,
    sprintLabel: null,
    requirementType: null,
    status: null,
    priority: null,
    tags: [],
    parentRequirementId,
    linkedManualTestCaseCount: 0,
    createdAt: "",
    updatedAt: ""
  };
}

// root ─ a ─ a1 ─ a1x
//        └─ a2
//      b
const ROWS = [
  req("a", "A", null),
  req("a1", "A1", "a"),
  req("a1x", "A1X", "a1"),
  req("a2", "A2", "a"),
  req("b", "B", null)
];

describe("filterRequirementSubtree", () => {
  it("returns every row when no root is selected", () => {
    expect(filterRequirementSubtree(ROWS, null)).toHaveLength(5);
    expect(filterRequirementSubtree(ROWS, "")).toHaveLength(5);
  });

  it("keeps the selected root and all descendants, transitively", () => {
    const kept = filterRequirementSubtree(ROWS, "a").map((r) => r.externalKey).sort();
    expect(kept).toEqual(["A", "A1", "A1X", "A2"]);
  });

  it("excludes siblings and unrelated roots", () => {
    expect(filterRequirementSubtree(ROWS, "a").map((r) => r.id)).not.toContain("b");
  });

  it("scopes to a mid-tree node", () => {
    expect(filterRequirementSubtree(ROWS, "a1").map((r) => r.externalKey).sort()).toEqual(["A1", "A1X"]);
  });

  it("returns just the node for a leaf", () => {
    expect(filterRequirementSubtree(ROWS, "b").map((r) => r.externalKey)).toEqual(["B"]);
  });

  it("falls back to all rows for an unknown id rather than emptying the table", () => {
    // A stale ?tree= value (deleted requirement) must not look like total data loss.
    expect(filterRequirementSubtree(ROWS, "does-not-exist")).toHaveLength(5);
  });

  it("does not infinitely recurse when a parent link is dangling", () => {
    const dangling = [req("x", "X", "missing-parent"), req("y", "Y", "x")];
    expect(filterRequirementSubtree(dangling, "x").map((r) => r.externalKey)).toEqual(["X", "Y"]);
  });
});
