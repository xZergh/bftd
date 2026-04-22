import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
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
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

export function TestPlansListPage() {
  const { projectId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [releaseLabel, setReleaseLabel] = useState("");
  const [sprintLabel, setSprintLabel] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editReleaseLabel, setEditReleaseLabel] = useState("");
  const [editSprintLabel, setEditSprintLabel] = useState("");

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

  const [, createPlan] = useMutation(CreateTestPlanMutation);
  const [, updatePlan] = useMutation(UpdateTestPlanMutation);
  const [, deletePlan] = useMutation(DeleteTestPlanMutation);
  const [, linkCase] = useMutation(LinkTestPlanTestCaseMutation);
  const [, unlinkCase] = useMutation(UnlinkTestPlanTestCaseMutation);

  useEffect(() => {
    if (!plansResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(plansResult.error));
  }, [plansResult.error, setTransportMessage]);

  const plans: TestPlanListItem[] = plansResult.data?.testPlans ?? [];
  const testCases: TestCaseListItem[] = casesResult.data?.testCases ?? [];
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;

  useEffect(() => {
    if (!selectedPlan && plans.length > 0 && selectedPlanId !== null) {
      setSelectedPlanId(plans[0]!.id);
    }
    if (plans.length === 0) {
      setSelectedPlanId(null);
    }
  }, [plans, selectedPlan, selectedPlanId]);

  useEffect(() => {
    if (!selectedPlan) return;
    setEditName(selectedPlan.name);
    setEditDescription(selectedPlan.description ?? "");
    setEditReleaseLabel(selectedPlan.releaseLabel ?? "");
    setEditSprintLabel(selectedPlan.sprintLabel ?? "");
  }, [selectedPlan]);

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

  const onSaveEdit = useCallback(async () => {
    if (!selectedPlan) return;
    const res = await updatePlan({
      input: {
        id: selectedPlan.id,
        name: editName.trim(),
        description: editDescription.trim() || null,
        releaseLabel: editReleaseLabel.trim() || null,
        sprintLabel: editSprintLabel.trim() || null
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.updateTestPlan?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    await reexecutePlans({ requestPolicy: "network-only" });
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

  const onDelete = useCallback(async () => {
    if (!selectedPlan) return;
    const res = await deletePlan({ id: selectedPlan.id });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    await reexecutePlans({ requestPolicy: "network-only" });
  }, [deletePlan, reexecutePlans, selectedPlan, setTransportMessage]);

  const onToggleCase = useCallback(
    async (testCaseId: string, checked: boolean) => {
      if (!selectedPlan) return;
      if (checked) {
        const res = await unlinkCase({ testPlanId: selectedPlan.id, testCaseId });
        if (res.error) {
          setTransportMessage(formatGraphQlTransportError(res.error));
          return;
        }
      } else {
        const res = await linkCase({ testPlanId: selectedPlan.id, testCaseId });
        if (res.error) {
          setTransportMessage(formatGraphQlTransportError(res.error));
          return;
        }
      }
      await reexecutePlans({ requestPolicy: "network-only" });
    },
    [linkCase, reexecutePlans, selectedPlan, setTransportMessage, unlinkCase]
  );

  if (paused) return null;

  return (
    <section className="projects-page" data-testid="plans-page">
      <ProjectWorkspaceHeader title="Plans" titleId="plans-heading" projectId={projectId} active="plans" />

      <table className="projects-table" data-testid="plans-table">
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Labels</th>
            <th scope="col">Test cases</th>
            <th scope="col"> </th>
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
                placeholder="Name"
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
                placeholder="Release"
                data-testid="plan-create-release-label"
                className="projects-table-inline-input"
              />
              <input
                type="text"
                value={sprintLabel}
                onChange={(e) => setSprintLabel(e.target.value)}
                placeholder="Sprint"
                data-testid="plan-create-sprint-label"
                className="projects-table-inline-input"
              />
            </td>
            <td>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (optional)"
                data-testid="plan-create-description"
                className="projects-table-inline-input"
              />
            </td>
            <td>
              <button type="button" data-testid="plan-create-submit" onClick={onCreate}>
                Create plan
              </button>
            </td>
          </tr>
          {showValidationPayload ? (
            <tr className="projects-table-create-meta-row">
              <td colSpan={4}>
                <ValidationErrorPayloadPreview open={showValidationPayload} payload={createPayload} />
              </td>
            </tr>
          ) : null}
          {plansResult.fetching && plans.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <PageLoading />
              </td>
            </tr>
          ) : null}
          {plans.map((plan) => (
            <tr key={plan.id} data-testid="plan-row" data-plan-id={plan.id}>
              <td>{plan.name}</td>
              <td>
                {plan.releaseLabel ?? "—"} / {plan.sprintLabel ?? "—"}
              </td>
              <td>{plan.testCases.length}</td>
              <td>
                <button type="button" data-testid="plan-manage" onClick={() => setSelectedPlanId(plan.id)}>
                  Manage
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedPlan ? (
        <section className="projects-create" data-testid="plan-manage-panel">
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
          <div className="projects-create-actions">
            <button type="button" data-testid="plan-edit-save" onClick={onSaveEdit}>
              Save
            </button>
            <button type="button" data-testid="plan-delete" onClick={onDelete}>
              Delete
            </button>
          </div>

          <fieldset className="testcase-fieldset">
            <legend>Linked test cases</legend>
            <ul className="testcase-req-checklist" data-testid="plan-case-checklist">
              {testCases.map((tc) => {
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
                      {tc.type} - {tc.title}
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </section>
      ) : null}
    </section>
  );
}
