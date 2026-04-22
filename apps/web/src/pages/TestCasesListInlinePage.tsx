import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  CreateAutomatedTestCaseMutation,
  CreateManualTestCaseMutation,
  RequirementsListQuery,
  TestCasesListQuery
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { RequirementListItem, TestCaseListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

type StepDraft = { name: string; expectedResult: string };

export function TestCasesListInlinePage() {
  const { projectId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [typeFilter, setTypeFilter] = useState<"" | "manual" | "automated">("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [createType, setCreateType] = useState<"manual" | "automated">("manual");
  const [title, setTitle] = useState("");
  const [manualReqIds, setManualReqIds] = useState<string[]>([]);
  const [manualIds, setManualIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepDraft[]>([{ name: "", expectedResult: "" }]);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [manualReqError, setManualReqError] = useState<string | null>(null);
  const [manualIdsError, setManualIdsError] = useState<string | null>(null);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const paused = projectId === undefined || projectId === "";
  const [deferQueries, setDeferQueries] = useState(true);
  useEffect(() => {
    if (paused) {
      return;
    }
    setDeferQueries(true);
    queueMicrotask(() => {
      setDeferQueries(false);
    });
  }, [paused, projectId]);

  const queryPaused = paused || deferQueries;
  const [listResult, reexecuteCases] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", type: typeFilter === "" ? undefined : typeFilter, includeDeleted },
    pause: queryPaused,
    requestPolicy: "network-only"
  });
  const [reqResult] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: queryPaused,
    requestPolicy: "network-only"
  });
  const [manualListResult, reexecuteManualList] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", type: "manual", includeDeleted: false },
    pause: queryPaused,
    requestPolicy: "network-only"
  });
  const [, createManual] = useMutation(CreateManualTestCaseMutation);
  const [, createAutomated] = useMutation(CreateAutomatedTestCaseMutation);

  useEffect(() => {
    if (!listResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(listResult.error));
  }, [listResult.error, setTransportMessage]);

  const createManualClientPayload = useMemo(() => {
    return {
      mutation: "CreateManualTestCase",
      variables: {
        input: {
          projectId: projectId ?? null,
          title: title.trim() || null,
          requirementIds: manualReqIds,
          steps: steps.map((s) => ({
            name: s.name.trim() || null,
            expectedResult: s.expectedResult.trim() === "" ? null : s.expectedResult.trim()
          }))
        }
      }
    };
  }, [manualReqIds, projectId, steps, title]);

  const createAutomatedClientPayload = useMemo(() => {
    return {
      mutation: "CreateAutomatedTestCase",
      variables: { input: { projectId: projectId ?? null, title: title.trim() || null, manualTestCaseIds: manualIds } }
    };
  }, [manualIds, projectId, title]);

  const createPayload = createType === "manual" ? createManualClientPayload : createAutomatedClientPayload;
  const showExtendedCreate = trimmedNonEmpty(title.trim());

  const onCreate = useCallback(async () => {
    if (paused || deferQueries) {
      return;
    }
    clearShellMessages();
    let invalid = false;
    if (!trimmedNonEmpty(title.trim())) {
      setTitleError(REQUIRED_MSG);
      invalid = true;
    } else {
      setTitleError(null);
    }
    if (createType === "manual") {
      if (manualReqIds.length === 0) {
        setManualReqError("Select at least one requirement.");
        invalid = true;
      } else {
        setManualReqError(null);
      }
      const filledSteps = steps.map((s) => s.name.trim()).filter((s) => s.length > 0);
      if (filledSteps.length === 0) {
        setStepsError("Add at least one step with a name.");
        invalid = true;
      } else {
        setStepsError(null);
      }
    } else {
      if (manualIds.length === 0) {
        setManualIdsError("Select at least one manual test case.");
        invalid = true;
      } else {
        setManualIdsError(null);
      }
    }
    if (invalid) {
      setShowValidationPayload(true);
      return;
    }
    setShowValidationPayload(false);

    if (createType === "manual") {
      const filledSteps = steps
        .map((s) => ({ name: s.name.trim(), expectedResult: s.expectedResult.trim() }))
        .filter((s) => s.name.length > 0);
      const res = await createManual({
        input: {
          projectId: projectId!,
          title: title.trim(),
          requirementIds: manualReqIds,
          steps: filledSteps.map((s) => ({ name: s.name, expectedResult: s.expectedResult || undefined }))
        }
      });
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        return;
      }
      const appErr = res.data?.createManualTestCase?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        return;
      }
      reexecuteManualList({ requestPolicy: "network-only" });
    } else {
      const res = await createAutomated({ input: { projectId: projectId!, title: title.trim(), manualTestCaseIds: manualIds } });
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        return;
      }
      const appErr = res.data?.createAutomatedTestCase?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        return;
      }
    }

    setTitle("");
    setManualReqIds([]);
    setManualIds([]);
    setSteps([{ name: "", expectedResult: "" }]);
    setTitleError(null);
    setManualReqError(null);
    setManualIdsError(null);
    setStepsError(null);
    reexecuteCases({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    createAutomated,
    createManual,
    createType,
    deferQueries,
    manualIds,
    manualReqIds,
    paused,
    projectId,
    reexecuteCases,
    reexecuteManualList,
    setPayloadAppError,
    setTransportMessage,
    steps,
    title
  ]);

  if (paused) {
    return null;
  }
  if (deferQueries) {
    return (
      <section className="projects-page" data-testid="testcases-page">
        <PageLoading />
      </section>
    );
  }

  const requirements: RequirementListItem[] = reqResult.data?.requirements ?? [];
  const manualsForAuto: TestCaseListItem[] = manualListResult.data?.testCases ?? [];
  const rows: TestCaseListItem[] = listResult.data?.testCases ?? [];

  return (
    <section className="projects-page" data-testid="testcases-page">
      <ProjectWorkspaceHeader title="Test cases" titleId="testcases-heading" projectId={projectId} active="test-cases" />

      <div className="projects-list-toolbar">
        <label className="projects-checkbox-label">
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)} data-testid="testcase-list-type-filter">
            <option value="">All</option>
            <option value="manual">Manual</option>
            <option value="automated">Automated</option>
          </select>
        </label>
        <label className="projects-checkbox-label">
          <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} data-testid="testcase-list-include-deleted" />
          Show deleted
        </label>
        {listResult.fetching && <PageLoading inline dataTestId="testcases-list-loading" />}
      </div>

      <table className="projects-table">
        <thead>
          <tr>
            <th scope="col">Type</th>
            <th scope="col">Title</th>
            <th scope="col"> </th>
          </tr>
        </thead>
        <tbody>
          <tr className="projects-table-create-row" data-testid="testcase-create-row">
            <td>
              <div className="projects-table-inline-field">
                <select
                  value={createType}
                  onChange={(e) => {
                    setCreateType(e.target.value as "manual" | "automated");
                    setManualReqError(null);
                    setManualIdsError(null);
                    setStepsError(null);
                    setShowValidationPayload(false);
                  }}
                  className="projects-table-inline-input"
                  data-testid="testcase-create-type"
                  aria-label="Test case type"
                >
                  <option value="manual">manual</option>
                  <option value="automated">automated</option>
                </select>
              </div>
            </td>
            <td>
              <div className="projects-table-inline-field">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTitleError(null);
                    setShowValidationPayload(false);
                  }}
                  className="projects-table-inline-input"
                  data-testid="testcase-create-title"
                  aria-label="Title"
                  placeholder="Title"
                />
                {titleError !== null && <p className="field-error" role="alert" data-testid="testcase-create-title-error">{titleError}</p>}
              </div>
            </td>
            <td>
              <button type="button" onClick={onCreate} data-testid="testcase-create-submit">
                Create {createType}
              </button>
            </td>
          </tr>

          {showExtendedCreate && createType === "manual" ? (
            <tr className="projects-table-create-row">
              <td colSpan={3}>
                <div className="projects-table-inline-field">
                  <span>
                    Linked requirements <span className="required-star" aria-hidden="true">*</span>
                  </span>
                  {requirements.length === 0 ? (
                    <p className="hint">No requirements in this project yet.</p>
                  ) : (
                    <ul className="testcase-req-checklist" data-testid="testcase-create-manual-requirements">
                      {requirements.map((r) => {
                        const checked = manualReqIds.includes(r.id);
                        return (
                          <li key={r.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setManualReqIds((prev) =>
                                    prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]
                                  );
                                  setManualReqError(null);
                                  setShowValidationPayload(false);
                                }}
                                data-testid={`testcase-create-manual-req-${r.externalKey}`}
                              />
                              <code>{r.externalKey}</code> - {r.title} {checked ? "(selected)" : "(unselected)"}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {manualReqError !== null && <p className="field-error" role="alert" data-testid="testcase-create-manual-req-error">{manualReqError}</p>}
                </div>
              </td>
            </tr>
          ) : null}

          {showExtendedCreate && createType === "automated" ? (
            <tr className="projects-table-create-row">
              <td colSpan={3}>
                <div className="projects-table-inline-field">
                  <span>
                    Linked test cases <span className="required-star" aria-hidden="true">*</span>
                  </span>
                  {manualsForAuto.length === 0 ? (
                    <p className="hint">Create a manual test case first.</p>
                  ) : (
                    <ul className="testcase-req-checklist" data-testid="testcase-create-auto-manuals">
                      {manualsForAuto.map((m) => {
                        const checked = manualIds.includes(m.id);
                        return (
                          <li key={m.id}>
                            <label>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setManualIds((prev) =>
                                    prev.includes(m.id) ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                                  );
                                  setManualIdsError(null);
                                  setShowValidationPayload(false);
                                }}
                                data-testid={`testcase-create-auto-manual-${m.id}`}
                              />
                              {m.title} {checked ? "(selected)" : "(unselected)"}
                            </label>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {manualIdsError !== null && <p className="field-error" role="alert" data-testid="testcase-create-auto-manual-error">{manualIdsError}</p>}
                </div>
              </td>
            </tr>
          ) : null}

          {showExtendedCreate && createType === "manual" ? (
            <tr className="projects-table-create-row">
              <td colSpan={3}>
                <div className="testcase-steps-editor" data-testid="testcase-create-steps">
                  <span className="projects-subheading">Steps</span>
                  {steps.map((s, i) => (
                    <div key={i} className="testcase-step-row">
                      <label>
                        Step {i + 1} name <span className="required-star" aria-hidden="true">*</span>
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => {
                            const next = [...steps];
                            next[i] = { ...next[i]!, name: e.target.value };
                            setSteps(next);
                            setStepsError(null);
                            setShowValidationPayload(false);
                          }}
                          data-testid={`testcase-create-manual-step-name-${i}`}
                        />
                      </label>
                      <label>
                        Expected (optional)
                        <input
                          type="text"
                          value={s.expectedResult}
                          onChange={(e) => {
                            const next = [...steps];
                            next[i] = { ...next[i]!, expectedResult: e.target.value };
                            setSteps(next);
                          }}
                          data-testid={`testcase-create-manual-step-expected-${i}`}
                        />
                      </label>
                      {steps.length > 1 ? (
                        <button type="button" className="testcase-step-remove" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
                          Remove step
                        </button>
                      ) : null}
                    </div>
                  ))}
                  <button type="button" onClick={() => setSteps([...steps, { name: "", expectedResult: "" }])} data-testid="testcase-create-manual-step-add">
                    Add step
                  </button>
                  {stepsError !== null && <p className="field-error" role="alert" data-testid="testcase-create-manual-steps-error">{stepsError}</p>}
                </div>
              </td>
            </tr>
          ) : null}

          {showValidationPayload ? (
            <tr className="projects-table-create-meta-row">
              <td colSpan={3}>
                <ValidationErrorPayloadPreview open={showValidationPayload} payload={createPayload} />
              </td>
            </tr>
          ) : null}

          {listResult.fetching && rows.length === 0 ? (
            <tr data-testid="testcases-list-loading">
              <td colSpan={3}>
                <PageLoading />
              </td>
            </tr>
          ) : null}
          {!listResult.fetching && rows.length === 0 ? (
            <tr data-testid="testcases-list-empty">
              <td colSpan={3}>
                <p className="projects-empty">No test cases yet.</p>
              </td>
            </tr>
          ) : null}
          {rows.map((t) => (
            <tr key={t.id} data-testid="testcase-row" data-testcase-id={t.id}>
              <td>
                <span className="badge active" data-testid="testcase-row-type">
                  {t.type}
                </span>
                {t.isDeleted ? (
                  <span className="badge deleted" data-testid="testcase-row-deleted-badge">
                    Deleted
                  </span>
                ) : null}
              </td>
              <td>{t.title}</td>
              <td>
                <RouterLink to={`/projects/${projectId}/test-cases/${t.id}`} data-testid="testcase-open">
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
