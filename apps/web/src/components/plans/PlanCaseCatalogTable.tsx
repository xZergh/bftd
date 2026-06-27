import { AutomationCoverageIcon } from "../automation/AutomationCoverageIcon";
import { PageLoading } from "../PageLoading";
import type { EpicListItem, TestCaseListItem } from "../../graphql/types";
import { SelectionBar } from "./SelectionBar";
import type { CaseTypeFilter, PlanMembershipFilter } from "./planCaseFilters";

export type PlanCaseCatalogMode = "membership" | "selection";

type PlanCaseCatalogTableProps = {
  rows: TestCaseListItem[];
  filteredRows: TestCaseListItem[];
  memberIds: Set<string>;
  linkedAutomatedCountByManual: Map<string, number>;
  loading?: boolean;
  mode: PlanCaseCatalogMode;
  membershipFilter: PlanMembershipFilter;
  onMembershipFilterChange: (v: PlanMembershipFilter) => void;
  typeFilter: CaseTypeFilter;
  onTypeFilterChange: (v: CaseTypeFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
  epicFilterId: string;
  onEpicFilterChange: (v: string) => void;
  epics: EpicListItem[];
  pickedIds?: Set<string>;
  onPickToggle?: (id: string, picked: boolean) => void;
  onMembershipToggle: (id: string, inPlan: boolean) => void;
  onQuickView?: (tc: TestCaseListItem) => void;
  onAddAllMatching?: () => void;
  onRemoveAllMatching?: () => void;
  onPickAllMatching?: () => void;
  bulkPending?: boolean;
};

export function PlanCaseCatalogTable({
  rows,
  filteredRows,
  memberIds,
  linkedAutomatedCountByManual,
  loading = false,
  mode,
  membershipFilter,
  onMembershipFilterChange,
  typeFilter,
  onTypeFilterChange,
  search,
  onSearchChange,
  epicFilterId,
  onEpicFilterChange,
  epics,
  pickedIds = new Set(),
  onPickToggle,
  onMembershipToggle,
  onQuickView,
  onAddAllMatching,
  onRemoveAllMatching,
  onPickAllMatching,
  bulkPending = false
}: PlanCaseCatalogTableProps) {
  const colCount = 5;
  const addableCount = filteredRows.filter((tc) => !memberIds.has(tc.id)).length;
  const removableCount = filteredRows.filter((tc) => memberIds.has(tc.id)).length;

  return (
    <div className="plan-case-catalog" data-testid="plan-case-catalog">
      {mode === "selection" ? (
        <SelectionBar
          count={pickedIds.size}
          onClear={() => {
            if (!onPickToggle) return;
            for (const id of [...pickedIds]) onPickToggle(id, false);
          }}
        />
      ) : null}

      <div className="plan-case-catalog-scroll">
        <table className="projects-table projects-table--dense plan-case-table" data-testid="plan-case-table">
          <thead>
            <tr className="plan-case-filters-row">
              <th colSpan={colCount} scope="colgroup">
                <div className="plan-case-filters-inline">
                  <label className="plan-case-filter-cell">
                    <span className="plan-case-filter-label">Search</span>
                    <input
                      type="search"
                      value={search}
                      onChange={(e) => onSearchChange(e.target.value)}
                      placeholder="Key or title"
                      data-testid="plan-case-filter"
                    />
                  </label>
                  {mode === "membership" ? (
                    <label className="plan-case-filter-cell">
                      <span className="plan-case-filter-label">Membership</span>
                      <select
                        value={membershipFilter}
                        onChange={(e) => onMembershipFilterChange(e.target.value as PlanMembershipFilter)}
                        data-testid="plan-case-membership-filter"
                      >
                        <option value="all">All</option>
                        <option value="in_plan">In plan</option>
                        <option value="not_in_plan">Not in plan</option>
                      </select>
                    </label>
                  ) : null}
                  {mode === "membership" ? (
                    <label className="plan-case-filter-cell">
                      <span className="plan-case-filter-label">Type</span>
                      <select
                        value={typeFilter}
                        onChange={(e) => onTypeFilterChange(e.target.value as CaseTypeFilter)}
                        data-testid="plan-case-type-filter"
                      >
                        <option value="manual">Manual</option>
                        <option value="automated">Automated</option>
                        <option value="all">All</option>
                      </select>
                    </label>
                  ) : null}
                  <label className="plan-case-filter-cell">
                    <span className="plan-case-filter-label">Epic</span>
                    <select value={epicFilterId} onChange={(e) => onEpicFilterChange(e.target.value)} data-testid="plan-case-epic-filter">
                      <option value="">All</option>
                      {epics.map((epic) => (
                        <option key={epic.id} value={epic.id}>
                          {epic.externalKey}
                        </option>
                      ))}
                    </select>
                  </label>
                  {mode === "membership" && onAddAllMatching ? (
                    <button
                      type="button"
                      disabled={bulkPending || addableCount === 0}
                      onClick={onAddAllMatching}
                      data-testid="plan-case-add-all-matching"
                    >
                      Add all matching ({addableCount})
                    </button>
                  ) : null}
                  {mode === "membership" && onRemoveAllMatching ? (
                    <button
                      type="button"
                      disabled={bulkPending || removableCount === 0}
                      onClick={onRemoveAllMatching}
                      data-testid="plan-case-remove-all-matching"
                    >
                      Remove all matching ({removableCount})
                    </button>
                  ) : null}
                  {mode === "selection" && onPickAllMatching ? (
                    <button type="button" onClick={onPickAllMatching} data-testid="plan-case-select-all-matching">
                      Select all matching ({filteredRows.length})
                    </button>
                  ) : null}
                </div>
              </th>
            </tr>
            <tr>
              <th scope="col" className="plan-case-col-check">
                {mode === "selection" ? "Pick" : "In plan"}
              </th>
              <th scope="col">Key</th>
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Auto</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <PageLoading />
                </td>
              </tr>
            ) : null}
            {!loading && filteredRows.length === 0 ? (
              <tr>
                <td colSpan={colCount}>
                  <p className="projects-empty">No test cases match these filters.</p>
                </td>
              </tr>
            ) : null}
            {filteredRows.map((tc) => {
              const inPlan = memberIds.has(tc.id);
              const picked = pickedIds.has(tc.id);
              const autoCount = tc.type === "manual" ? (linkedAutomatedCountByManual.get(tc.id) ?? 0) : 0;
              return (
                <tr key={tc.id} data-testid="plan-case-row" data-testcase-id={tc.id} className={inPlan ? "plan-case-row--in-plan" : undefined}>
                  <td>
                    <input
                      type="checkbox"
                      checked={mode === "selection" ? picked : inPlan}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (mode === "selection") {
                          onPickToggle?.(tc.id, e.target.checked);
                        } else {
                          onMembershipToggle(tc.id, e.target.checked);
                        }
                      }}
                      data-testid={mode === "selection" ? `plan-case-select-${tc.id}` : `plan-case-member-${tc.id}`}
                      aria-label={
                        mode === "selection"
                          ? `Select ${tc.title}`
                          : inPlan
                            ? `Remove ${tc.title} from plan`
                            : `Add ${tc.title} to plan`
                      }
                    />
                  </td>
                  <td>{tc.externalKey ? <code>{tc.externalKey}</code> : "—"}</td>
                  <td>
                    {mode === "membership" && onQuickView ? (
                      <button
                        type="button"
                        className="plan-case-title-button clamp-2"
                        onClick={() => onQuickView(tc)}
                        data-testid={`plan-case-quick-view-${tc.id}`}
                      >
                        {tc.title}
                      </button>
                    ) : (
                      <div className="clamp-2">{tc.title}</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${tc.type === "automated" ? "active" : ""}`}>{tc.type}</span>
                  </td>
                  <td>
                    {tc.type === "manual" ? (
                      <AutomationCoverageIcon automationStatus={tc.automationStatus} linkedAutomatedCount={autoCount} />
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
