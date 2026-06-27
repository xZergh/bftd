import { useCallback, useEffect, useLayoutEffect, useMemo, useState, startTransition } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { EpicsManagePanel } from "../components/epics/EpicsManagePanel";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { RequirementDetailPanel } from "../components/requirements/RequirementDetailPanel";
import { RequirementTableRow } from "../components/requirements/RequirementTableRow";
import {
  SortableTh,
  useRequirementSortAccessors
} from "../components/requirements/requirementsTableHelpers";
import { SplitWorkspace } from "../components/workspace/SplitWorkspace";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { demoPlaceholders, parseCommaTags } from "../constants/demoPlaceholders";
import {
  CreateRequirementMutation,
  EpicsListQuery,
  ProjectSettingsQuery,
  RequirementsListQuery
} from "../graphql/documents";
import { formatGraphQlTransportError } from "../graphql/formatGraphQlError";
import {
  clearCreateRequirementDraft,
  LOCAL_CREATE_DRAFT_DEBOUNCE_MS,
  readCreateRequirementDraft,
  writeCreateRequirementDraft
} from "../forms/localCreateDraftStorage";
import { REQUIRED_MSG, trimmedNonEmpty } from "../forms/mandatoryFields";
import type { ProjectEnumSettings, RequirementListItem } from "../graphql/types";
import { useColumnSort } from "../hooks/useColumnSort";
import { useDebouncedAutosaveEffect } from "../hooks/useDebouncedAutosaveEffect";
import { useEpicFilter } from "../hooks/useEpicFilter";
import { useShellErrors } from "../shell/ShellErrorsContext";
import "./ProjectsPage.css";

const defaultEnumSettings: ProjectEnumSettings = {
  requirementStatuses: ["draft", "in_progress", "approved"],
  requirementPriorities: ["low", "medium", "high"],
  requirementTypes: ["functional", "nonfunctional"]
};

