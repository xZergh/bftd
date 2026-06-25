import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { RowSaveIndicator } from "../components/workspace/RowSaveIndicator";
import { SplitWorkspace } from "../components/workspace/SplitWorkspace";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { demoPlaceholders } from "../constants/demoPlaceholders";
import {
  CreateTestPlanMutation,
  DeleteTestPlanMutation,
  LinkTestPlanTestCaseMutation,
  TestCasesListQuery,
  TestPlansListQuery,
  UnlinkTestPlanTestCaseMutation,
  UpdateTestPlanMutation
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import type { TestCaseListItem, TestPlanListItem } from "../graphql/types";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import { useDebouncedAutosaveEffect } from "../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../shell/ShellErrorsContext";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanId = searchParams.get("plan");
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseLabel, setReleaseLabel] = useState("");
  const [sprintLabel, setSprintLabel] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);
  const [caseFilter, setCaseFilter] = useState("");

  const [editBaseline, setEditBaseline] = useState<PlanEditBaseline | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReleaseLabel, setEditReleaseLabel] = useState("");
  const [editSprintLabel, setEditSprintLabel] = useState("");
  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);

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
  const [plansResult, reexecutePlans] = useQuery({
    query: TestPlansListQuery,
    variables: { projectId: projectId ?? "" },
    pause: queryPaused
  });
  const [casesResult] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", includeDeleted: false },
    pause: queryPaused
  });

  const [, createPlan] = useMutation(CreateTestPlanMutation);
  const [, updatePlan] = useMutation(UpdateTestPlanMutation);
  const [, deletePlan] = useMutation(DeleteTestPlanMutation);
  const [, linkCase] = useMutation(LinkTestPlanTestCaseMutation);
  const [, unlinkCase] = useMutation(UnlinkTestPlanTestCaseMutation);

  useEffect(() => {
    if (!plansResult.error) {
      return;
    }
    queueMicrotask(() => {
      setTransportMessage(formatGraphQlTransportError(plansResult.error!));
    });
  }, [plansResult.error, setTransportMessage]);

  const plans: TestPlanListItem[] = plansResult.data?.testPlans ?? [];
  const testCases: TestCaseListItem[] = casesResult.data?.testCases ?? [];
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

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
    if (!selectedPlan || !trimmedNonEmpty(editName.trim())) {
      return false;
    }
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
      const b = {
        name: p.name,
        description: p.description ?? "",
        releaseLabel: p.releaseLabel ?? "",
        sprintLabel: p.sprintLabel ?? ""
      };
      setEditBaseline(b);
    }
    await reexecutePlans({ requestPolicy: "network-only" });
    return true;
  }, [
    editDescription,
    editName,
    editReleaseLabel,
    editSprintLabel,
    reexecutePlans,
    selectedPlan,
    setPayloadAppError,
    setTransportMessage,
    updatePlan
  ]);

  useDebouncedAutosaveEffect(
    selectedPlan !== null && editDirty && trimmedNonEmpty(editName.trim()),
    `${editName}\0${editDescription}\0${editReleaseLabel}\0${editSprintLabel}\0${failBump}`,
    () => {
      void performSaveEdit();
    }
  );

  const createPayload = useMemo(
    () => ({
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
    }),
    [description, name, projectId, releaseLabel, sprintLabel]
  );

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
    setName("");
    setDescription("");
    setReleaseLabel("");
    setSprintLabel("");
    await reexecutePlans({ requestPolicy: "network-only" });
  }, [
    clearShellMessages,
    createPlan,
    description,
    name,
    paused,
    projectId,
    reexecutePlans,
    releaseLabel,
    setPayloadAppError,
    setTransportMessage,
    sprintLabel
  ]);

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
    await reexecutePlans({ requestPolicy: "network-only" });
  }, [deletePlan, reexecutePlans, selectedPlan, setSearchParams, setTransportMessage]);

  const onToggleCase = useCallback(
    async (testCaseId: string, checked: boolean) => {
      if (!selectedPlan) return;
      if (checked) {
        await unlinkCase({ testPlanId: selectedPlan.id, testCaseId });
      } else {
        await linkCase({ testPlanId: selectedPlan.id, testCaseId });
      }
      await reexecutePlans({ requestPolicy: "network-only" });
    },
    [linkCase, reexecutePlans, selectedPlan, unlinkCase]
  );

  const selectPlan = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("plan", id);
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
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  if (paused) return null;

  const saveState = savePhase === "saving" ? "saving" : editDirty ? "unsaved" : "saved";

  const filteredCases = testCases.filter((tc) => {
    const q = caseFilter.trim().toLowerCase();
    if (q === "") return true;
    return tc.title.toLowerCase().includes(q) || tc.type.toLowerCase().includes(q);
  });

  const table = (
    <table className="projects-table projects-table--dense" data-testid="plans-table">
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Labels</th>
          <th scope="col">Test cases</th>
        </tr>
      </thead>
      <tbody>
        <tr className="projects-table-create-row" data-testid="plan-create-row">
          <td>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
                setShowValidationPayload(false);
              }}
              placeholder={demoPlaceholders.plan.name}
              data-testid="plan-create-name"
              className="projects-table-inline-input"
            />
            {nameError ? (
              <p className="field-error" role="alert" data-testid="plan-create-name-error">
                {nameError}
              </p>
            ) : null}
          </td>
          <td>
            <input
              type="text"
              value={releaseLabel}
              onChange={(e) => setReleaseLabel(e.target.value)}
              placeholder={demoPlaceholders.plan.releaseLabel}
              data-testid="plan-create-release-label"
              className="projects-table-inline-input"
            />
            <input
              type="text"
              value={sprintLabel}
              onChange={(e) => setSprintLabel(e.target.value)}
              placeholder={demoPlaceholders.plan.sprintLabel}
              data-testid="plan-create-sprint-label"
              className="projects-table-inline-input"
            />
          </td>
          <td>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={demoPlaceholders.plan.description}
              data-testid="plan-create-description"
              className="projects-table-inline-input"
            />
            <button type="button" data-testid="plan-create-submit" onClick={() => void onCreate()}>
              Create plan
            </button>
          </td>
        </tr>
        {showValidationPayload ? (
          <tr className="projects-table-create-meta-row">
            <td colSpan={3}>
              <ValidationErrorPayloadPreview open={showValidationPayload} payload={createPayload} />
            </td>
          </tr>
        ) : null}
        {plansResult.fetching && plans.length === 0 ? (
          <tr>
            <td colSpan={3}>
              <PageLoading />
            </td>
          </tr>
        ) : null}
        {plans.map((plan) => (
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
            <td>{plan.testCases.length}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const inspector =
    selectedPlan !== null ? (
      <section className="plan-edit-panel" data-testid="plan-manage-panel">
        <div className="detail-panel-header">
          <button type="button" className="detail-panel-close" onClick={closeInspector} data-testid="plan-inspector-close">
            Close
          </button>
        </div>
        <h3 className="projects-subheading">Edit plan</h3>
        <div className="projects-create-fields">
          <label>
            Name
            <input value={editName} onChange={(e) => setEditName(e.target.value)} data-testid="plan-edit-name" />
          </label>
          <label>
            Description
            <input
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              data-testid="plan-edit-description"
            />
          </label>
          <label>
            Release
            <input
              value={editReleaseLabel}
              onChange={(e) => setEditReleaseLabel(e.target.value)}
              data-testid="plan-edit-release-label"
            />
          </label>
          <label>
            Sprint
            <input
              value={editSprintLabel}
              onChange={(e) => setEditSprintLabel(e.target.value)}
              data-testid="plan-edit-sprint-label"
            />
          </label>
        </div>
        <div className="form-edit-actions">
          <RowSaveIndicator state={saveState} />
          <button type="button" data-testid="plan-edit-save" onClick={() => void performSaveEdit()}>
            Save
          </button>
          <button type="button" data-testid="plan-delete" onClick={() => void onDelete()}>
            Delete
          </button>
        </div>

        <fieldset className="testcase-fieldset">
          <legend>Linked test cases</legend>
          <label className="projects-checkbox-label">
            Filter
            <input
              type="search"
              value={caseFilter}
              onChange={(e) => setCaseFilter(e.target.value)}
              data-testid="plan-case-filter"
              placeholder="Type or title"
            />
          </label>
          <ul className="testcase-req-checklist" data-testid="plan-case-checklist">
            {filteredCases.map((tc) => {
              const checked = selectedPlan.testCases.some((linked) => linked.id === tc.id);
              return (
                <li key={tc.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => void onToggleCase(tc.id, checked)}
                      data-testid={`plan-case-${tc.id}`}
                    />
                    <span className="badge active">{tc.type}</span> {tc.title}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </section>
    ) : null;

  return (
    <section className="projects-page" data-testid="plans-page">
      <ProjectWorkspaceHeader title="Plans" titleId="plans-heading" projectId={projectId} active="plans" />
      <SplitWorkspace sectionKey="plans" data-testid="plans-split" main={table} inspector={inspector} />
    </section>
  );
}
