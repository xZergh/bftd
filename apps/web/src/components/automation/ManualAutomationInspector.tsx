import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterLink } from "../../tamagui/RouterLink";
import { useMutation } from "urql";
import { UpdateManualTestCaseMutation } from "../../graphql/documents";
import { formatGraphQlTransportError } from "../../graphql/formatGraphQlError";
import type { LinkedAutomatedTest, TestCaseAutomationStatus } from "../../automation/automationStatus";
import { useDebouncedAutosaveEffect } from "../../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../../shell/ShellErrorsContext";
import { AutomationStatusSelect } from "./AutomationStatusBadge";
import type { TestCaseListItem } from "../../graphql/types";

type Props = {
  projectId: string;
  testCase: TestCaseListItem;
  linkedAutomated: LinkedAutomatedTest[];
  onClose: () => void;
  onUpdated: () => void;
  onSelectAutomated: (id: string) => void;
};

export function ManualAutomationInspector({
  projectId,
  testCase,
  linkedAutomated,
  onClose,
  onUpdated,
  onSelectAutomated
}: Props) {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [statusDraft, setStatusDraft] = useState(testCase.automationStatus ?? "not_automated");
  const [notesDraft, setNotesDraft] = useState(testCase.automationNotes ?? "");
  const [baseline, setBaseline] = useState({
    status: testCase.automationStatus ?? "not_automated",
    notes: testCase.automationNotes ?? ""
  });
  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);

  const [, updateManual] = useMutation(UpdateManualTestCaseMutation);

  useEffect(() => {
    setStatusDraft(testCase.automationStatus ?? "not_automated");
    setNotesDraft(testCase.automationNotes ?? "");
    setBaseline({
      status: testCase.automationStatus ?? "not_automated",
      notes: testCase.automationNotes ?? ""
    });
  }, [testCase.automationNotes, testCase.automationStatus, testCase.id]);

  const dirty = statusDraft !== baseline.status || notesDraft.trim() !== baseline.notes.trim();

  const performSave = useCallback(async (): Promise<boolean> => {
    clearShellMessages();
    setSavePhase("saving");
    const res = await updateManual({
      input: {
        id: testCase.id,
        automationStatus: statusDraft,
        automationNotes: notesDraft.trim() === "" ? null : notesDraft.trim()
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
    if (t) {
      const nextStatus = t.automationStatus ?? statusDraft;
      const nextNotes = t.automationNotes ?? "";
      setStatusDraft(nextStatus);
      setNotesDraft(nextNotes);
      setBaseline({ status: nextStatus, notes: nextNotes });
    } else {
      setBaseline({ status: statusDraft, notes: notesDraft.trim() });
    }
    onUpdated();
    return true;
  }, [
    clearShellMessages,
    notesDraft,
    onUpdated,
    setPayloadAppError,
    setTransportMessage,
    statusDraft,
    testCase.id,
    updateManual
  ]);

  useDebouncedAutosaveEffect(dirty, `${statusDraft}\0${notesDraft}\0${failBump}`, () => {
    void performSave();
  });

  const saveLabel = useMemo(() => {
    if (savePhase === "saving") {
      return "Saving…";
    }
    return dirty ? "Unsaved changes" : "All changes saved";
  }, [dirty, savePhase]);

  return (
    <div className="automation-inspector" data-testid="manual-automation-inspector">
      <div className="detail-panel-header">
        <div className="detail-panel-header-actions">
          <RouterLink to={`/projects/${projectId}/test-cases/${testCase.id}`} data-testid="manual-automation-open-tc">
            Open manual test case
          </RouterLink>
          <button type="button" className="detail-panel-close" onClick={onClose} data-testid="manual-automation-close">
            Close
          </button>
        </div>
      </div>

      <dl className="detail-meta-strip" aria-label="Manual test automation summary">
        <div className="detail-meta-item">
          <dt className="detail-meta-label">Key</dt>
          <dd>{testCase.externalKey ?? "—"}</dd>
        </div>
        <div className="detail-meta-item">
          <dt className="detail-meta-label">Title</dt>
          <dd>{testCase.title}</dd>
        </div>
      </dl>

      <div className="detail-edit-fields project-detail-edit">
        <label>
          Automation status
          <AutomationStatusSelect
            value={statusDraft}
            onChange={(next: TestCaseAutomationStatus) => setStatusDraft(next)}
            testId="manual-automation-status"
          />
        </label>
        <label>
          Automation notes
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={4}
            data-testid="manual-automation-notes"
          />
        </label>
        <div className="form-edit-actions">
          <span className={`form-save-status form-save-status--${dirty ? "unsaved" : "saved"}`}>{saveLabel}</span>
        </div>
      </div>

      <section className="automation-linked-block">
        <h3 className="projects-subheading">Linked automated tests</h3>
        {linkedAutomated.length === 0 ? (
          <p className="projects-empty">No automated test linked yet.</p>
        ) : (
          <table className="projects-table projects-table--dense automation-nested-table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Title</th>
                <th scope="col">Automation ID</th>
                <th scope="col"> </th>
              </tr>
            </thead>
            <tbody>
              {linkedAutomated.map((auto) => (
                <tr key={auto.id}>
                  <td>{auto.externalKey ? <code>{auto.externalKey}</code> : "—"}</td>
                  <td>{auto.title}</td>
                  <td>{auto.externalId ? <code>{auto.externalId}</code> : "—"}</td>
                  <td>
                    <button type="button" onClick={() => onSelectAutomated(auto.id)} data-testid={`manual-inspector-auto-${auto.id}`}>
                      Steps
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
