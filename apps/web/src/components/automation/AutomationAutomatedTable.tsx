import { PageLoading } from "../PageLoading";

import { SortableTh } from "../requirements/requirementsTableHelpers";

import type { TestCaseListItem } from "../../graphql/types";

import { RouterLink } from "../../tamagui/RouterLink";



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

  selectedAutoId: string | null;

  linkedManualCountByAuto: Map<string, number>;

  sort: SortApi;

  onSelectAutomated: (id: string) => void;

};



export function AutomationAutomatedTable({

  projectId,

  rows,

  loading,

  selectedAutoId,

  linkedManualCountByAuto,

  sort,

  onSelectAutomated

}: Props) {

  return (

    <section className="automation-section" data-testid="automation-automated-section">

      <p className="automation-section-hint">

        All automated tests in this project. Select a row to read Allure-style steps in the panel.

      </p>

      <table className="projects-table projects-table--dense">

        <thead>

          <tr>

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

              label="Automation ID"

              sortKey="externalId"

              activeSortKey={sort.sortKey}

              sortDir={sort.sortDir}

              onSort={sort.toggleSort}

            />

            <SortableTh

              label="Manual links"

              sortKey="linkedManual"

              activeSortKey={sort.sortKey}

              sortDir={sort.sortDir}

              onSort={sort.toggleSort}

            />

          </tr>

        </thead>

        <tbody>

          {loading && rows.length === 0 ? (

            <tr>

              <td colSpan={4}>

                <PageLoading />

              </td>

            </tr>

          ) : null}

          {!loading && rows.length === 0 ? (

            <tr data-testid="automation-automated-empty">

              <td colSpan={4}>

                <p className="projects-empty">

                  No automated tests yet. Import via{" "}

                  <RouterLink to={`/projects/${projectId}/imports`}>Imports</RouterLink>.

                </p>

              </td>

            </tr>

          ) : null}

          {sort.sorted.map((t) => (

            <tr

              key={t.id}

              data-testid="automation-automated-row"

              data-testcase-id={t.id}

              className={selectedAutoId === t.id ? "projects-table-row--selected" : undefined}

              onClick={() => onSelectAutomated(t.id)}

            >

              <td>{t.externalKey ? <code>{t.externalKey}</code> : "—"}</td>

              <td>

                <div className="clamp-4">{t.title}</div>

              </td>

              <td>{t.externalId ? <code>{t.externalId}</code> : "—"}</td>

              <td>{linkedManualCountByAuto.get(t.id) ?? 0}</td>

            </tr>

          ))}

        </tbody>

      </table>

    </section>

  );

}


