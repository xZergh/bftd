import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { PlanCaseCatalogTable } from "../components/plans/PlanCaseCatalogTable";
import { filterPlanCatalogRows, type CaseTypeFilter, type PlanMembershipFilter } from "../components/plans/planCaseFilters";
import { PlanMetadataPanel } from "../components/plans/PlanMetadataPanel";
import { TestCaseQuickViewModal } from "../components/plans/TestCaseQuickViewModal";
import { SplitWorkspace } from "../components/workspace/SplitWorkspace";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import {
  CreateTestPlanMutation,
  DeleteTestPlanMutation,
  EpicsListQuery,
  LinkTestPlanTestCaseMutation,
  TestCasesListQuery,
  TestPlansListQuery,
  TraceabilityGraphQuery,
  UnlinkTestPlanTestCaseMutation,
  UpdateTestPlanMutation
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import type { TestCaseListItem, TestPlanListItem } from "../graphql/types";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import { useDebouncedAutosaveEffect } from "../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../shell/ShellErrorsContext";
import { parseGraphNodeId } from "../traceability/graphNodeIds";
import "./ProjectsPage.css";

type PlanEditBaseline = {
  name: string;
  description: string;
  releaseLabel: string;
  sprintLabel: string;
};

function baselineFromPlan(plan: TestPlanListItem): PlanEditBaseline {
  return {
    name: plan.name,
    description: plan.description ?? "",
    releaseLabel: plan.releaseLabel ?? "",
    sprintLabel: plan.sprintLabel ?? ""
  };
}

export function TestPlansListPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanId = searchParams.get("plan");
  const creatingPlan = searchParams.get("new") === "1";
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [planSearch, setPlanSearch] = useState("");
  const [planReleaseFilter, setPlanReleaseFilter] = useState("");
  const [planSprintFilter, setPlanSprintFilter] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseLabel, setReleaseLabel] = useState("");
  const [sprintLabel, setSprintLabel] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const [caseSearch, setCaseSearch] = useState("");
  const [membershipFilter, setMembershipFilter] = useState<PlanMembershipFilter>("all");
  const [typeFilter, setTypeFilter] = useState<CaseTypeFilter>("manual");
  const [epicFilterId, setEpicFilterId] = useState("");
  const [bulkPending, setBulkPending] = useState(false);
  const [quickViewTc, setQuickViewTc] = useState<TestCaseListItem | null>(null);

  const [editBaseline, setEditBaseline] = useState<PlanEditBaseline | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReleaseLabel, setEditReleaseLabel] = useState("");
  const [editSprintLabel, setEditSprintLabel] = useState("");
  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);

  const paused = projectId === undefined || projectId === "";
  const [plansResult, reexecutePlans] = useQuery({
    query: TestPlansListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });
  const [casesResult] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", includeDeleted: false },
    pause: paused,
    requestPolicy: "network-only"
  });
  const [epicsResult] = useQuery({
    query: EpicsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "cache-and-network"
  });
  const [graphResult] = useQuery({
    query: TraceabilityGraphQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [, createPlan] = useMutation(CreateTestPlanMutation);
  const [, updatePlan] = useMutation(UpdateTestPlanMutation);
  const [, deletePlan] = useMutation(DeleteTestPlanMutation);
  const [, linkCase] = useMutation(LinkTestPlanTestCaseMutation);
  const [, unlinkCase] = useMutation(UnlinkTestPlanTestCaseMutation);

  useEffect(() => {
    if (!plansResult.error) return;
    setTransportMessage(formatGraphQlTransportError(plansResult.error));
  }, [plansResult.error, setTransportMessage]);

  const plans: TestPlanListItem[] = plansResult.data?.testPlans ?? [];
  const testCases: TestCaseListItem[] = casesResult.data?.testCases ?? [];
  const epics = epicsResult.data?.epics ?? [];
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const memberIds = useMemo(() => new Set(selectedPlan?.testCases.map((tc) => tc.id) ?? []), [selectedPlan?.testCases]);

  const linkedAutomatedCountByManual = useMemo(() => {
    const out = new Map<string, number>();
    const graph = graphResult.data?.traceabilityGraph;
    if (!graph) return out;
    for (const e of graph.edges) {
      if (e.kind !== "MANUAL_AUTO") continue;
      const manual = parseGraphNodeId(e.sourceId);
      if (manual?.kind !== "man") continue;
      out.set(manual.id, (out.get(manual.id) ?? 0) + 1);
    }
    return out;
  }, [graphResult.data?.traceabilityGraph]);

  useEffect(() => {
    if (!selectedPlan) {
      setEditBaseline(null);
      return;
    }
    const b = baselineFromPlan(selectedPlan);
    setEditBaseline(b);
    setEditName(b.name);
    setEditDescription(b.description);
    setEditReleaseLabel(b.releaseLabel);
    setEditSprintLabel(b.sprintLabel);
  }, [selectedPlan?.id, selectedPlan?.updatedAt]);

  const editDirty =
    editBaseline !== null &&
    (editName.trim() !== editBaseline.name.trim() ||
      editDescription.trim() !== editBaseline.description.trim() ||
      editReleaseLabel.trim() !== editBaseline.releaseLabel.trim() ||
      editSprintLabel.trim() !== editBaseline.sprintLabel.trim());

  const performSaveEdit = useCallback(async (): Promise<boolean> => {
    if (!selectedPlan || !trimmedNonEmpty(editName.trim())) return false;
    setSavePhase("saving");
    const res = await updatePlan({
      input: {
        id: selectedPlan.id,
        name: editName.trim(),
        description: editDescription.trim() || null,
        releaseLabel: editReleaseLabel.trim() || null,
        sprintLabel: editSprintLabel.trim() || null
      }
    });
    setSavePhase("idle");
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      setFailBump((n) => n + 1);
      return false;
    }
    const appErr = res.data?.updateTestPlan?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      setFailBump((n) => n + 1);
      return false;
    }
    const p = res.data?.updateTestPlan?.testPlan;
    if (p) {
      setEditBaseline({
        name: p.name,
        description: p.description ?? "",
        releaseLabel: p.releaseLabel ?? "",
        sprintLabel: p.sprintLabel ?? ""
      });
    }
    await reexecutePlans({ requestPolicy: "network-only" });
    return true;
  }, [editDescription, editName, editReleaseLabel, editSprintLabel, reexecutePlans, selectedPlan, setPayloadAppError, setTransportMessage, updatePlan]);

  useDebouncedAutosaveEffect(
    selectedPlan !== null && editDirty && trimmedNonEmpty(editName.trim()),
    `${editName}\0${editDescription}\0${editReleaseLabel}\0${editSprintLabel}\0${failBump}`,
    () => {
      void performSaveEdit();
    }
  );

  const filteredPlans = useMemo(() => {
    const q = planSearch.trim().toLowerCase();
    return plans.filter((p) => {
      if (planReleaseFilter !== "" && (p.releaseLabel ?? "") !== planReleaseFilter) return false;
      if (planSprintFilter !== "" && (p.sprintLabel ?? "") !== planSprintFilter) return false;
      if (q === "") return true;
      return p.name.toLowerCase().includes(q) || (p.description ?? "").toLowerCase().includes(q);
    });
  }, [planReleaseFilter, planSearch, planSprintFilter, plans]);

  const planReleaseOptions = useMemo(
    () => [...new Set(plans.map((p) => p.releaseLabel).filter((v): v is string => Boolean(v)))].sort(),
    [plans]
  );
  const planSprintOptions = useMemo(
    () => [...new Set(plans.map((p) => p.sprintLabel).filter((v): v is string => Boolean(v)))].sort(),
    [plans]
  );

  const filteredCases = useMemo(
    () =>
      filterPlanCatalogRows(testCases, memberIds, {
        search: caseSearch,
        membership: membershipFilter,
        type: typeFilter,
        epicId: epicFilterId
      }),
    [caseSearch, epicFilterId, memberIds, membershipFilter, testCases, typeFilter]
  );

  const refreshPlans = useCallback(async () => {
    await reexecutePlans({ requestPolicy: "network-only" });
  }, [reexecutePlans]);

  const onCreate = useCallback(async () => {
    if (paused) return;
    clearShellMessages();
    if (!trimmedNonEmpty(name.trim())) {
      setNameError(REQUIRED_MSG);
      setShowValidationPayload(true);
      return;
    }
    setNameError(null);
    setShowValidationPayload(false);
    const res = await createPlan({
      input: {
        projectId: projectId!,
        name: name.trim(),
        description: description.trim() || undefined,
        releaseLabel: releaseLabel.trim() || undefined,
        sprintLabel: sprintLabel.trim() || undefined
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
    const newId = res.data?.createTestPlan?.testPlan?.id;
    setName("");
    setDescription("");
    setReleaseLabel("");
    setSprintLabel("");
    await refreshPlans();
    if (newId) {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("plan", newId);
          n.delete("new");
          return n;
        },
        { replace: true }
      );
    }
  }, [clearShellMessages, createPlan, description, name, paused, projectId, refreshPlans, releaseLabel, setPayloadAppError, setSearchParams, setTransportMessage, sprintLabel]);

  const onDelete = useCallback(async () => {
    if (!selectedPlan) return;
    const res = await deletePlan({ id: selectedPlan.id });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("plan");
        return n;
      },
      { replace: true }
    );
    await refreshPlans();
  }, [deletePlan, refreshPlans, selectedPlan, setSearchParams, setTransportMessage]);

  const onMembershipToggle = useCallback(
    async (testCaseId: string, inPlan: boolean) => {
      if (!selectedPlan) return;
      if (inPlan) {
        await linkCase({ testPlanId: selectedPlan.id, testCaseId });
      } else {
        await unlinkCase({ testPlanId: selectedPlan.id, testCaseId });
      }
      await refreshPlans();
    },
    [linkCase, refreshPlans, selectedPlan, unlinkCase]
  );

  const onAddAllMatching = useCallback(async () => {
    if (!selectedPlan) return;
    const toAdd = filteredCases.filter((tc) => !memberIds.has(tc.id));
    if (toAdd.length === 0) return;
    setBulkPending(true);
    for (const tc of toAdd) {
      await linkCase({ testPlanId: selectedPlan.id, testCaseId: tc.id });
    }
    setBulkPending(false);
    await refreshPlans();
  }, [filteredCases, linkCase, memberIds, refreshPlans, selectedPlan]);

  const onRemoveAllMatching = useCallback(async () => {
    if (!selectedPlan) return;
    const toRemove = filteredCases.filter((tc) => memberIds.has(tc.id));
    if (toRemove.length === 0) return;
    setBulkPending(true);
    for (const tc of toRemove) {
      await unlinkCase({ testPlanId: selectedPlan.id, testCaseId: tc.id });
    }
    setBulkPending(false);
    await refreshPlans();
  }, [filteredCases, memberIds, refreshPlans, selectedPlan, unlinkCase]);

  const selectPlan = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("plan", id);
          n.delete("new");
          return n;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const closeInspector = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("plan");
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
        n.delete("plan");
        n.set("new", "1");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const onCreateRun = useCallback(() => {
    if (!selectedPlan || !projectId) return;
    navigate(`/projects/${projectId}/runs?new=1&plan=${selectedPlan.id}`);
  }, [navigate, projectId, selectedPlan]);

  if (paused) return null;

  const saveState = savePhase === "saving" ? "saving" : editDirty ? "unsaved" : "saved";
  const createPayload = {
    mutation: "CreateTestPlan",
    variables: {
      input: {
        projectId: projectId ?? null,
        name: name.trim() || null,
        description: description.trim() || null,
        releaseLabel: releaseLabel.trim() || null,
        sprintLabel: sprintLabel.trim() || null
      }
    }
  };

  const planTable = (
    <div className="plans-list-section" data-testid="plans-list-section">
      <div className="projects-list-toolbar plans-list-toolbar">
        <label className="projects-toolbar-filter">
          Search plans
          <input type="search" value={planSearch} onChange={(e) => setPlanSearch(e.target.value)} data-testid="plans-filter-search" />
        </label>
        <label className="projects-toolbar-filter">
          Release
          <select value={planReleaseFilter} onChange={(e) => setPlanReleaseFilter(e.target.value)} data-testid="plans-filter-release">
            <option value="">All</option>
            {planReleaseOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="projects-toolbar-filter">
          Sprint
          <select value={planSprintFilter} onChange={(e) => setPlanSprintFilter(e.target.value)} data-testid="plans-filter-sprint">
            <option value="">All</option>
            {planSprintOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={openCreatePanel} data-testid="plan-open-create-panel">
          Create plan
        </button>
      </div>
      <div className="plans-table-scroll">
        <table className="projects-table projects-table--dense" data-testid="plans-table">
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Labels</th>
              <th scope="col">Cases</th>
              <th scope="col">Manual</th>
              <th scope="col">Auto</th>
            </tr>
          </thead>
          <tbody>
            {plansResult.fetching && plans.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <PageLoading />
                </td>
              </tr>
            ) : null}
            {filteredPlans.map((plan) => (
              <tr
                key={plan.id}
                data-testid="plan-row"
                data-plan-id={plan.id}
                className={selectedPlanId === plan.id ? "projects-table-row--selected" : undefined}
                onClick={() => selectPlan(plan.id)}
              >
                <td>{plan.name}</td>
                <td>
                  {plan.releaseLabel ?? "—"} / {plan.sprintLabel ?? "—"}
                </td>
                <td>{plan.memberStats?.directTestCaseCount ?? plan.testCases.length}</td>
                <td>{plan.memberStats?.flattenedManualCount ?? 0}</td>
                <td>{plan.memberStats?.flattenedAutomatedCount ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const catalog =
    selectedPlan !== null ? (
      <PlanCaseCatalogTable
        rows={testCases}
        filteredRows={filteredCases}
        memberIds={memberIds}
        linkedAutomatedCountByManual={linkedAutomatedCountByManual}
        loading={casesResult.fetching}
        mode="membership"
        membershipFilter={membershipFilter}
        onMembershipFilterChange={setMembershipFilter}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        search={caseSearch}
        onSearchChange={setCaseSearch}
        epicFilterId={epicFilterId}
        onEpicFilterChange={setEpicFilterId}
        epics={epics}
        onMembershipToggle={(id, inPlan) => void onMembershipToggle(id, inPlan)}
        onQuickView={setQuickViewTc}
        onAddAllMatching={() => void onAddAllMatching()}
        onRemoveAllMatching={() => void onRemoveAllMatching()}
        bulkPending={bulkPending}
      />
    ) : (
      <p className="projects-empty plans-select-hint">Select a plan above to manage its test cases.</p>
    );

  const metadataInspector =
    selectedPlan !== null ? (
      <PlanMetadataPanel
        title="Plan details"
        name={editName}
        description={editDescription}
        releaseLabel={editReleaseLabel}
        sprintLabel={editSprintLabel}
        onNameChange={setEditName}
        onDescriptionChange={setEditDescription}
        onReleaseLabelChange={setEditReleaseLabel}
        onSprintLabelChange={setEditSprintLabel}
        saveState={saveState}
        onSave={() => void performSaveEdit()}
        onDelete={() => void onDelete()}
        onCreateRun={onCreateRun}
        onClose={closeInspector}
        mode="edit"
      >
        <p className="automation-section-hint">
          {selectedPlan.testCases.length} direct members. Linked automated tests are included when you add manual cases.
        </p>
      </PlanMetadataPanel>
    ) : creatingPlan ? (
      <PlanMetadataPanel
        title="Create plan"
        name={name}
        description={description}
        releaseLabel={releaseLabel}
        sprintLabel={sprintLabel}
        onNameChange={(v) => {
          setName(v);
          setNameError(null);
          setShowValidationPayload(false);
        }}
        onDescriptionChange={setDescription}
        onReleaseLabelChange={setReleaseLabel}
        onSprintLabelChange={setSprintLabel}
        onClose={closeInspector}
        mode="create"
        nameError={nameError}
        onSubmitCreate={() => void onCreate()}
        nameTestId="plan-create-name"
      >
        <ValidationErrorPayloadPreview open={showValidationPayload} payload={createPayload} />
      </PlanMetadataPanel>
    ) : null;

  return (
    <section className="projects-page" data-testid="plans-page">
      <ProjectWorkspaceHeader title="Plans" titleId="plans-heading" projectId={projectId} active="plans" />
      <div className="plans-workspace">
        {planTable}
        {(selectedPlan !== null || creatingPlan) && (
          <SplitWorkspace sectionKey="plans-detail" data-testid="plans-split" main={catalog} inspector={metadataInspector} />
        )}
      </div>
      {quickViewTc ? (
        <TestCaseQuickViewModal
          testCase={quickViewTc}
          linkedAutomatedCount={linkedAutomatedCountByManual.get(quickViewTc.id) ?? 0}
          inPlan={memberIds.has(quickViewTc.id)}
          onClose={() => setQuickViewTc(null)}
        />
      ) : null}
    </section>
  );
}
