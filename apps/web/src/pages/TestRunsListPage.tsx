import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { CreateTestRunMutation, TestPlansListQuery, TestRunsListQuery } from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { TestPlanListItem, TestRunListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function TestRunsListPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [runName, setRunName] = useState("");
  const [testPlanId, setTestPlanId] = useState("");
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
  const [plansResult] = useQuery({
    query: TestPlansListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  useEffect(() => {
    setCreateModalOpen(searchParams.get("new") === "1");
  }, [searchParams]);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("new");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

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
          name: runName.trim() || null,
          testPlanId: testPlanId || null
        }
      }
    };
  }, [projectId, runName, testPlanId]);

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
        name: runName.trim(),
        testPlanId: testPlanId || undefined
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
    setTestPlanId("");
    closeCreateModal();
    reexecuteList({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    closeCreateModal,
    createRun,
    paused,
    projectId,
    reexecuteList,
    runName,
    testPlanId,
    setPayloadAppError,
    setTransportMessage
  ]);

  if (paused) {
    return null;
  }

  const rows: TestRunListItem[] = listResult.data?.testRuns ?? [];
  const planRows: TestPlanListItem[] = plansResult.data?.testPlans ?? [];

  const modalRunNameFields = (
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
      <label>
        Plan (optional)
        <select
          value={testPlanId}
          onChange={(e) => setTestPlanId(e.target.value)}
          data-testid="run-create-test-plan-id"
        >
          <option value="">No plan</option>
          {planRows.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );

  return (
    <section className="projects-page" data-testid="runs-page">
      <ProjectWorkspaceHeader title="Runs" titleId="runs-heading" projectId={projectId} active="runs" />

      {createModalOpen ? (
        <div
          className="projects-modal-backdrop"
          role="presentation"
          data-testid="run-create-dialog"
          onClick={closeCreateModal}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              closeCreateModal();
            }
          }}
        >
          <div
            className="projects-create-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="run-create-dialog-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="run-create-dialog-title" className="projects-subheading">
              New run
            </h3>
            {modalRunNameFields}
            <ValidationErrorPayloadPreview open={showValidationPayload} payload={createRunClientPayload} />
            <button type="button" onClick={onCreateRun} data-testid="run-create-submit">
              Create run
            </button>
          </div>
        </div>
      ) : null}

      <table className="projects-table" data-testid="runs-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Created</th>
            <th scope="col"> </th>
          </tr>
        </thead>
        <tbody>
          {!createModalOpen ? (
            <>
              <tr className="projects-table-create-row" data-testid="run-create-row">
                <td data-testid="run-create-panel">
                  <div className="projects-table-inline-field">
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
                      aria-label="Run name"
                      placeholder="Name"
                      className="projects-table-inline-input"
                    />
                    {nameError !== null && (
                      <p className="field-error" role="alert" data-testid="run-create-name-error">
                        {nameError}
                      </p>
                    )}
                    <select
                      value={testPlanId}
                      onChange={(e) => setTestPlanId(e.target.value)}
                      data-testid="run-create-test-plan-id"
                      className="projects-table-inline-input"
                    >
                      <option value="">No plan</option>
                      {planRows.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="projects-table-muted-cell">—</td>
                <td>
                  <button type="button" onClick={onCreateRun} data-testid="run-create-submit">
                    Create run
                  </button>
                </td>
              </tr>
              {showValidationPayload ? (
                <tr className="projects-table-create-meta-row" data-testid="run-create-validation-row">
                  <td colSpan={3}>
                    <ValidationErrorPayloadPreview open={showValidationPayload} payload={createRunClientPayload} />
                  </td>
                </tr>
              ) : null}
            </>
          ) : null}
          {listResult.fetching && rows.length === 0 ? (
            <tr data-testid="runs-list-loading">
              <td colSpan={3}>
                <PageLoading />
              </td>
            </tr>
          ) : null}
          {!listResult.fetching && rows.length === 0 ? (
            <tr data-testid="runs-list-empty">
              <td colSpan={3}>
                <p className="projects-empty">No runs yet.</p>
              </td>
            </tr>
          ) : null}
          {rows.map((r) => (
            <tr key={r.id} data-testid="run-row" data-run-id={r.id}>
              <td>{r.name}</td>
              <td>
                <time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleString()}</time>
              </td>
              <td>
                <RouterLink to={`/projects/${projectId}/runs/${r.id}`} data-testid="run-open">
                  Open
                </RouterLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
