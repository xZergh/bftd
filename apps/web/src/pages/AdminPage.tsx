import { useCallback, useMemo } from "react";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectsListQuery, PurgeArchivedProjectsMutation } from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import type { ProjectListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function AdminPage() {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [listResult, reexecuteList] = useQuery({
    query: ProjectsListQuery,
    variables: { includeArchived: true },
    requestPolicy: "network-only"
  });

  const [, purgeArchived] = useMutation(PurgeArchivedProjectsMutation);

  const archived = useMemo(() => {
    const rows: ProjectListItem[] = listResult.data?.projects ?? [];
    return rows.filter((p) => p.isArchived);
  }, [listResult.data?.projects]);

  const onPurge = useCallback(async () => {
    clearShellMessages();
    const res = await purgeArchived({});
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.purgeArchivedProjects?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    await reexecuteList({ requestPolicy: "network-only" });
  }, [clearShellMessages, purgeArchived, reexecuteList, setPayloadAppError, setTransportMessage]);

  return (
    <section className="projects-page admin-page" data-testid="admin-page">
      <h1 className="projects-subheading">Admin</h1>
      <p className="hint">Local maintenance utilities. Purging removes archived projects and all related data permanently.</p>

      <div className="admin-panel" data-testid="admin-purge-panel">
        <h2 className="projects-subheading">Archived projects</h2>
        {listResult.fetching ? <PageLoading dataTestId="admin-archived-loading" /> : null}
        {!listResult.fetching && archived.length === 0 ? (
          <p className="projects-empty" data-testid="admin-archived-empty">
            No archived projects.
          </p>
        ) : (
          <table className="projects-table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Name</th>
              </tr>
            </thead>
            <tbody>
              {archived.map((p) => (
                <tr key={p.id} data-testid="admin-archived-row" data-project-key={p.key}>
                  <td>
                    <code>{p.key}</code>
                  </td>
                  <td>{p.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="admin-actions">
          <button
            type="button"
            data-testid="admin-purge-archived"
            disabled={archived.length === 0}
            onClick={() => void onPurge()}
          >
            Purge all archived projects from database
          </button>
        </div>
      </div>
    </section>
  );
}
