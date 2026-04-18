import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
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

export function TestCasesListPage() {
  const { projectId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [typeFilter, setTypeFilter] = useState<"" | "manual" | "automated">("");
  const [includeDeleted, setIncludeDeleted] = useState(false);

  const [manualTitle, setManualTitle] = useState("");
  const [manualReqIds, setManualReqIds] = useState<string[]>([]);
  const [manualSteps, setManualSteps] = useState<StepDraft[]>([{ name: "", expectedResult: "" }]);
  const [manualTitleError, setManualTitleError] = useState<string | null>(null);
  const [manualReqError, setManualReqError] = useState<string | null>(null);
  const [manualStepsError, setManualStepsError] = useState<string | null>(null);
  const [showManualPayload, setShowManualPayload] = useState(false);

  const [autoTitle, setAutoTitle] = useState("");
  const [autoManualIds, setAutoManualIds] = useState<string[]>([]);
  const [autoTitleError, setAutoTitleError] = useState<string | null>(null);
  const [autoManualError, setAutoManualError] = useState<string | null>(null);
  const [showAutoPayload, setShowAutoPayload] = useState(false);

  const paused = projectId === undefined || projectId === "";

  const [listResult, reexecuteCases] = useQuery({
    query: TestCasesListQuery,
    variables: {
      projectId: projectId ?? "",
      type: typeFilter === "" ? undefined : typeFilter,
      includeDeleted
    },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [reqResult] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [manualListResult, reexecuteManualList] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", type: "manual", includeDeleted: false },
    pause: paused,
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
    const steps = manualSteps.map((s) => ({
      name: s.name.trim(),
      expectedResult: s.expectedResult.trim() === "" ? null : s.expectedResult.trim()
    }));
    return {
      mutation: "CreateManualTestCase",
      variables: {
        input: {
          projectId: projectId ?? null,
          title: manualTitle.trim() || null,
          requirementIds: manualReqIds,
          steps: steps.map((s) => ({ name: s.name || null, expectedResult: s.expectedResult }))
        }
      }
    };
  }, [manualReqIds, manualSteps, manualTitle, projectId]);

  const createAutomatedClientPayload = useMemo(() => {
    return {
      mutation: "CreateAutomatedTestCase",
      variables: {
        input: {
          projectId: projectId ?? null,
          title: autoTitle.trim() || null,
          manualTestCaseIds: autoManualIds
        }
      }
    };
  }, [autoManualIds, autoTitle, projectId]);

  const onCreateManual = useCallback(async () => {
    if (paused) {
      return;
    }
    clearShellMessages();
    let invalid = false;
    if (!trimmedNonEmpty(manualTitle.trim())) {
      setManualTitleError(REQUIRED_MSG);
      invalid = true;
    } else {
      setManualTitleError(null);
    }
    if (manualReqIds.length === 0) {
      setManualReqError("Select at least one requirement.");
      invalid = true;
    } else {
      setManualReqError(null);
    }
    const filledSteps = manualSteps
      .map((s) => ({ name: s.name.trim(), expectedResult: s.expectedResult.trim() }))
      .filter((s) => s.name.length > 0);
    if (filledSteps.length === 0) {
      setManualStepsError("Add at least one step with a name.");
      invalid = true;
    } else {
      setManualStepsError(null);
    }
    if (invalid) {
      setShowManualPayload(true);
      return;
    }
    setShowManualPayload(false);
    const res = await createManual({
      input: {
        projectId: projectId!,
        title: manualTitle.trim(),
        requirementIds: manualReqIds,
        steps: filledSteps.map((s) => ({
          name: s.name,
          expectedResult: s.expectedResult === "" ? undefined : s.expectedResult
        }))
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
    setManualTitle("");
    setManualReqIds([]);
    setManualSteps([{ name: "", expectedResult: "" }]);
    reexecuteCases({ requestPolicy: "network-only" });
    reexecuteManualList({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    createManual,
    manualReqIds,
    manualSteps,
    manualTitle,
    paused,
    projectId,
    reexecuteCases,
    reexecuteManualList,
    setPayloadAppError,
    setTransportMessage
  ]);

  const onCreateAutomated = useCallback(async () => {
    if (paused) {
      return;
    }
    clearShellMessages();
    let invalid = false;
    if (!trimmedNonEmpty(autoTitle.trim())) {
      setAutoTitleError(REQUIRED_MSG);
      invalid = true;
    } else {
      setAutoTitleError(null);
    }
    if (autoManualIds.length === 0) {
      setAutoManualError("Select at least one manual test case.");
      invalid = true;
    } else {
      setAutoManualError(null);
    }
    if (invalid) {
      setShowAutoPayload(true);
      return;
    }
    setShowAutoPayload(false);
    const res = await createAutomated({
      input: {
        projectId: projectId!,
        title: autoTitle.trim(),
        manualTestCaseIds: autoManualIds
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.createAutomatedTestCase?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setAutoTitle("");
    setAutoManualIds([]);
    reexecuteCases({ requestPolicy: "network-only" });
  }, [
    autoManualIds,
    autoTitle,
    clearShellMessages,
    createAutomated,
    paused,
    projectId,
    reexecuteCases,
    setPayloadAppError,
    setTransportMessage
  ]);

  const toggleManualReq = useCallback((id: string) => {
    setManualReqIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  const toggleAutoManual = useCallback((id: string) => {
    setAutoManualIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }, []);

  if (paused) {
    return null;
  }

  const requirements: RequirementListItem[] = reqResult.data?.requirements ?? [];
  const manualsForAuto: TestCaseListItem[] = manualListResult.data?.testCases ?? [];
  const rows: TestCaseListItem[] = listResult.data?.testCases ?? [];

  return (
    <section className="projects-page" data-testid="testcases-page">
      <div className="project-detail-header">
        <h2 id="testcases-heading">Test cases</h2>
        <Link to={`/projects/${projectId}`} data-testid="testcases-back-project">
          ← Project
        </Link>
      </div>

      <div className="projects-create" data-testid="testcase-create-manual-panel">
        <h3 className="projects-subheading">New manual test case</h3>
        <div className="projects-create-fields">
          <label>
            Title <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => {
                setManualTitle(e.target.value);
                setManualTitleError(null);
                setShowManualPayload(false);
              }}
              data-testid="testcase-create-manual-title"
              autoComplete="off"
            />
            {manualTitleError !== null && (
              <p className="field-error" role="alert" data-testid="testcase-create-manual-title-error">
                {manualTitleError}
              </p>
            )}
          </label>
          <fieldset className="testcase-fieldset">
            <legend>
              Linked requirements <span className="required-star" aria-hidden="true">*</span>
            </legend>
            {requirements.length === 0 ? (
              <p className="hint">No requirements in this project yet.</p>
            ) : (
              <ul className="testcase-req-checklist" data-testid="testcase-create-manual-requirements">
                {requirements.map((r) => (
                  <li key={r.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={manualReqIds.includes(r.id)}
                        onChange={() => toggleManualReq(r.id)}
                        data-testid={`testcase-create-manual-req-${r.externalKey}`}
                      />
                      <code>{r.externalKey}</code> {r.title}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {manualReqError !== null && (
              <p className="field-error" role="alert" data-testid="testcase-create-manual-req-error">
                {manualReqError}
              </p>
            )}
          </fieldset>
          <div className="testcase-steps-editor">
            <span className="projects-subheading">Steps</span>
            {manualSteps.map((s, i) => (
              <div key={i} className="testcase-step-row">
                <label>
                  Step {i + 1} name <span className="required-star" aria-hidden="true">*</span>
                  <input
                    type="text"
                    value={s.name}
                    onChange={(e) => {
                      const next = [...manualSteps];
                      next[i] = { ...next[i]!, name: e.target.value };
                      setManualSteps(next);
                      setManualStepsError(null);
                      setShowManualPayload(false);
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
                      const next = [...manualSteps];
                      next[i] = { ...next[i]!, expectedResult: e.target.value };
                      setManualSteps(next);
                    }}
                    data-testid={`testcase-create-manual-step-expected-${i}`}
                  />
                </label>
                {manualSteps.length > 1 && (
                  <button
                    type="button"
                    className="testcase-step-remove"
                    onClick={() => setManualSteps(manualSteps.filter((_, j) => j !== i))}
                    data-testid={`testcase-create-manual-step-remove-${i}`}
                  >
                    Remove step
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setManualSteps([...manualSteps, { name: "", expectedResult: "" }])}
              data-testid="testcase-create-manual-step-add"
            >
              Add step
            </button>
            {manualStepsError !== null && (
              <p className="field-error" role="alert" data-testid="testcase-create-manual-steps-error">
                {manualStepsError}
              </p>
            )}
          </div>
        </div>
        <ValidationErrorPayloadPreview open={showManualPayload} payload={createManualClientPayload} />
        <button type="button" onClick={onCreateManual} data-testid="testcase-create-manual-submit">
          Create manual
        </button>
      </div>

      <div className="projects-create" data-testid="testcase-create-auto-panel">
        <h3 className="projects-subheading">New automated test case</h3>
        <div className="projects-create-fields">
          <label>
            Title <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={autoTitle}
              onChange={(e) => {
                setAutoTitle(e.target.value);
                setAutoTitleError(null);
                setShowAutoPayload(false);
              }}
              data-testid="testcase-create-auto-title"
              autoComplete="off"
            />
            {autoTitleError !== null && (
              <p className="field-error" role="alert" data-testid="testcase-create-auto-title-error">
                {autoTitleError}
              </p>
            )}
          </label>
          <fieldset className="testcase-fieldset">
            <legend>
              Linked manual test cases <span className="required-star" aria-hidden="true">*</span>
            </legend>
            {manualsForAuto.length === 0 ? (
              <p className="hint">Create a manual test case first.</p>
            ) : (
              <ul className="testcase-req-checklist" data-testid="testcase-create-auto-manuals">
                {manualsForAuto.map((m) => (
                  <li key={m.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={autoManualIds.includes(m.id)}
                        onChange={() => toggleAutoManual(m.id)}
                        data-testid={`testcase-create-auto-manual-${m.id}`}
                      />
                      {m.title}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            {autoManualError !== null && (
              <p className="field-error" role="alert" data-testid="testcase-create-auto-manual-error">
                {autoManualError}
              </p>
            )}
          </fieldset>
        </div>
        <ValidationErrorPayloadPreview open={showAutoPayload} payload={createAutomatedClientPayload} />
        <button type="button" onClick={onCreateAutomated} data-testid="testcase-create-auto-submit">
          Create automated
        </button>
      </div>

      <div className="projects-list-toolbar">
        <label className="projects-checkbox-label">
          Type
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            data-testid="testcase-list-type-filter"
          >
            <option value="">All</option>
            <option value="manual">Manual</option>
            <option value="automated">Automated</option>
          </select>
        </label>
        <label className="projects-checkbox-label">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
            data-testid="testcase-list-include-deleted"
          />
          Show deleted
        </label>
        {listResult.fetching && (
          <PageLoading inline dataTestId="testcases-list-loading" />
        )}
      </div>

      {rows.length === 0 && !listResult.fetching ? (
        <p className="projects-empty" data-testid="testcases-list-empty">
          No test cases yet.
        </p>
      ) : (
        <table className="projects-table">
          <thead>
            <tr>
              <th scope="col">Type</th>
              <th scope="col">Title</th>
              <th scope="col"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} data-testid="testcase-row" data-testcase-id={t.id}>
                <td>
                  <span className="badge active" data-testid="testcase-row-type">
                    {t.type}
                  </span>
                  {t.isDeleted && (
                    <span className="badge deleted" data-testid="testcase-row-deleted-badge">
                      Deleted
                    </span>
                  )}
                </td>
                <td>{t.title}</td>
                <td>
                  <Link
                    to={`/projects/${projectId}/test-cases/${t.id}`}
                    data-testid="testcase-open"
                  >
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
