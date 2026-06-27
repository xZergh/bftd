import { useCallback, useState } from "react";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../PageLoading";
import { RouterLink } from "../../tamagui/RouterLink";
import {
  CreateEpicMutation,
  DeleteEpicMutation,
  EpicsListQuery,
  UpdateEpicMutation
} from "../../graphql/documents";
import { formatGraphQlTransportError } from "../../graphql/formatGraphQlError";
import { REQUIRED_MSG, trimmedNonEmpty } from "../../forms/mandatoryFields";
import { buildEpicFilterPath } from "../../navigation/epicFilter";
import { useShellErrors } from "../../shell/ShellErrorsContext";

type Props = {
  projectId: string;
  onClose?: () => void;
  onChanged?: () => void;
};

export function EpicsManagePanel({ projectId, onClose, onChanged }: Props) {
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();
  const [externalKey, setExternalKey] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyError, setKeyError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [listResult, reexecuteList] = useQuery({
    query: EpicsListQuery,
    variables: { projectId },
    requestPolicy: "network-only"
  });

  const [, createEpic] = useMutation(CreateEpicMutation);
  const [, updateEpic] = useMutation(UpdateEpicMutation);
  const [, deleteEpic] = useMutation(DeleteEpicMutation);

  const epics = listResult.data?.epics ?? [];

  const onCreate = useCallback(async () => {
    clearShellMessages();
    const key = externalKey.trim();
    const t = title.trim();
    let invalid = false;
    if (!trimmedNonEmpty(key)) {
      setKeyError(REQUIRED_MSG);
      invalid = true;
    } else {
      setKeyError(null);
    }
    if (!trimmedNonEmpty(t)) {
      setTitleError(REQUIRED_MSG);
      invalid = true;
    } else {
      setTitleError(null);
    }
    if (invalid) {
      return;
    }
    const res = await createEpic({
      input: {
        projectId,
        externalKey: key,
        title: t,
        description: description.trim() === "" ? undefined : description.trim()
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.createEpic?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setExternalKey("");
    setTitle("");
    setDescription("");
    reexecuteList({ requestPolicy: "network-only" });
    onChanged?.();
  }, [
    clearShellMessages,
    createEpic,
    description,
    externalKey,
    onChanged,
    projectId,
    reexecuteList,
    setPayloadAppError,
    setTransportMessage,
    title
  ]);

  const onRename = useCallback(
    async (id: string, nextTitle: string) => {
      const t = nextTitle.trim();
      if (!trimmedNonEmpty(t)) {
        return;
      }
      clearShellMessages();
      const res = await updateEpic({ input: { id, title: t } });
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        return;
      }
      const appErr = res.data?.updateEpic?.error;
      if (appErr) {
        setPayloadAppError(appErr);
        return;
      }
      reexecuteList({ requestPolicy: "network-only" });
      onChanged?.();
    },
    [clearShellMessages, onChanged, reexecuteList, setPayloadAppError, setTransportMessage, updateEpic]
  );

  const onDelete = useCallback(
    async (id: string, label: string) => {
      if (!window.confirm(`Delete epic ${label}? Linked requirements and test cases will be unassigned.`)) {
        return;
      }
      clearShellMessages();
      const res = await deleteEpic({ input: { id } });
      if (res.error) {
        setTransportMessage(formatGraphQlTransportError(res.error));
        return;
      }
      reexecuteList({ requestPolicy: "network-only" });
      onChanged?.();
    },
    [clearShellMessages, deleteEpic, onChanged, reexecuteList, setTransportMessage]
  );

  return (
    <div className="projects-create epics-manage-panel" data-testid="epics-manage-panel">
      <div className="detail-panel-header">
        <h3 className="projects-subheading" style={{ margin: 0 }}>
          Manage epics
        </h3>
        {onClose ? (
          <button type="button" className="detail-panel-close" onClick={onClose} data-testid="epics-manage-close">
            Close
          </button>
        ) : null}
      </div>

      <p className="projects-empty" style={{ marginTop: 0 }}>
        Epics group requirements and test cases. Keys must be unique per project.
      </p>

      {listResult.fetching && epics.length === 0 ? <PageLoading dataTestId="epics-list-loading" /> : null}

      {epics.length > 0 ? (
        <table className="projects-table projects-table--dense epics-manage-table">
          <thead>
            <tr>
              <th scope="col">Key</th>
              <th scope="col">Title</th>
              <th scope="col" className="epics-manage-table-count">
                Req
              </th>
              <th scope="col" className="epics-manage-table-count">
                TC
              </th>
              <th scope="col" className="epics-manage-table-actions" />
            </tr>
          </thead>
          <tbody>
            {epics.map((epic) => (
              <tr key={epic.id} data-testid="epic-row" data-epic-key={epic.externalKey}>
                <td>
                  <code>{epic.externalKey}</code>
                </td>
                <td>
                  <input
                    type="text"
                    className="epic-inline-title"
                    defaultValue={epic.title}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== epic.title) {
                        void onRename(epic.id, e.target.value);
                      }
                    }}
                    data-testid={`epic-edit-title-${epic.externalKey}`}
                  />
                </td>
                <td className="epics-manage-table-count">
                  <EpicCountLink
                    projectId={projectId}
                    section="requirements"
                    epicId={epic.id}
                    epicKey={epic.externalKey}
                    count={epic.requirementCount ?? 0}
                    testId={`epic-req-count-${epic.externalKey}`}
                  />
                </td>
                <td className="epics-manage-table-count">
                  <EpicCountLink
                    projectId={projectId}
                    section="test-cases"
                    epicId={epic.id}
                    epicKey={epic.externalKey}
                    count={epic.testCaseCount ?? 0}
                    testId={`epic-tc-count-${epic.externalKey}`}
                  />
                </td>
                <td className="epics-manage-table-actions">
                  <button
                    type="button"
                    className="projects-icon-button"
                    onClick={() => void onDelete(epic.id, epic.externalKey)}
                    data-testid={`epic-delete-${epic.externalKey}`}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : !listResult.fetching ? (
        <p className="projects-empty">No epics yet.</p>
      ) : null}

      <h4 className="projects-subheading">New epic</h4>
      <div className="detail-edit-fields">
        <label>
          Key <span className="required-star" aria-hidden="true">*</span>
          <input
            type="text"
            value={externalKey}
            onChange={(e) => {
              setExternalKey(e.target.value);
              setKeyError(null);
            }}
            placeholder="EPIC-AREA"
            data-testid="epic-create-key"
          />
          {keyError !== null ? <p className="field-error">{keyError}</p> : null}
        </label>
        <label>
          Title <span className="required-star" aria-hidden="true">*</span>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setTitleError(null);
            }}
            data-testid="epic-create-title"
          />
          {titleError !== null ? <p className="field-error">{titleError}</p> : null}
        </label>
        <label>
          Description
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            data-testid="epic-create-description"
          />
        </label>
      </div>
      <div className="form-edit-actions">
        <button type="button" onClick={() => void onCreate()} data-testid="epic-create-submit">
          Create epic
        </button>
      </div>
    </div>
  );
}

type EpicCountLinkProps = {
  projectId: string;
  section: "requirements" | "test-cases";
  epicId: string;
  epicKey: string;
  count: number;
  testId: string;
};

function EpicCountLink({ projectId, section, epicId, epicKey, count, testId }: EpicCountLinkProps) {
  const label = section === "requirements" ? "requirements" : "test cases";
  if (count === 0) {
    return (
      <span className="epic-count-zero" data-testid={testId} aria-label={`No ${label} in ${epicKey}`}>
        0
      </span>
    );
  }
  return (
    <RouterLink
      to={buildEpicFilterPath(projectId, section, epicId)}
      className="epic-count-link"
      data-testid={testId}
      title={`Show ${count} ${label} in ${epicKey}`}
    >
      {count}
    </RouterLink>
  );
}
