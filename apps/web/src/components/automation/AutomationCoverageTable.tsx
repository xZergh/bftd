import { Fragment, useCallback, useState } from "react";
import { RouterLink } from "../../tamagui/RouterLink";
import { PageLoading } from "../PageLoading";
import { SortableTh } from "../requirements/requirementsTableHelpers";
import { AutomationStatusBadge } from "./AutomationStatusBadge";
import type { LinkedAutomatedTest } from "../../automation/automationStatus";
import type { TestCaseListItem } from "../../graphql/types";

type SortApi = {
  sorted: TestCaseListItem[];
  sortKey: string;
  sortDir: "asc" | "desc";
  toggleSort: (key: string) => void;
};

type Props = {
  projectId: string;
  rows: TestCaseListItem[];
  loading: boolean;
  selectedManualId: string | null;
  linkedAutomatedByManual: Map<string, LinkedAutomatedTest[]>;
  sort: SortApi;
  onSelectManual: (id: string) => void;
  onSelectAutomated: (id: string) => void;
};

export function AutomationCoverageTable({
  projectId,
  rows,
  loading,
  selectedManualId,
  linkedAutomatedByManual,
  sort,
  onSelectManual,
  onSelectAutomated
}: Props) {
  const [expandedManualIds, setExpandedManualIds] = useState<Set<string>>(() => new Set());

  const toggleExpanded = useCallback((manualId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedManualIds((prev) => {
      const next = new Set(prev);
      if (next.has(manualId)) {
        next.delete(manualId);
      } else {
        next.add(manualId);
      }
      return next;
    });
  }, []);

  return (
    <section className="automation-section" data-testid="automation-coverage-section">
      <p className="automation-section-hint">
        Track automation status per manual test. Expand a row to see linked automated tests.
      </p>
      <table className="projects-table projects-table--dense automation-coverage-table">
        <thead>
          <tr>
            <th scope="col" className="automation-expand-col" aria-label="Expand" />
            <SortableTh
              label="Key"
              sortKey="externalKey"
              activeSortKey={sort.sortKey}
              sortDir={sort.sortDir}
              onSort={sort.toggleSort}
            />
            <SortableTh
              label="Title"
              sortKey="title"
              activeSortKey={sort.sortKey}
              sortDir={sort.sortDir}
              onSort={sort.toggleSort}
            />
            <SortableTh
              label="Automation"
              sortKey="automationStatus"
              activeSortKey={sort.sortKey}
              sortDir={sort.sortDir}
              onSort={sort.toggleSort}
            />
            <th scope="col"> </th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <PageLoading />
              </td>
            </tr>
          ) : null}
          {!loading && rows.length === 0 ? (
            <tr data-testid="automation-manual-empty">
              <td colSpan={5}>
                <p className="projects-empty">No manual test cases yet.</p>
              </td>
            </tr>
          ) : null}
          {sort.sorted.map((t) => {
            const linked = linkedAutomatedByManual.get(t.id) ?? [];
            const expanded = expandedManualIds.has(t.id);
            const canExpand = linked.length > 0;

            return (
              <Fragment key={t.id}>
                <tr
                  data-testid="automation-manual-row"
                  data-testcase-id={t.id}
                  className={selectedManualId === t.id ? "projects-table-row--selected" : undefined}
                  onClick={() => onSelectManual(t.id)}
                >
                  <td className="automation-expand-col">
                    {canExpand ? (
                      <button
                        type="button"
                        className="automation-expand-toggle"
                        aria-expanded={expanded}
                        aria-label={expanded ? "Collapse automated tests" : "Expand automated tests"}
                        onClick={(e) => toggleExpanded(t.id, e)}
                        data-testid={`automation-expand-${t.id}`}
                      >
                        {expanded ? "▾" : "▸"}
                      </button>
                    ) : (
                      <span className="automation-expand-spacer" aria-hidden="true" />
                    )}
                  </td>
                  <td>{t.externalKey ? <code>{t.externalKey}</code> : "—"}</td>
                  <td>
                    <div className="clamp-4">{t.title}</div>
                  </td>
                  <td>
                    <AutomationStatusBadge status={t.automationStatus} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <RouterLink to={`/projects/${projectId}/test-cases/${t.id}`}>Manual TC</RouterLink>
                  </td>
                </tr>
                {expanded && canExpand ? (
                  <tr className="automation-nested-row" data-testid="automation-linked-row">
                    <td colSpan={5}>
                      <table className="projects-table projects-table--dense automation-nested-table">
                        <caption className="automation-nested-caption">
                          Automated tests linked to {t.externalKey ?? t.title}
                        </caption>
                        <thead>
                          <tr>
                            <th scope="col">Key</th>
                            <th scope="col">Title</th>
                            <th scope="col">Automation ID</th>
                            <th scope="col"> </th>
                          </tr>
                        </thead>
                        <tbody>
                          {linked.map((auto) => (
                            <tr
                              key={auto.id}
                              data-testid="automation-linked-auto-row"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectAutomated(auto.id);
                              }}
                            >
                              <td>{auto.externalKey ? <code>{auto.externalKey}</code> : "—"}</td>
                              <td>{auto.title}</td>
                              <td>{auto.externalId ? <code>{auto.externalId}</code> : "—"}</td>
                              <td>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectAutomated(auto.id);
                                  }}
                                  data-testid={`automation-linked-steps-${auto.id}`}
                                >
                                  Steps
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