export function RequirementsListPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedReqId = searchParams.get("req");
  const creatingReq = searchParams.get("new") === "1";
  const managingEpics = searchParams.get("epics") === "1";
  const { epicFilterId, setEpicFilter } = useEpicFilter(projectId ?? "");
  const { clearShellMessages, setTransportMessage, setPayloadAppError } = useShellErrors();

  const [draftHydrated, setDraftHydrated] = useState(false);
  const [externalKey, setExternalKey] = useState("");
  const [title, setTitle] = useState("");
  const [createStatus, setCreateStatus] = useState(demoPlaceholders.requirement.status);
  const [createPriority, setCreatePriority] = useState(demoPlaceholders.requirement.priority);
  const [createType, setCreateType] = useState(demoPlaceholders.requirement.requirementType);
  const [createRelease, setCreateRelease] = useState("");
  const [createSprint, setCreateSprint] = useState("");
  const [createTags, setCreateTags] = useState("");
  const [createEpicId, setCreateEpicId] = useState("");
  const [externalKeyError, setExternalKeyError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [showValidationPayload, setShowValidationPayload] = useState(false);

  const paused = projectId === undefined || projectId === "";

  const [listResult, reexecuteList] = useQuery({
    query: RequirementsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "network-only"
  });

  const [settingsResult] = useQuery({
    query: ProjectSettingsQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused
  });

  const [epicsResult, reexecuteEpics] = useQuery({
    query: EpicsListQuery,
    variables: { projectId: projectId ?? "" },
    pause: paused,
    requestPolicy: "cache-and-network"
  });

  const [, createRequirement] = useMutation(CreateRequirementMutation);

  const enumSettings = settingsResult.data?.projectSettings ?? defaultEnumSettings;
  const epics = epicsResult.data?.epics ?? [];
  const sortAccessors = useRequirementSortAccessors();
  // Non-default: this column sorts as numeric and treats null as 0.
  const sortOptions = useMemo(() => ({ linkedManualTestCaseCount: { type: "number" as const, nullValue: 0 } }), []);
  const rows: RequirementListItem[] = listResult.data?.requirements ?? [];
  const filteredRows = useMemo(() => {
    if (epicFilterId === "") {
      return rows;
    }
    return rows.filter((r) => r.epicId === epicFilterId);
  }, [epicFilterId, rows]);
  const { sorted, sortKey, sortDir, toggleSort } = useColumnSort(filteredRows, sortAccessors, sortOptions);

  useLayoutEffect(() => {
    if (paused) {
      return;
    }
    startTransition(() => {
      setDraftHydrated(false);
      const d = readCreateRequirementDraft(projectId!);
      setExternalKey(d?.externalKey ?? "");
      setTitle(d?.title ?? "");
      setDraftHydrated(true);
    });
  }, [paused, projectId]);

  const cancelDraftWrite = useDebouncedAutosaveEffect(
    draftHydrated && !paused && (externalKey !== "" || title !== ""),
    `${projectId ?? ""}\0${externalKey}\0${title}`,
    () => {
      if (projectId === undefined) {
        return;
      }
      writeCreateRequirementDraft(projectId, externalKey, title);
    },
    LOCAL_CREATE_DRAFT_DEBOUNCE_MS
  );

  useEffect(() => {
    if (!draftHydrated || paused || (externalKey === "" && title === "")) {
      return;
    }
  }, [draftHydrated, externalKey, paused, projectId, title]);

  useEffect(() => {
    if (!draftHydrated || paused) {
      return;
    }
    if (externalKey !== "" || title !== "") {
      return;
    }
    clearCreateRequirementDraft(projectId!);
  }, [draftHydrated, externalKey, paused, projectId, title]);

  useEffect(() => {
    if (!listResult.error) {
      return;
    }
    setTransportMessage(formatGraphQlTransportError(listResult.error));
  }, [listResult.error, setTransportMessage]);

  const createRequirementClientPayload = useMemo(() => {
    const key = externalKey.trim();
    const t = title.trim();
    return {
      mutation: "CreateRequirement",
      variables: {
        input: {
          projectId: projectId ?? null,
          externalKey: key.length > 0 ? key : null,
          title: t.length > 0 ? t : null,
          status: createStatus,
          priority: createPriority,
          requirementType: createType,
          releaseLabel: createRelease.trim() || null,
          sprintLabel: createSprint.trim() || null,
          tags: parseCommaTags(createTags)
        }
      }
    };
  }, [
    createPriority,
    createRelease,
    createSprint,
    createStatus,
    createTags,
    createType,
    externalKey,
    projectId,
    title
  ]);

  const onCreate = useCallback(async () => {
    if (paused) {
      return;
    }
    cancelDraftWrite();
    clearShellMessages();
    const key = externalKey.trim();
    const t = title.trim();
    let invalid = false;
    if (!trimmedNonEmpty(key)) {
      setExternalKeyError(REQUIRED_MSG);
      invalid = true;
    } else {
      setExternalKeyError(null);
    }
    if (!trimmedNonEmpty(t)) {
      setTitleError(REQUIRED_MSG);
      invalid = true;
    } else {
      setTitleError(null);
    }
    if (invalid) {
      setShowValidationPayload(true);
      return;
    }
    setShowValidationPayload(false);
    const res = await createRequirement({
      input: {
        projectId: projectId!,
        externalKey: key,
        title: t,
        status: createStatus,
        priority: createPriority,
        requirementType: createType,
        releaseLabel: createRelease.trim() || undefined,
        sprintLabel: createSprint.trim() || undefined,
        tags: parseCommaTags(createTags),
        epicId: createEpicId === "" ? undefined : createEpicId
      }
    });
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      return;
    }
    const appErr = res.data?.createRequirement?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      return;
    }
    setExternalKey("");
    setTitle("");
    setCreateRelease("");
    setCreateSprint("");
    setCreateTags("");
    setCreateEpicId("");
    clearCreateRequirementDraft(projectId!);
    reexecuteList({ requestPolicy: "network-only" });
  }, [
    cancelDraftWrite,
    clearShellMessages,
    createEpicId,
    createPriority,
    createRelease,
    createRequirement,
    createSprint,
    createStatus,
    createTags,
    createType,
    externalKey,
    paused,
    projectId,
    reexecuteList,
    setPayloadAppError,
    setTransportMessage,
    title
  ]);

  const selectRow = useCallback(
    (id: string) => {
      setSearchParams(
        (prev) => {
          const n = new URLSearchParams(prev);
          n.set("req", id);
          n.delete("new");
          n.delete("epics");
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
        n.delete("req");
        n.delete("new");
        n.delete("epics");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const openCreatePanel = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("req");
        n.set("new", "1");
        n.delete("epics");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  const openEpicsPanel = useCallback(() => {
    setSearchParams(
      (prev) => {
        const n = new URLSearchParams(prev);
        n.delete("req");
        n.delete("new");
        n.set("epics", "1");
        return n;
      },
      { replace: true }
    );
  }, [setSearchParams]);

  if (paused) {
    return null;
  }

  const table = (
    <table className="projects-table projects-table--dense">
      <thead>
        <tr>
          <SortableTh label="Key" sortKey="externalKey" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Title" sortKey="title" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Epic" sortKey="epic" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Status" sortKey="status" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Priority" sortKey="priority" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Type" sortKey="requirementType" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Release" sortKey="releaseLabel" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Sprint" sortKey="sprintLabel" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh label="Tags" sortKey="tags" activeSortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
          <SortableTh
            label="Linked TC"
            sortKey="linkedManualTestCaseCount"
            activeSortKey={sortKey}
            sortDir={sortDir}
            onSort={toggleSort}
          />
          <th scope="col"> </th>
        </tr>
      </thead>
      <tbody>
        {listResult.fetching && rows.length === 0 ? (
          <tr data-testid="requirements-list-loading">
            <td colSpan={11}>
              <PageLoading />
            </td>
          </tr>
        ) : null}
        {!listResult.fetching && filteredRows.length === 0 ? (
          <tr data-testid="requirements-list-empty">
            <td colSpan={11}>
              <p className="projects-empty">
                {rows.length === 0 ? "No requirements yet." : "No requirements match this epic filter."}
              </p>
            </td>
          </tr>
        ) : null}
        {sorted.map((r) => (
          <RequirementTableRow
            key={r.id}
            row={r}
            projectId={projectId}
            selected={selectedReqId === r.id}
            onSelect={() => selectRow(r.id)}
          />
        ))}
      </tbody>
    </table>
  );

  return (
    <section className="projects-page" data-testid="requirements-page">
      <ProjectWorkspaceHeader
        title="Requirements"
        titleId="requirements-heading"
        projectId={projectId}
        active="requirements"
      />
      <div className="projects-list-toolbar">
        <label className="projects-toolbar-filter">
          Epic
          <select
            value={epicFilterId}
            onChange={(e) => setEpicFilter(e.target.value)}
            data-testid="requirement-epic-filter"
          >
            <option value="">All epics</option>
            {epics.map((epic) => (
              <option key={epic.id} value={epic.id}>
                {epic.externalKey}
              </option>
            ))}
          </select>
        </label>
        <div className="projects-list-toolbar-actions">
          <button type="button" onClick={openCreatePanel} data-testid="requirement-open-create-panel">
            Create requirement
          </button>
          <button type="button" onClick={openEpicsPanel} data-testid="requirement-open-epics-panel">
            Manage epics
          </button>
        </div>
      </div>

      <SplitWorkspace
        sectionKey="requirements"
        data-testid="requirements-split"
        main={table}
        inspector={
          selectedReqId ? (
            <RequirementDetailPanel
              projectId={projectId}
              requirementId={selectedReqId}
              variant="inspector"
              onClose={closeInspector}
              onUpdated={() => reexecuteList({ requestPolicy: "network-only" })}
              onDeleted={() => {
                closeInspector();
                reexecuteList({ requestPolicy: "network-only" });
              }}
            />
          ) : managingEpics ? (
            <EpicsManagePanel
              projectId={projectId}
              onClose={closeInspector}
              onChanged={() => {
                reexecuteEpics({ requestPolicy: "network-only" });
                reexecuteList({ requestPolicy: "network-only" });
              }}
            />
          ) : creatingReq ? (
            <div className="projects-create" data-testid="requirement-create-panel">
              <h3 className="projects-subheading">Create requirement</h3>
              <div className="detail-edit-fields">
                <label>
                  Key <span className="required-star" aria-hidden="true">*</span>
                  <input
                    type="text"
                    value={externalKey}
                    onChange={(e) => {
                      setExternalKey(e.target.value);
                      setExternalKeyError(null);
                      setShowValidationPayload(false);
                    }}
                    data-testid="requirement-create-key"
                    placeholder={demoPlaceholders.requirement.externalKey}
                  />
                  {externalKeyError !== null ? <p className="field-error">{externalKeyError}</p> : null}
                </label>
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
                    data-testid="requirement-create-title"
                    placeholder={demoPlaceholders.requirement.title}
                  />
                  {titleError !== null ? <p className="field-error">{titleError}</p> : null}
                </label>
                <label>
                  Epic
                  <select
                    value={createEpicId}
                    onChange={(e) => setCreateEpicId(e.target.value)}
                    data-testid="requirement-create-epic"
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
              <div className="detail-edit-fields">
                <label>
                  Status
                  <select value={createStatus} onChange={(e) => setCreateStatus(e.target.value)} data-testid="requirement-create-status">
                    {enumSettings.requirementStatuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Priority
                  <select value={createPriority} onChange={(e) => setCreatePriority(e.target.value)} data-testid="requirement-create-priority">
                    {enumSettings.requirementPriorities.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Type
                  <select value={createType} onChange={(e) => setCreateType(e.target.value)} data-testid="requirement-create-type">
                    {enumSettings.requirementTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Release
                  <input
                    type="text"
                    value={createRelease}
                    onChange={(e) => setCreateRelease(e.target.value)}
                    placeholder={demoPlaceholders.requirement.releaseLabel}
                    data-testid="requirement-create-release"
                  />
                </label>
                <label>
                  Sprint
                  <input
                    type="text"
                    value={createSprint}
                    onChange={(e) => setCreateSprint(e.target.value)}
                    placeholder={demoPlaceholders.requirement.sprintLabel}
                    data-testid="requirement-create-sprint"
                  />
                </label>
                <label>
                  Tags
                  <input
                    type="text"
                    value={createTags}
                    onChange={(e) => setCreateTags(e.target.value)}
                    placeholder={demoPlaceholders.requirement.tags}
                    data-testid="requirement-create-tags"
                  />
                </label>
              </div>
              <ValidationErrorPayloadPreview open={showValidationPayload} payload={createRequirementClientPayload} />
              <div className="form-edit-actions">
                <button type="button" onClick={() => void onCreate()} data-testid="requirement-create-submit">
                  Create
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
