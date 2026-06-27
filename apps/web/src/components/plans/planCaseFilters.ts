import type { TestCaseListItem } from "../../graphql/types";

export type PlanMembershipFilter = "all" | "in_plan" | "not_in_plan";
export type CaseTypeFilter = "manual" | "automated" | "all";

export type PlanCaseFilterState = {
  search: string;
  membership: PlanMembershipFilter;
  type: CaseTypeFilter;
  epicId: string;
};

export function filterPlanCatalogRows(
  rows: TestCaseListItem[],
  memberIds: Set<string>,
  filters: PlanCaseFilterState
): TestCaseListItem[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((tc) => {
    if (filters.type === "manual" && tc.type !== "manual") return false;
    if (filters.type === "automated" && tc.type !== "automated") return false;
    if (filters.epicId !== "" && tc.epicId !== filters.epicId) return false;
    const inPlan = memberIds.has(tc.id);
    if (filters.membership === "in_plan" && !inPlan) return false;
    if (filters.membership === "not_in_plan" && inPlan) return false;
    if (q === "") return true;
    return (
      tc.title.toLowerCase().includes(q) ||
      (tc.externalKey ?? "").toLowerCase().includes(q) ||
      tc.type.toLowerCase().includes(q)
    );
  });
}
