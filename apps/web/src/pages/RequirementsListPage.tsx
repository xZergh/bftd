import { useCallback, useEffect, useLayoutEffect, useMemo, useState, startTransition } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "urql";
import { PageLoading } from "../components/PageLoading";
import { ProjectWorkspaceHeader } from "../components/ProjectWorkspaceHeader";
import { RequirementDetailPanel } from "../components/requirements/RequirementDetailPanel";
import { RequirementsColumnSettings } from "../components/requirements/RequirementsColumnSettings";
import { RequirementTableRow } from "../components/requirements/RequirementTableRow";
import {
  REQUIREMENT_HIERARCHY_COLUMN,
  REQUIREMENT_HIDEABLE_COLUMNS,
  requirementTableColumnCount
} from "../components/requirements/requirementsColumnConfig";
import {
  buildParentSelectOptions,
  buildRequirementTree,
  flattenRequirementTree,
  requirementParentKeyById
} from "../components/requirements/requirementsHierarchy";
import {
  SortableTh,
  useRequirementSortAccessors
} from "../components/requirements/requirementsTableHelpers";
import { SplitWorkspace } from "../components/workspace/SplitWorkspace";
import { ValidationErrorPayloadPreview } from "../components/ValidationErrorPayloadPreview";
import { demoPlaceholders, parseCommaTags } from "../constants/demoPlaceholders";
import {
  CreateRequirementMutation,
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
import { useRequirementColumnVisibility } from "../hooks/useRequirementColumnVisibility";
import { useRequirementTreeCollapse } from "../hooks/useRequirementTreeCollapse";
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
  const [createParentId, setCreateParentId] = useState("");
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

  const [, createRequirement] = useMutation(CreateRequirementMutation);

  const enumSettings = settingsResult.data?.projectSettings ?? defaultEnumSettings;
  const rows: RequirementListItem[] = listResult.data?.requirements ?? [];
  const sortAccessors = useRequirementSortAccessors(rows);
  const { visibility: columnVisibility, toggleColumn } = useRequirementColumnVisibility();
  const { collapsedIds, toggleCollapsed } = useRequirementTreeCollapse(projectId ?? "");
  const { sorted, sortKey, sortDir, toggleSort } = useColumnSort(rows, sortAccessors);
  const tableColSpan = requirementTableColumnCount(columnVisibility);
  const parentKeyById = useMemo(() => requirementParentKeyById(rows), [rows]);
  const parentSelectOptions = useMemo(() => buildParentSelectOptions(rows), [rows]);
  const inspectorParentOptions = useMemo(
    () => (selectedReqId ? buildParentSelectOptions(rows, selectedReqId) : []),
    [rows, selectedReqId]
  );

  const displayRows = useMemo(() => {
    if (sortKey !== null) {
      return sorted.map((row) => ({
        row,
        depth: 0,
        hasChildren: rows.some((r) => r.parentRequirementId === row.id),
        isCollapsed: false
      }));
    }
    const tree = buildRequirementTree(rows);
    return flattenRequirementTree(tree, collapsedIds);
  }, [collapsedIds, rows, sortKey, sorted]);

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
          tags: parseCommaTags(createTags),
          parentRequirementId: createParentId || null
        }
      }
    };
  }, [
    createParentId,
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
        parentRequirementId: createParentId || undefined
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
    setCreateParentId("");
    clearCreateRequirementDraft(projectId!);
    reexecuteList({ requestPolicy: "network-only" });
  }, [
    cancelDraftWrite,
    clearShellMessages,
    createParentId,
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
          <th scope="col" className="requirements-hierarchy-head">
            {REQUIREMENT_HIERARCHY_COLUMN.label}
          </th>
          {REQUIREMENT_HIDEABLE_COLUMNS.map((col) =>
            columnVisibility[col.id] ? (
              <SortableTh
                key={col.id}
                label={col.label}
                sortKey={col.sortKey}
                activeSortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
              />
            ) : null
          )}
          <th scope="col" className="requirements-table-actions-head">
            <RequirementsColumnSettings visibility={columnVisibility} onToggle={toggleColumn} />
          </th>
        </tr>
      </thead>
      <tbody>
        <tr className="projects-table-create-row" data-testid="requirement-create-row">
          <td data-column="hierarchy">
            <select
              value={createParentId}
              onChange={(e) => setCreateParentId(e.target.value)}
              className="projects-table-inline-input requirements-create-parent"
              data-testid="requirement-create-parent"
              aria-label="Parent requirement"
            >
              <option value="">No parent (root)</option>
              {parentSelectOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {"\u00a0".repeat(opt.depth * 2)}
                  {opt.label}
                </option>
              ))}
            </select>
          </td>
          {columnVisibility.parent ? <td data-column="parent" /> : null}
          {columnVisibility.externalKey ? (
            <td data-column="externalKey">
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
                className="projects-table-inline-input"
                aria-label="External key"
              />
              {externalKeyError !== null && (
                <p className="field-error" role="alert" data-testid="requirement-create-key-error">
                  {externalKeyError}
                </p>
              )}
            </td>
          ) : null}
          {columnVisibility.title ? (
            <td data-column="title">
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
                className="projects-table-inline-input"
                aria-label="Title"
              />
              {titleError !== null && (
                <p className="field-error" role="alert" data-testid="requirement-create-title-error">
                  {titleError}
                </p>
              )}
            </td>
          ) : null}
          {columnVisibility.status ? (
            <td data-column="status">
              <select
                value={createStatus}
                onChange={(e) => setCreateStatus(e.target.value)}
                className="projects-table-inline-input"
                data-testid="requirement-create-status"
                aria-label="Status"
              >
                {enumSettings.requirementStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </td>
          ) : null}
          {columnVisibility.priority ? (
            <td data-column="priority">
              <select
                value={createPriority}
                onChange={(e) => setCreatePriority(e.target.value)}
                className="projects-table-inline-input"
                data-testid="requirement-create-priority"
                aria-label="Priority"
              >
                {enumSettings.requirementPriorities.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </td>
          ) : null}
          {columnVisibility.requirementType ? (
            <td data-column="requirementType">
              <select
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                className="projects-table-inline-input"
                data-testid="requirement-create-type"
                aria-label="Type"
              >
                {enumSettings.requirementTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </td>
          ) : null}
          {columnVisibility.releaseLabel ? (
            <td data-column="releaseLabel">
              <input
                type="text"
                value={createRelease}
                onChange={(e) => setCreateRelease(e.target.value)}
                placeholder={demoPlaceholders.requirement.releaseLabel}
                className="projects-table-inline-input"
                data-testid="requirement-create-release"
                aria-label="Release"
              />
            </td>
          ) : null}
          {columnVisibility.sprintLabel ? (
            <td data-column="sprintLabel">
              <input
                type="text"
                value={createSprint}
                onChange={(e) => setCreateSprint(e.target.value)}
                placeholder={demoPlaceholders.requirement.sprintLabel}
                className="projects-table-inline-input"
                data-testid="requirement-create-sprint"
                aria-label="Sprint"
              />
            </td>
          ) : null}
          {columnVisibility.tags ? (
            <td data-column="tags">
              <input
                type="text"
                value={createTags}
                onChange={(e) => setCreateTags(e.target.value)}
                placeholder={demoPlaceholders.requirement.tags}
                className="projects-table-inline-input"
                data-testid="requirement-create-tags"
                aria-label="Tags"
              />
            </td>
          ) : null}
          {columnVisibility.linkedManualTestCaseCount ? <td data-column="linkedManualTestCaseCount" /> : null}
          <td data-column="actions">
            <button type="button" onClick={() => void onCreate()} data-testid="requirement-create-submit">
              Create
            </button>
          </td>
        </tr>
        {showValidationPayload ? (
          <tr className="projects-table-create-meta-row">
            <td colSpan={tableColSpan}>
              <ValidationErrorPayloadPreview open={showValidationPayload} payload={createRequirementClientPayload} />
            </td>
          </tr>
        ) : null}
        {listResult.fetching && rows.length === 0 ? (
          <tr data-testid="requirements-list-loading">
            <td colSpan={tableColSpan}>
              <PageLoading />
            </td>
          </tr>
        ) : null}
        {!listResult.fetching && rows.length === 0 ? (
          <tr data-testid="requirements-list-empty">
            <td colSpan={tableColSpan}>
              <p className="projects-empty">No requirements yet.</p>
            </td>
          </tr>
        ) : null}
        {displayRows.map((item) => (
          <RequirementTableRow
            key={item.row.id}
            row={item.row}
            projectId={projectId}
            selected={selectedReqId === item.row.id}
            enumSettings={enumSettings}
            columnVisibility={columnVisibility}
            hierarchy={item}
            parentExternalKey={parentKeyById.get(item.row.id) ?? null}
            onToggleCollapse={
              item.hasChildren ? () => toggleCollapsed(item.row.id) : undefined
            }
            onSelect={() => selectRow(item.row.id)}
            onSaved={() => reexecuteList({ requestPolicy: "network-only" })}
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
              parentOptions={inspectorParentOptions}
              onClose={closeInspector}
              onDeleted={() => {
                closeInspector();
                reexecuteList({ requestPolicy: "network-only" });
              }}
            />
          ) : null
        }
      />
    </section>
  );
}
