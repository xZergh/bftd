import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { CreateTestRunMutation, TestRunsListQuery } from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { TestRunListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function TestRunsListPage() {
  const { projectId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [runName, setRunName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const paused = projectId === undefined || projectId === "";

  const [listResult, reexecuteList] = useQuery({
    query: TestRunsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [, createRun] = useMutation(CreateTestRunMutation);

  useEffect(() => {
    if (!listResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(listResult.error));
  }, [listResult.error, setTransportMessage]);

  const createRunClientPayload = useMemo(() => {
    return {
      mutation: "CreateTestRun",
      variables: {
        input: {
          projectId: projectId ?? null,
          name: runName.trim() || null
        }
      }
    };
  }, [projectId, runName]);

  const onCreateRun = useCallback(async () => {
    if (paused) {
      return;
    }
    clearShellMessages();
    if (!trimmedNonEmpty(runName.trim())) {
      setNameError(REQUIRED_MSG);
      setShowValidationPayload(true);
      return;
    }
    setNameError(null);
    setShowValidationPayload(false);
    const res = await createRun({
      input: {
        projectId: projectId!,
        name: runName.trim()
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.createTestRun?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setRunName("");
    reexecuteList({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    createRun,
    paused,
    projectId,
    reexecuteList,
    runName,
    setPayloadAppError,
    setTransportMessage
  ]);

  if (paused) {
    return null;
  }

  const rows: TestRunListItem[] = listResult.data?.testRuns ?? [];

  return (
    <section className="projects-page" data-testid="runs-page">
      <div className="project-detail-header">
        <h2 id="runs-heading">Test runs</h2>
        <Link to={`/projects/${projectId}`} data-testid="runs-back-project">
          ← Project
        </Link>
      </div>

      <div className="projects-create" data-testid="run-create-panel">
        <h3 className="projects-subheading">New run</h3>
        <div className="projects-create-fields">
          <label>
            Name <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={runName}
              onChange={(e) => {
                setRunName(e.target.value);
                setNameError(null);
                setShowValidationPayload(false);
              }}
              data-testid="run-create-name"
              autoComplete="off"
            />
            {nameError !== null && (
              <p className="field-error" role="alert" data-testid="run-create-name-error">
                {nameError}
              </p>
            )}
          </label>
        </div>
        <ValidationErrorPayloadPreview open={showValidationPayload} payload={createRunClientPayload} />
        <button type="button" onClick={onCreateRun} data-testid="run-create-submit">
          Create run
        </button>
      </div>

      {listResult.fetching && <PageLoading dataTestId="runs-list-loading" />}

      {rows.length === 0 && !listResult.fetching ? (
        <p className="projects-empty" data-testid="runs-list-empty">
          No runs yet.
        </p>
      ) : (
        <table className="projects-table" data-testid="runs-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Created</th>
              <th scope="col"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid="run-row" data-run-id={r.id}>
                <td>{r.name}</td>
                <td>
                  <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time>
                </td>
                <td>
                  <Link to={`/projects/${projectId}/runs/${r.id}`} data-testid="run-open">
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
