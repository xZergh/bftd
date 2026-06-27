import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { SplitWorkspace } from "../components/workspace/SplitWorkspace";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { CreateTestRunMutation, TestPlansListQuery, TestRunsListQuery } from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { TestPlanListItem, TestRunListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function TestRunsListPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const creatingRun = searchParams.get("new") === "1";
  const planFromUrl = searchParams.get("plan") ?? "";
  const [runName, setRunName] = useState("");
  const [testPlanId, setTestPlanId] = useState("");
  const [executeAutomation, setExecuteAutomation] = useState(false);
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

  const closeCreateModal = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("new");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const openCreatePanel = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.set("new", "1");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  useEffect(() => {
    if (planFromUrl !== "") {
      setTestPlanId(planFromUrl);
    }
  }, [planFromUrl]);

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
          testPlanId: testPlanId || null,
          executeAutomation: executeAutomation || null
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
        testPlanId: testPlanId || undefined,
        executeAutomation: executeAutomation && testPlanId !== "" ? true : undefined
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
    const runId = res.data?.createTestRun?.run?.id;
    setRunName("");
    setTestPlanId("");
    setExecuteAutomation(false);
    closeCreateModal();
    reexecuteList({ requestPolicy: "network-only" });
    if (runId) {
      navigate(`/projects/${projectId}/runs/${runId}`);
    }
  }, [
    clearShellMessages,
    closeCreateModal,
    createRun,
    executeAutomation,
    navigate,
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

  const createRunFields = (
    <div className="projects-create-fields">
      <label>
        Name <span className="required-star" aria-hidden="true">*</span>
        <input
          className="detail-title-input"
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
      <label className="projects-checkbox-label">
        <input
          type="checkbox"
          checked={executeAutomation}
          disabled={testPlanId === ""}
          onChange={(e) => setExecuteAutomation(e.target.checked)}
          data-testid="run-create-execute-automation"
        />
        Execute automated tests after create
      </label>
      <p className="automation-section-hint">
        Off by default. When enabled, Playwright runs in the background for automated cases in the selected plan. Results appear under Runs; HTML report attaches below run details.
      </p>
    </div>
  );

  const table = (
    <table className="projects-table" data-testid="runs-table">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Created</th>
          <th scope="col"> </th>
        </tr>
      </thead>
      <tbody>
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
  );

  const inspector = creatingRun ? (
    <section className="plan-edit-panel" data-testid="run-create-panel">
      <div className="detail-panel-header">
        <button type="button" className="detail-panel-close" onClick={closeCreateModal}>
          Close
        </button>
      </div>
      <h3 className="projects-subheading">Create run</h3>
      {createRunFields}
      <ValidationErrorPayloadPreview open={showValidationPayload} payload={createRunClientPayload} />
      <div className="form-edit-actions">
        <button type="button" onClick={onCreateRun} data-testid="run-create-submit">
          Create run
        </button>
        <button type="button" onClick={closeCreateModal}>
          Cancel
        </button>
      </div>
    </section>
  ) : null;

  return (
    <section className="projects-page" data-testid="runs-page">
      <ProjectWorkspaceHeader title="Runs" titleId="runs-heading" projectId={projectId} active="runs" />
      <div className="projects-list-toolbar">
        <button type="button" onClick={openCreatePanel} data-testid="run-open-create-panel">
          Create run
        </button>
      </div>
      <SplitWorkspace sectionKey="runs" data-testid="runs-split" main={table} inspector={inspector} />
    </section>
  );
}
