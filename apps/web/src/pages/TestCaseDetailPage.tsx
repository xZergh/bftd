import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import {
  LinkAutomatedManualMutation,
  LinkRequirementManualMutation,
  RequirementsListQuery,
  RestoreTestCaseMutation,
  TestCaseByIdQuery,
  TestCaseVersionHistoryQuery,
  TestCasesListQuery,
  TombstoneTestCaseMutation,
  TraceabilityGraphQuery,
  UnlinkAutomatedManualMutation,
  UnlinkRequirementManualMutation,
  UpdateAutomatedTestCaseMutation,
  UpdateManualTestCaseMutation
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import { useDebouncedAutosaveEffect } from "../hooks/useDebouncedAutosaveEffect";
import type { RequirementListItem, TestCaseListItem } from "../graphql/types";
import { useShellErrors } from "../shell/ShellErrorsContext";
import { autoNodeId, manNodeId, parseGraphNodeId } from "../traceability/graphNodeIds";
import "./ProjectsPage.css";

type StepDraft = { name: string; expectedResult: string };

type ManualEditBaseline = { title: string; stepsJson: string };

type TestCaseVersionRow = {
  id: string;
  testCaseId: string;
  versionSeq: number;
  createdAt: string;
  title: string;
  type: string;
  externalId: string | null;
  isTombstone: boolean;
  steps: Array<{ stepOrder: number; name: string; expectedResult?: string | null }>;
};

function normalizedFilledSteps(drafts: StepDraft[]): Array<{ name: string; expectedResult: string }> {
  return drafts
    .map((s) => ({ name: s.name.trim(), expectedResult: s.expectedResult.trim() }))
    .filter((s) => s.name.length > 0);
}

function normalizedStepsJson(drafts: StepDraft[]): string {
  return JSON.stringify(normalizedFilledSteps(drafts));
}

function stepsFromTestCase(
  steps:
    | Array<{ stepOrder: number; name: string; expectedResult?: string | null }>
    | undefined
    | null
): StepDraft[] {
  const ordered = [...(steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
  return ordered.map((s) => ({
    name: s.name,
    expectedResult: s.expectedResult ?? ""
  }));
}

export function TestCaseDetailPage() {
  const { projectId, testCaseId } = useParams();
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [titleDraft, setTitleDraft] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);

  const [stepDrafts, setStepDrafts] = useState<StepDraft[]>([]);
  const [manualEditBaseline, setManualEditBaseline] = useState<ManualEditBaseline | null>(null);
  const [automatedTitleBaseline, setAutomatedTitleBaseline] = useState<string | null>(null);

  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);

  const [addReqId, setAddReqId] = useState("");
  const [addManualId, setAddManualId] = useState("");

  const paused = projectId === undefined || projectId === "" || testCaseId === undefined || testCaseId === "";

  const [detailResult, reexecuteDetail] = useQuery({
    query: TestCaseByIdQuery,
    variables: { id: testCaseId ?? "", projectId: projectId ?? undefined, includeDeleted: true },
    pause: paused
  });

  const [graphResult, reexecuteGraph] = useQuery({
    query: TraceabilityGraphQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [versionHistoryResult, reexecuteVersionHistory] = useQuery({
    query: TestCaseVersionHistoryQuery,
    variables: { testCaseId: testCaseId ?? "", includeDeleted: true },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [reqResult] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [manualListResult] = useQuery({
    query: TestCasesListQuery,
    variables: { projectId: projectId ?? "", type: "manual", includeDeleted: false },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [, updateManual] = useMutation(UpdateManualTestCaseMutation);
  const [, updateAutomated] = useMutation(UpdateAutomatedTestCaseMutation);
  const [, linkReqMan] = useMutation(LinkRequirementManualMutation);
  const [, unlinkReqMan] = useMutation(UnlinkRequirementManualMutation);
  const [, linkAutoMan] = useMutation(LinkAutomatedManualMutation);
  const [, unlinkAutoMan] = useMutation(UnlinkAutomatedManualMutation);
  const [, tombstone] = useMutation(TombstoneTestCaseMutation);
  const [, restore] = useMutation(RestoreTestCaseMutation);

  const tc = detailResult.data?.testCase;

  useEffect(() => {
    if (testCaseId === undefined || testCaseId === "") {
      return;
    }
    if (tc === undefined || tc === null || tc.id !== testCaseId) {
      return;
    }
    if (tc.type === "manual") {
      setTitleDraft(tc.title);
      const ordered = [...(tc.steps ?? [])].sort((a, b) => a.stepOrder - b.stepOrder);
      const drafts = ordered.map((s) => ({
        name: s.name,
        expectedResult: s.expectedResult ?? ""
      }));
      setStepDrafts(drafts.length > 0 ? drafts : [{ name: "", expectedResult: "" }]);
      const filled = normalizedFilledSteps(drafts);
      setManualEditBaseline({ title: tc.title, stepsJson: JSON.stringify(filled) });
      setAutomatedTitleBaseline(null);
    } else {
      setTitleDraft(tc.title);
      setAutomatedTitleBaseline(tc.title);
      setManualEditBaseline(null);
      setStepDrafts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- hydrate on navigation / id only, not refetch
  }, [testCaseId, tc?.id]);

  useEffect(() => {
    if (!detailResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(detailResult.error));
  }, [detailResult.error, setTransportMessage]);

  useEffect(() => {
    if (!graphResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(graphResult.error));
  }, [graphResult.error, setTransportMessage]);

  useEffect(() => {
    if (!versionHistoryResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(versionHistoryResult.error));
  }, [versionHistoryResult.error, setTransportMessage]);

  const graph = graphResult.data?.traceabilityGraph;
  const nodeTitle = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of graph?.nodes ?? []) {
      m.set(n.id, n.title);
    }
    return m;
  }, [graph?.nodes]);

  const linkedRequirements = useMemo(() => {
    if (tc?.type !== "manual" || graph === undefined) {
      return [];
    }
    const target = manNodeId(tc.id);
    const out: { id: string; title: string }[] = [];
    for (const e of graph.edges) {
      if (e.kind !== "REQ_MANUAL" || e.targetId !== target) {
        continue;
      }
      const p = parseGraphNodeId(e.sourceId);
      if (p?.kind !== "req") {
        continue;
      }
      out.push({ id: p.id, title: nodeTitle.get(e.sourceId) ?? p.id });
    }
    return out.sort((a, b) => a.title.localeCompare(b.title));
  }, [graph, nodeTitle, tc?.id, tc?.type]);

  const linkedManuals = useMemo(() => {
    if (tc?.type !== "automated" || graph === undefined) {
      return [];
    }
    const target = autoNodeId(tc.id);
    const out: { id: string; title: string }[] = [];
    for (const e of graph.edges) {
      if (e.kind !== "MANUAL_AUTO" || e.targetId !== target) {
        continue;
      }
      const p = parseGraphNodeId(e.sourceId);
      if (p?.kind !== "man") {
        continue;
      }
      out.push({ id: p.id, title: nodeTitle.get(e.sourceId) ?? p.id });
    }
    return out.sort((a, b) => a.title.localeCompare(b.title));
  }, [graph, nodeTitle, tc?.id, tc?.type]);

  const versionRows = useMemo(() => {
    const raw = (versionHistoryResult.data?.testCaseVersionHistory ?? []) as TestCaseVersionRow[];
    return [...raw].sort((a, b) => b.versionSeq - a.versionSeq);
  }, [versionHistoryResult.data?.testCaseVersionHistory]);

  const requirements: RequirementListItem[] = reqResult.data?.requirements ?? [];
  const manuals: TestCaseListItem[] = manualListResult.data?.testCases ?? [];

  const reqChoicesForLink = useMemo(() => {
    const linked = new Set(linkedRequirements.map((r) => r.id));
    return requirements.filter((r) => !linked.has(r.id));
  }, [linkedRequirements, requirements]);

  const manualChoicesForLink = useMemo(() => {
    const linked = new Set(linkedManuals.map((m) => m.id));
    return manuals.filter((m) => !linked.has(m.id));
  }, [linkedManuals, manuals]);

  const manualDirty =
    tc?.type === "manual" &&
    manualEditBaseline !== null &&
    (titleDraft.trim() !== manualEditBaseline.title.trim() ||
      normalizedStepsJson(stepDrafts) !== manualEditBaseline.stepsJson);

  const automatedDirty =
    tc?.type === "automated" &&
    automatedTitleBaseline !== null &&
    titleDraft.trim() !== automatedTitleBaseline.trim();

  const canAutosaveManual =
    trimmedNonEmpty(titleDraft.trim()) && normalizedFilledSteps(stepDrafts).length > 0;

  const canAutosaveAutomated = trimmedNonEmpty(titleDraft.trim());

  const performSaveManual = useCallback(
    async (validateClient: boolean): Promise<boolean> => {
      if (paused || tc?.type !== "manual" || tc.isDeleted) {
        return false;
      }
      const filledSteps = normalizedFilledSteps(stepDrafts);
      if (!trimmedNonEmpty(titleDraft.trim())) {
        if (validateClient) {
          clearShellMessages();
          setTitleError(REQUIRED_MSG);
        }
        return false;
      }
      if (filledSteps.length === 0) {
        if (validateClient) {
          clearShellMessages();
          setTransportMessage("Manual test case needs at least one step with a name.");
        }
        return false;
      }
      if (validateClient) {
        clearShellMessages();
        setTitleError(null);
      }
      setSavePhase("saving");
      const res = await updateManual({
        input: {
          id: tc.id,
          title: titleDraft.trim(),
          steps: filledSteps.map((s) => ({
            name: s.name,
            expectedResult: s.expectedResult === "" ? undefined : s.expectedResult
          }))
        }
      });
      setSavePhase("idle");
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        setFailBump((n) => n + 1);
        return false;
      }
      const appErr = res.data?.updateManualTestCase?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        setFailBump((n) => n + 1);
        return false;
      }
      const t = res.data?.updateManualTestCase?.testCase;
      if (t !== undefined && t !== null) {
        setTitleDraft(t.title);
        const drafts = stepsFromTestCase(t.steps);
        setStepDrafts(drafts.length > 0 ? drafts : [{ name: "", expectedResult: "" }]);
        const filled = normalizedFilledSteps(drafts.length > 0 ? drafts : [{ name: "", expectedResult: "" }]);
        setManualEditBaseline({ title: t.title, stepsJson: JSON.stringify(filled) });
      }
      reexecuteDetail({ requestPolicy: "network-only" });
      reexecuteGraph({ requestPolicy: "network-only" });
      reexecuteVersionHistory({ requestPolicy: "network-only" });
      return true;
    },
    [
      clearShellMessages,
      paused,
      reexecuteDetail,
      reexecuteGraph,
      reexecuteVersionHistory,
      setPayloadAppError,
      setTransportMessage,
      stepDrafts,
      tc,
      titleDraft,
      updateManual
    ]
  );

  const performSaveAutomated = useCallback(
    async (validateClient: boolean): Promise<boolean> => {
      if (paused || tc?.type !== "automated" || tc.isDeleted) {
        return false;
      }
      if (!trimmedNonEmpty(titleDraft.trim())) {
        if (validateClient) {
          clearShellMessages();
          setTitleError(REQUIRED_MSG);
        }
        return false;
      }
      if (validateClient) {
        clearShellMessages();
        setTitleError(null);
      }
      setSavePhase("saving");
      const res = await updateAutomated({
        input: { id: tc.id, title: titleDraft.trim() }
      });
      setSavePhase("idle");
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        setFailBump((n) => n + 1);
        return false;
      }
      const appErr = res.data?.updateAutomatedTestCase?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        setFailBump((n) => n + 1);
        return false;
      }
      const t = res.data?.updateAutomatedTestCase?.testCase;
      if (t !== undefined && t !== null) {
        setTitleDraft(t.title);
        setAutomatedTitleBaseline(t.title);
      }
      reexecuteDetail({ requestPolicy: "network-only" });
      reexecuteVersionHistory({ requestPolicy: "network-only" });
      return true;
    },
    [
      clearShellMessages,
      paused,
      reexecuteDetail,
      reexecuteVersionHistory,
      setPayloadAppError,
      setTransportMessage,
      tc,
      titleDraft,
      updateAutomated
    ]
  );

  const manualAutosaveKey = `${titleDraft}\0${normalizedStepsJson(stepDrafts)}\0${failBump}`;
  const cancelManualAutosave = useDebouncedAutosaveEffect(
    !paused &&
      tc?.type === "manual" &&
      tc.isDeleted === false &&
      manualDirty &&
      canAutosaveManual,
    manualAutosaveKey,
    () => {
      void performSaveManual(false);
    }
  );

  const cancelAutomatedAutosave = useDebouncedAutosaveEffect(
    !paused &&
      tc?.type === "automated" &&
      tc.isDeleted === false &&
      automatedDirty &&
      canAutosaveAutomated,
    `${titleDraft}\0${failBump}`,
    () => {
      void performSaveAutomated(false);
    }
  );

  const onSaveManualClick = useCallback(() => {
    cancelManualAutosave();
    void performSaveManual(true);
  }, [cancelManualAutosave, performSaveManual]);

  const onSaveAutomatedClick = useCallback(() => {
    cancelAutomatedAutosave();
    void performSaveAutomated(true);
  }, [cancelAutomatedAutosave, performSaveAutomated]);

  const saveState: "saved" | "unsaved" | "saving" =
    savePhase === "saving"
      ? "saving"
      : tc?.type === "manual"
        ? manualDirty
          ? "unsaved"
          : "saved"
        : tc?.type === "automated"
          ? automatedDirty
            ? "unsaved"
            : "saved"
          : "saved";

  const saveStatusLabel =
    savePhase === "saving" ? "Saving…" : saveState === "unsaved" ? "Unsaved changes" : "All changes saved";

  const onLinkRequirement = useCallback(async () => {
    if (paused || projectId === undefined || tc?.type !== "manual" || addReqId === "" || tc.isDeleted) {
      return;
    }
    cancelManualAutosave();
    clearShellMessages();
    const res = await linkReqMan({
      input: { projectId, requirementId: addReqId, manualTestCaseId: tc.id }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    setAddReqId("");
    reexecuteGraph({ requestPolicy: "network-only" });
  }, [addReqId, cancelManualAutosave, clearShellMessages, linkReqMan, paused, projectId, reexecuteGraph, tc]);

  const onUnlinkRequirement = useCallback(
    async (requirementId: string) => {
      if (paused || tc?.type !== "manual" || tc.isDeleted) {
        return;
      }
      cancelManualAutosave();
      clearShellMessages();
      const res = await unlinkReqMan({ input: { requirementId, manualTestCaseId: tc.id } });
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        return;
      }
      reexecuteGraph({ requestPolicy: "network-only" });
    },
    [cancelManualAutosave, clearShellMessages, paused, reexecuteGraph, tc, unlinkReqMan]
  );

  const onLinkManual = useCallback(async () => {
    if (paused || projectId === undefined || tc?.type !== "automated" || addManualId === "" || tc.isDeleted) {
      return;
    }
    cancelAutomatedAutosave();
    clearShellMessages();
    const res = await linkAutoMan({
      input: { projectId, automatedTestCaseId: tc.id, manualTestCaseId: addManualId }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    setAddManualId("");
    reexecuteGraph({ requestPolicy: "network-only" });
  }, [addManualId, cancelAutomatedAutosave, clearShellMessages, linkAutoMan, paused, projectId, reexecuteGraph, tc]);

  const onUnlinkManual = useCallback(
    async (manualTestCaseId: string) => {
      if (paused || tc?.type !== "automated" || tc.isDeleted) {
        return;
      }
      cancelAutomatedAutosave();
      clearShellMessages();
      const res = await unlinkAutoMan({ input: { automatedTestCaseId: tc.id, manualTestCaseId } });
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        return;
      }
      reexecuteGraph({ requestPolicy: "network-only" });
    },
    [cancelAutomatedAutosave, clearShellMessages, paused, reexecuteGraph, tc, unlinkAutoMan]
  );

  const onTombstone = useCallback(async () => {
    if (paused || tc === undefined || tc === null) {
      return;
    }
    cancelManualAutosave();
    cancelAutomatedAutosave();
    clearShellMessages();
    const res = await tombstone({ testCaseId: tc.id });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    reexecuteDetail({ requestPolicy: "network-only" });
    reexecuteGraph({ requestPolicy: "network-only" });
    reexecuteVersionHistory({ requestPolicy: "network-only" });
  }, [
    cancelAutomatedAutosave,
    cancelManualAutosave,
    clearShellMessages,
    paused,
    reexecuteDetail,
    reexecuteGraph,
    reexecuteVersionHistory,
    tc,
    tombstone
  ]);

  const onRestore = useCallback(async () => {
    if (paused || tc === undefined || tc === null) {
      return;
    }
    clearShellMessages();
    const res = await restore({ testCaseId: tc.id });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    reexecuteDetail({ requestPolicy: "network-only" });
    reexecuteGraph({ requestPolicy: "network-only" });
    reexecuteVersionHistory({ requestPolicy: "network-only" });
  }, [clearShellMessages, paused, reexecuteDetail, reexecuteGraph, reexecuteVersionHistory, restore, tc]);

  if (paused) {
    return null;
  }

  if (detailResult.fetching && detailResult.data === undefined) {
    return (
      <section className="projects-page" data-testid="testcase-detail-loading">
        <PageLoading />
      </section>
    );
  }

  if (!detailResult.fetching && detailResult.data !== undefined && tc === null) {
    return (
      <section className="projects-page" data-testid="testcase-not-found">
        <h2>Test case not found</h2>
        <Link to={`/projects/${projectId}/test-cases`}>Back to test cases</Link>
      </section>
    );
  }

  if (tc === undefined || tc === null) {
    return (
      <section className="projects-page" data-testid="testcase-detail-loading">
        <PageLoading />
      </section>
    );
  }

  const editable = !tc.isDeleted;

  return (
    <section className="projects-page" data-testid="testcase-detail-page">
      <div className="project-detail-header">
        <h2>Test case</h2>
        <Link to={`/projects/${projectId}/test-cases`} data-testid="testcase-back-list">
          ← Test cases
        </Link>
      </div>

      <dl className="project-detail-meta">
        <div>
          <dt>Type</dt>
          <dd data-testid="testcase-detail-type">{tc.type}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd data-testid="testcase-detail-status">{tc.isDeleted ? "Deleted (tombstoned)" : "Active"}</dd>
        </div>
      </dl>

      {tc.isDeleted && (
        <p className="shell-banner err" role="status" data-testid="testcase-deleted-banner">
          This test case is deleted. Restore it to edit or link traceability.
        </p>
      )}

      <div className="projects-create project-detail-edit">
        <h3 className="projects-subheading">Title</h3>
        <div className="projects-create-fields">
          <label>
            Title <span className="required-star" aria-hidden="true">*</span>
            <input
              type="text"
              value={titleDraft}
              disabled={!editable}
              onChange={(e) => {
                setTitleDraft(e.target.value);
                setTitleError(null);
              }}
              data-testid="testcase-edit-title"
            />
            {titleError !== null && (
              <p className="field-error" role="alert" data-testid="testcase-edit-title-error">
                {titleError}
              </p>
            )}
          </label>
        </div>
        {tc.type === "manual" && editable && (
          <div className="form-edit-actions">
            <span
              className={`form-save-status form-save-status--${saveState}`}
              data-testid="form-save-status"
              data-save-state={saveState}
            >
              {saveStatusLabel}
            </span>
            <button type="button" onClick={onSaveManualClick} data-testid="testcase-save-manual">
              Save
            </button>
          </div>
        )}
        {tc.type === "automated" && editable && (
          <div className="form-edit-actions">
            <span
              className={`form-save-status form-save-status--${saveState}`}
              data-testid="form-save-status"
              data-save-state={saveState}
            >
              {saveStatusLabel}
            </span>
            <button type="button" onClick={onSaveAutomatedClick} data-testid="testcase-save-auto-title">
              Save title
            </button>
          </div>
        )}
      </div>

      {tc.type === "manual" && editable && (
        <div className="projects-create project-detail-edit" data-testid="testcase-manual-steps">
          <h3 className="projects-subheading">Steps</h3>
          {stepDrafts.map((s, i) => (
            <div key={i} className="testcase-step-row">
              <label>
                Step {i + 1} name
                <input
                  type="text"
                  value={s.name}
                  onChange={(e) => {
                    const next = [...stepDrafts];
                    next[i] = { ...next[i]!, name: e.target.value };
                    setStepDrafts(next);
                  }}
                  data-testid={`testcase-edit-step-name-${i}`}
                />
              </label>
              <label>
                Expected
                <input
                  type="text"
                  value={s.expectedResult}
                  onChange={(e) => {
                    const next = [...stepDrafts];
                    next[i] = { ...next[i]!, expectedResult: e.target.value };
                    setStepDrafts(next);
                  }}
                  data-testid={`testcase-edit-step-expected-${i}`}
                />
              </label>
              {stepDrafts.length > 1 && (
                <button
                  type="button"
                  onClick={() => setStepDrafts(stepDrafts.filter((_, j) => j !== i))}
                  data-testid={`testcase-edit-step-remove-${i}`}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => setStepDrafts([...stepDrafts, { name: "", expectedResult: "" }])}
            data-testid="testcase-edit-step-add"
          >
            Add step
          </button>
        </div>
      )}

      {tc.type === "manual" && (
        <div className="projects-create project-detail-edit" data-testid="testcase-manual-links">
          <h3 className="projects-subheading">Linked requirements</h3>
          {linkedRequirements.length === 0 ? (
            <p className="hint">No requirement links.</p>
          ) : (
            <ul className="testcase-link-list">
              {linkedRequirements.map((r) => (
                <li key={r.id} data-linked-req-id={r.id}>
                  <span data-testid="testcase-linked-req-title">{r.title}</span>
                  {editable && (
                    <button
                      type="button"
                      onClick={() => void onUnlinkRequirement(r.id)}
                      data-testid={`testcase-unlink-req-${r.id}`}
                    >
                      Unlink
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && reqChoicesForLink.length > 0 && (
            <div className="testcase-link-add">
              <label>
                Add requirement
                <select
                  value={addReqId}
                  onChange={(e) => setAddReqId(e.target.value)}
                  data-testid="testcase-add-req-select"
                >
                  <option value="">—</option>
                  {reqChoicesForLink.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.externalKey} — {r.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void onLinkRequirement()}
                disabled={addReqId === ""}
                data-testid="testcase-add-req-submit"
              >
                Link
              </button>
            </div>
          )}
        </div>
      )}

      {tc.type === "automated" && (
        <div className="projects-create project-detail-edit" data-testid="testcase-auto-links">
          <h3 className="projects-subheading">Linked manual test cases</h3>
          {linkedManuals.length === 0 ? (
            <p className="hint">No manual test links.</p>
          ) : (
            <ul className="testcase-link-list">
              {linkedManuals.map((m) => (
                <li key={m.id} data-linked-manual-id={m.id}>
                  <span data-testid="testcase-linked-manual-title">{m.title}</span>
                  {editable && linkedManuals.length > 1 && (
                    <button
                      type="button"
                      onClick={() => void onUnlinkManual(m.id)}
                      data-testid={`testcase-unlink-manual-${m.id}`}
                    >
                      Unlink
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {editable && manualChoicesForLink.length > 0 && (
            <div className="testcase-link-add">
              <label>
                Add manual test case
                <select
                  value={addManualId}
                  onChange={(e) => setAddManualId(e.target.value)}
                  data-testid="testcase-add-manual-select"
                >
                  <option value="">—</option>
                  {manualChoicesForLink.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={() => void onLinkManual()}
                disabled={addManualId === ""}
                data-testid="testcase-add-manual-submit"
              >
                Link
              </button>
            </div>
          )}
        </div>
      )}

      <div className="projects-create" data-testid="testcase-version-history">
        <h3 className="projects-subheading">Version history</h3>
        {versionHistoryResult.fetching && versionRows.length === 0 ? (
          <PageLoading dataTestId="testcase-version-history-loading" />
        ) : null}
        {versionRows.length === 0 && !versionHistoryResult.fetching ? (
          <p className="hint" data-testid="testcase-version-history-empty">
            No versions recorded yet.
          </p>
        ) : (
          <table className="projects-table testcase-version-history-table">
            <thead>
              <tr>
                <th scope="col">Seq</th>
                <th scope="col">Recorded</th>
                <th scope="col">Title</th>
                <th scope="col">Type</th>
                <th scope="col">Tombstone</th>
                <th scope="col">Steps</th>
              </tr>
            </thead>
            <tbody>
              {versionRows.map((v) => (
                <tr key={v.id} data-testid="testcase-version-row" data-version-seq={String(v.versionSeq)}>
                  <td data-testid="testcase-version-seq">{v.versionSeq}</td>
                  <td>
                    <time dateTime={v.createdAt}>{v.createdAt}</time>
                  </td>
                  <td data-testid="testcase-version-title">{v.title}</td>
                  <td>{v.type}</td>
                  <td>{v.isTombstone ? "Yes" : "No"}</td>
                  <td data-testid="testcase-version-steps-count">{v.steps.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="project-detail-actions">
        {editable ? (
          <button type="button" onClick={() => void onTombstone()} data-testid="testcase-tombstone">
            Delete (tombstone)
          </button>
        ) : (
          <button type="button" onClick={() => void onRestore()} data-testid="testcase-restore">
            Restore
          </button>
        )}
      </div>
    </section>
  );
}
