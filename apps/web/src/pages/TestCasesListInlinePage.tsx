import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { RouterLink } from "../tamagui/RouterLink";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { EpicsManagePanel } from "../components/epics/EpicsManagePanel";
import { SortableTh } from "../components/requirements/requirementsTableHelpers";
import { PlanCaseCatalogTable } from "../components/plans/PlanCaseCatalogTable";
import { filterPlanCatalogRows } from "../components/plans/planCaseFilters";
import { PlanMetadataPanel } from "../components/plans/PlanMetadataPanel";
import { SelectionBar } from "../components/plans/SelectionBar";
import { SplitWorkspace } from "../components/workspace/SplitWorkspace";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { AutomationCoverageIcon } from "../components/automation/AutomationCoverageIcon";
import { automationCoverageSortKey } from "../automation/automationStatus";
import { demoPlaceholders } from "../constants/demoPlaceholders";
import { TestCaseDetailPage } from "./TestCaseDetailPage";
import {
  CreateManualTestCaseMutation,
  CreateTestPlanMutation,
  EpicsListQuery,
  LinkTestPlanTestCaseMutation,
  RequirementsListQuery,
  TestCasesListQuery,
  TraceabilityGraphQuery
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { RequirementListItem, TestCaseListItem } from "../graphql/types";
import { useColumnSort } from "../hooks/useColumnSort";
import { useEpicFilter } from "../hooks/useEpicFilter";
import { useShellErrors } from "../shell/ShellErrorsContext";
import { parseGraphNodeId } from "../traceability/graphNodeIds";
import "./ProjectsPage.css";

type StepDraft = { name: string; expectedResult: string };

export function TestCasesListInlinePage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTcId = searchParams.get("tc");
  const creatingTc = searchParams.get("new") === "1";
  const creatingPlan = searchParams.get("createPlan") === "1";
  const managingEpics = searchParams.get("epics") === "1";
  const { epicFilterId, setEpicFilter } = useEpicFilter(projectId ?? "");
  const linkedReqId = searchParams.get("linkedReq") ?? "";
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [title, setTitle] = useState("");
  const [manualReqIds, setManualReqIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<StepDraft[]>([{ name: "", expectedResult: "" }]);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [manualReqError, setManualReqError] = useState<string | null>(null);
  const [stepsError, setStepsError] = useState<string | null>(null);
  const [createEpicId, setCreateEpicId] = useState("");
  const [showValidationPayload, setShowValidationPayload] = useState(false);
  const [planName, setPlanName] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [planReleaseLabel, setPlanReleaseLabel] = useState("");
  const [planSprintLabel, setPlanSprintLabel] = useState("");
  const [planNameError, setPlanNameError] = useState<string | null>(null);
  const [planCaseSearch, setPlanCaseSearch] = useState("");
  const [planEpicFilterId, setPlanEpicFilterId] = useState("");
  const [planSelectionIds, setPlanSelectionIds] = useState<Set<string>>(() => new Set());
  const [showPlanValidationPayload, setShowPlanValidationPayload] = useState(false);

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
    variables: {
      projectId: projectId ?? "",
      type: "manual",
      includeDeleted,
      requirementId: linkedReqId !== "" ? linkedReqId : undefined
    },
    pause: queryPaused,
    requestPolicy: "network-only"
  });
  const [reqResult] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: queryPaused,
    requestPolicy: "network-only"
  });
  const [epicsResult, reexecuteEpics] = useQuery({
    query: EpicsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: queryPaused,
    requestPolicy: "cache-and-network"
  });
  const [graphResult] = useQuery({
    query: TraceabilityGraphQuery,
    variables: { projectId: projectId ?? "" },
    pause: queryPaused,
    requestPolicy: "network-only"
  });
  const [, createManual] = useMutation(CreateManualTestCaseMutation);
  const [, createPlan] = useMutation(CreateTestPlanMutation);
  const [, linkPlanCase] = useMutation(LinkTestPlanTestCaseMutation);

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

  const createPayload = createManualClientPayload;
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
    if (manualReqIds.length === 0) {
      setManualReqError("Select at least one requirement.");
      invalid = true;
    } else {
      setManualReqError(null);
    }
    const filledSteps = steps
      .map((s) => ({ name: s.name.trim(), expectedResult: s.expectedResult.trim() }))
      .filter((s) => s.name.length > 0);
    if (filledSteps.length === 0) {
      setStepsError("Add at least one step with a name.");
      invalid = true;
    } else {
      setStepsError(null);
    }
    if (invalid) {
      setShowValidationPayload(true);
      return;
    }
    setShowValidationPayload(false);

    const res = await createManual({
      input: {
        projectId: projectId!,
        title: title.trim(),
        requirementIds: manualReqIds,
        steps: filledSteps.map((s) => ({ name: s.name, expectedResult: s.expectedResult || undefined })),
        epicId: createEpicId === "" ? undefined : createEpicId
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

    setTitle("");
    setManualReqIds([]);
    setSteps([{ name: "", expectedResult: "" }]);
    setCreateEpicId("");
    setTitleError(null);
    setManualReqError(null);
    setStepsError(null);
    reexecuteCases({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    createEpicId,
    createManual,
    deferQueries,
    manualReqIds,
    paused,
    projectId,
    reexecuteCases,
    setPayloadAppError,
    setTransportMessage,
    steps,
    title
  ]);

  const requirements: RequirementListItem[] = reqResult.data?.requirements ?? [];
  const linkedRequirement = useMemo(
    () => (linkedReqId !== "" ? requirements.find((r) => r.id === linkedReqId) : undefined),
    [linkedReqId, requirements]
  );
  const epics = epicsResult.data?.epics ?? [];
  const rows: TestCaseListItem[] = listResult.data?.testCases ?? [];
  const graph = graphResult.data?.traceabilityGraph;

  const linkedAutomatedCountByManual = useMemo(() => {
    const out = new Map<string, number>();
    if (graph === undefined) {
      return out;
    }
    for (const e of graph.edges) {
      if (e.kind !== "MANUAL_AUTO") {
        continue;
      }
      const manual = parseGraphNodeId(e.sourceId);
      if (manual?.kind !== "man") {
        continue;
      }
      out.set(manual.id, (out.get(manual.id) ?? 0) + 1);
    }
    return out;
  }, [graph]);

  const filteredRows = useMemo(() => {
    if (epicFilterId === "") {
      return rows;
    }
    return rows.filter((t) => t.epicId === epicFilterId);
  }, [epicFilterId, rows]);

  const sortAccessors = useMemo(
    () => ({
      externalKey: (t: TestCaseListItem) => t.externalKey ?? "",
      title: (t: TestCaseListItem) => t.title,
      epic: (t: TestCaseListItem) => t.epic?.externalKey ?? "",
      releaseLabel: (t: TestCaseListItem) => t.releaseLabel,
      sprintLabel: (t: TestCaseListItem) => t.sprintLabel,
      linkedRequirementCount: (t: TestCaseListItem) => t.linkedRequirementCount,
      status: (t: TestCaseListItem) => (t.isDeleted ? "deleted" : "active"),
      automation: (t: TestCaseListItem) =>
        automationCoverageSortKey(t.automationStatus, linkedAutomatedCountByManual.get(t.id) ?? 0)
    }),
    [linkedAutomatedCountByManual]
  );
  // Non-default numeric sort columns (null treated as 0).
  const sortOptions = useMemo(
    () => ({
      linkedRequirementCount: { type: "number" as const, nullValue: 0 },
      automation: { type: "number" as const, nullValue: 0 }
    }),
    []
  );
  const { sorted, sortKey, sortDir, toggleSort } = useColumnSort(filteredRows, sortAccessors, sortOptions);

  const selectRow = useCallback(
    (id: string) => {
      if (creatingPlan) {
        setPlanSelectionIds((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        });
        return;
      }
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("tc", id);
          n.delete("new");
          n.delete("epics");
          n.delete("createPlan");
          return n;
        },
        { replace: true }
      );
    },
    [creatingPlan, setSearchParams]
  );

  const closeInspector = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("tc");
        n.delete("new");
        n.delete("epics");
        n.delete("createPlan");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const openCreatePanel = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("tc");
        n.set("new", "1");
        n.delete("epics");
        n.delete("createPlan");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const openCreatePlanPanel = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("tc");
        n.delete("new");
        n.delete("epics");
        n.set("createPlan", "1");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const openEpicsPanel = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("tc");
        n.delete("new");
        n.set("epics", "1");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const clearLinkedReqFilter = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("linkedReq");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const planFilteredCases = useMemo(
    () =>
      filterPlanCatalogRows(rows, new Set(), {
        search: planCaseSearch,
        membership: "all",
        type: "manual",
        epicId: planEpicFilterId !== "" ? planEpicFilterId : epicFilterId
      }),
    [epicFilterId, planCaseSearch, planEpicFilterId, rows]
  );

  const onCreatePlanFromSelection = useCallback(async () => {
    if (paused || !projectId) return;
    clearShellMessages();
    if (!trimmedNonEmpty(planName.trim())) {
      setPlanNameError(REQUIRED_MSG);
      setShowPlanValidationPayload(true);
      return;
    }
    setPlanNameError(null);
    setShowPlanValidationPayload(false);
    const res = await createPlan({
      input: {
        projectId,
        name: planName.trim(),
        description: planDescription.trim() || undefined,
        releaseLabel: planReleaseLabel.trim() || undefined,
        sprintLabel: planSprintLabel.trim() || undefined
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.createTestPlan?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    const planId = res.data?.createTestPlan?.testPlan?.id;
    if (!planId) return;
    for (const testCaseId of planSelectionIds) {
      await linkPlanCase({ testPlanId: planId, testCaseId });
    }
    setPlanName("");
    setPlanDescription("");
    setPlanReleaseLabel("");
    setPlanSprintLabel("");
    setPlanSelectionIds(new Set());
    navigate(`/projects/${projectId}/plans?plan=${planId}`);
  }, [
    clearShellMessages,
    createPlan,
    linkPlanCase,
    navigate,
    paused,
    planDescription,
    planName,
    planReleaseLabel,
    planSelectionIds,
    planSprintLabel,
    projectId,
    setPayloadAppError,
    setTransportMessage
  ]);

  const planCreatePayload = useMemo(
    () => ({
      mutation: "CreateTestPlan",
      variables: {
        input: {
          projectId: projectId ?? null,
          name: planName.trim() || null,
          description: planDescription.trim() || null,
          releaseLabel: planReleaseLabel.trim() || null,
          sprintLabel: planSprintLabel.trim() || null
        }
      }
    }),
    [planDescription, planName, planReleaseLabel, planSprintLabel, projectId]
  );

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

  const table = (
    <table className="projects-table projects-table--dense">
      <thead>
        <tr>
          <SortableTh label="Key" sortKey="externalKey" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Title" sortKey="title" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Epic" sortKey="epic" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Release" sortKey="releaseLabel" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Sprint" sortKey="sprintLabel" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh
            label="Req links"
            sortKey="linkedRequirementCount"
            activeSortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
          />
          <SortableTh label="Status" sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh
            label="Auto"
            sortKey="automation"
            activeSortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
          />
        </tr>
      </thead>
      <tbody>
          {listResult.fetching && rows.length === 0 ? (
            <tr data-testid="testcases-list-loading">
              <td colSpan={8}>
                <PageLoading />
              </td>
            </tr>
          ) : null}
          {!listResult.fetching && filteredRows.length === 0 ? (
            <tr data-testid="testcases-list-empty">
              <td colSpan={8}>
                <p className="projects-empty">
                  {linkedReqId !== ""
                    ? "No manual test cases linked to this requirement."
                    : rows.length === 0
                      ? "No test cases yet."
                      : "No test cases match this epic filter."}
                </p>
              </td>
            </tr>
          ) : null}
          {sorted.map((t) => (
            <tr
              key={t.id}
              data-testid="testcase-row"
              data-testcase-id={t.id}
              className={selectedTcId === t.id ? "projects-table-row--selected" : undefined}
              onClick={() => selectRow(t.id)}
            >
              <td>{t.externalKey ? <code>{t.externalKey}</code> : "—"}</td>
              <td>
                <div className="clamp-4">{t.title}</div>
              </td>
              <td>{t.epic ? <code>{t.epic.externalKey}</code> : "—"}</td>
              <td>{t.releaseLabel ?? "—"}</td>
              <td>{t.sprintLabel ?? "—"}</td>
              <td>{t.linkedRequirementCount}</td>
              <td>
                {t.isDeleted ? "deleted" : "active"}
                {t.isDeleted ? (
                  <span className="badge deleted" data-testid="testcase-row-deleted-badge">
                    Deleted
                  </span>
                ) : null}
              </td>
              <td>
                <AutomationCoverageIcon
                  automationStatus={t.automationStatus}
                  linkedAutomatedCount={linkedAutomatedCountByManual.get(t.id) ?? 0}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
  );

  return (
    <section className="projects-page" data-testid="testcases-page">
      <ProjectWorkspaceHeader title="Test cases" titleId="testcases-heading" projectId={projectId} active="test-cases" />

      <div className="projects-list-toolbar">
        <label className="projects-toolbar-filter">
          Epic
          <select
            value={epicFilterId}
            onChange={(e) => setEpicFilter(e.target.value)}
            data-testid="testcase-epic-filter"
          >
            <option value="">All epics</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.externalKey}
              </option>
            ))}
          </select>
        </label>
        {linkedReqId !== "" ? (
          <div className="projects-toolbar-active-filter" data-testid="testcase-linked-req-filter">
            Linked to <code>{linkedRequirement?.externalKey ?? linkedReqId}</code>
            <button type="button" className="projects-icon-button" onClick={clearLinkedReqFilter} data-testid="testcase-linked-req-clear">
              Clear
            </button>
          </div>
        ) : null}
        <label className="projects-checkbox-label">
          <input type="checkbox" checked={includeDeleted} onChange={(e) => setIncludeDeleted(e.target.checked)} data-testid="testcase-list-include-deleted" />
          Show deleted
        </label>
        <RouterLink to={`/projects/${projectId}/automation`} data-testid="testcase-open-automation-tab">
          Automation
        </RouterLink>
        {listResult.fetching && <PageLoading inline dataTestId="testcases-list-loading" />}
        <div className="projects-list-toolbar-actions">
          <button type="button" onClick={openCreatePlanPanel} data-testid="testcase-open-create-plan-panel">
            Create plan
          </button>
          <button type="button" onClick={openCreatePanel} data-testid="testcase-open-create-panel">
            Create test case
          </button>
          <button type="button" onClick={openEpicsPanel} data-testid="testcase-open-epics-panel">
            Manage epics
          </button>
        </div>
      </div>

      <SplitWorkspace
        sectionKey="test-cases"
        data-testid="testcases-split"
        main={
          creatingPlan ? (
            <div className="plan-case-catalog" data-testid="testcase-create-plan-catalog">
              <SelectionBar
                count={planSelectionIds.size}
                onClear={() => setPlanSelectionIds(new Set())}
                testId="testcase-plan-selection-bar"
              >
                <span className="projects-muted-inline">Automated tests are added when linked manual cases are included.</span>
              </SelectionBar>
              <PlanCaseCatalogTable
                rows={rows}
                filteredRows={planFilteredCases}
                memberIds={new Set()}
                linkedAutomatedCountByManual={linkedAutomatedCountByManual}
                loading={listResult.fetching}
                mode="selection"
                membershipFilter="all"
                onMembershipFilterChange={() => {}}
                typeFilter="manual"
                onTypeFilterChange={() => {}}
                search={planCaseSearch}
                onSearchChange={setPlanCaseSearch}
                epicFilterId={planEpicFilterId !== "" ? planEpicFilterId : epicFilterId}
                onEpicFilterChange={setPlanEpicFilterId}
                epics={epics}
                pickedIds={planSelectionIds}
                onPickToggle={(id, picked) => {
                  setPlanSelectionIds((prev) => {
                    const next = new Set(prev);
                    if (picked) next.add(id);
                    else next.delete(id);
                    return next;
                  });
                }}
                onMembershipToggle={() => {}}
                onPickAllMatching={() => {
                  setPlanSelectionIds((prev) => {
                    const next = new Set(prev);
                    for (const tc of planFilteredCases) next.add(tc.id);
                    return next;
                  });
                }}
              />
            </div>
          ) : (
            table
          )
        }
        inspector={
          creatingPlan ? (
            <PlanMetadataPanel
              title="Create plan from selection"
              name={planName}
              description={planDescription}
              releaseLabel={planReleaseLabel}
              sprintLabel={planSprintLabel}
              onNameChange={(v) => {
                setPlanName(v);
                setPlanNameError(null);
                setShowPlanValidationPayload(false);
              }}
              onDescriptionChange={setPlanDescription}
              onReleaseLabelChange={setPlanReleaseLabel}
              onSprintLabelChange={setPlanSprintLabel}
              onClose={closeInspector}
              mode="create"
              nameError={planNameError}
              onSubmitCreate={() => void onCreatePlanFromSelection()}
              nameTestId="testcase-plan-create-name"
            >
              <ValidationErrorPayloadPreview open={showPlanValidationPayload} payload={planCreatePayload} />
              <p className="automation-section-hint">{planSelectionIds.size} manual test case(s) selected.</p>
            </PlanMetadataPanel>
          ) : selectedTcId ? (
            <TestCaseDetailPage
              variant="inspector"
              embedProjectId={projectId}
              embedTestCaseId={selectedTcId}
              onInspectorClose={closeInspector}
              onUpdated={() => reexecuteCases({ requestPolicy: "network-only" })}
            />
          ) : managingEpics ? (
            <EpicsManagePanel
              projectId={projectId}
              onClose={closeInspector}
              onChanged={() => {
                reexecuteEpics({ requestPolicy: "network-only" });
                reexecuteCases({ requestPolicy: "network-only" });
              }}
            />
          ) : creatingTc ? (
            <div className="projects-create" data-testid="testcase-create-panel">
              <h3 className="projects-subheading">Create manual test case</h3>
              <div className="detail-edit-fields">
                <label>
                  Title <span className="required-star" aria-hidden="true">*</span>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setTitleError(null);
                      setShowValidationPayload(false);
                    }}
                    data-testid="testcase-create-title"
                    placeholder={demoPlaceholders.testCase.title}
                  />
                  {titleError !== null ? <p className="field-error">{titleError}</p> : null}
                </label>
                <label>
                  Epic
                  <select
                    value={createEpicId}
                    onChange={(e) => setCreateEpicId(e.target.value)}
                    data-testid="testcase-create-epic"
                  >
                    <option value="">— None —</option>
                    {epics.map((epic) => (
                      <option key={epic.id} value={epic.id}>
                        {epic.externalKey} — {epic.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {showExtendedCreate ? (
                <div className="projects-create-fields">
                  <span>
                    Linked requirements <span className="required-star" aria-hidden="true">*</span>
                  </span>
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
                                setManualReqIds((prev) => (prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]));
                                setManualReqError(null);
                                setShowValidationPayload(false);
                              }}
                              data-testid={`testcase-create-manual-req-${r.externalKey}`}
                            />
                            <code>{r.externalKey}</code> - {r.title}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  {manualReqError !== null ? <p className="field-error">{manualReqError}</p> : null}
                </div>
              ) : null}
              {showExtendedCreate ? (
                <div className="testcase-steps-editor" data-testid="testcase-create-steps">
                  <span className="projects-subheading">Steps</span>
                  {steps.map((s, i) => (
                    <div key={i} className="testcase-step-row">
                      <label>
                        Step {i + 1} name <span className="required-star" aria-hidden="true">*</span>
                        <textarea
                          value={s.name}
                          onChange={(e) => {
                            const next = [...steps];
                            next[i] = { ...next[i]!, name: e.target.value };
                            setSteps(next);
                            setStepsError(null);
                            setShowValidationPayload(false);
                          }}
                          rows={4}
                          data-testid={`testcase-create-manual-step-name-${i}`}
                        />
                      </label>
                      <label>
                        Expected (optional)
                        <textarea
                          value={s.expectedResult}
                          onChange={(e) => {
                            const next = [...steps];
                            next[i] = { ...next[i]!, expectedResult: e.target.value };
                            setSteps(next);
                          }}
                          rows={4}
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
                  {stepsError !== null ? <p className="field-error">{stepsError}</p> : null}
                </div>
              ) : null}
              <ValidationErrorPayloadPreview open={showValidationPayload} payload={createPayload} />
              <div className="form-edit-actions">
                <button type="button" onClick={onCreate} data-testid="testcase-create-submit">
                  Create manual test case
                </button>
                <button type="button" onClick={closeInspector}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null
        }
      />
    </section>
  );
}
