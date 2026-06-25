import { useCallback, useEffect, useMemo, useState } from "react";
import { RouterLink } from "../../tamagui/RouterLink";
import { useMutation } from "urql";
import { RowSaveIndicator } from "../workspace/RowSaveIndicator";
import { demoPlaceholders, formatCommaTags, parseCommaTags } from "../../constants/demoPlaceholders";
import { UpdateRequirementMutation } from "../../graphql/documents";
import { formatGraphQlTransportError } from "../../graphql/formatGraphQlError";
import type { ProjectEnumSettings, RequirementListItem } from "../../graphql/types";
import { useDebouncedAutosaveEffect } from "../../hooks/useDebouncedAutosaveEffect";
import { useShellErrors } from "../../shell/ShellErrorsContext";
import { RequirementHierarchyCell } from "./RequirementHierarchyCell";
import type { RequirementColumnVisibility } from "./requirementsColumnConfig";
import type { FlatRequirementRow } from "./requirementsHierarchy";

type Props = {
  row: RequirementListItem;
  projectId: string;
  selected: boolean;
  enumSettings: ProjectEnumSettings;
  columnVisibility: RequirementColumnVisibility;
  hierarchy: Pick<FlatRequirementRow, "depth" | "hasChildren" | "isCollapsed">;
  parentExternalKey: string | null;
  onToggleCollapse?: () => void;
  onSelect: () => void;
  onSaved: () => void;
};

type RowDraft = {
  title: string;
  status: string;
  priority: string;
  requirementType: string;
  releaseLabel: string;
  sprintLabel: string;
  tagsText: string;
};

function draftFromRow(row: RequirementListItem): RowDraft {
  return {
    title: row.title,
    status: row.status ?? "draft",
    priority: row.priority ?? "medium",
    requirementType: row.requirementType ?? "functional",
    releaseLabel: row.releaseLabel ?? "",
    sprintLabel: row.sprintLabel ?? "",
    tagsText: formatCommaTags(row.tags)
  };
}

function draftsEqual(a: RowDraft, b: RowDraft) {
  return (
    a.title.trim() === b.title.trim() &&
    a.status === b.status &&
    a.priority === b.priority &&
    a.requirementType === b.requirementType &&
    a.releaseLabel.trim() === b.releaseLabel.trim() &&
    a.sprintLabel.trim() === b.sprintLabel.trim() &&
    parseCommaTags(a.tagsText).join("\0") === parseCommaTags(b.tagsText).join("\0")
  );
}

export function RequirementTableRow({
  row,
  projectId,
  selected,
  enumSettings,
  columnVisibility,
  hierarchy,
  parentExternalKey,
  onToggleCollapse,
  onSelect,
  onSaved
}: Props) {
  const { setTransportMessage, setPayloadAppError } = useShellErrors();
  const [baseline, setBaseline] = useState(() => draftFromRow(row));
  const [draft, setDraft] = useState(() => draftFromRow(row));
  const [savePhase, setSavePhase] = useState<"idle" | "saving">("idle");
  const [failBump, setFailBump] = useState(0);

  const [, updateRequirement] = useMutation(UpdateRequirementMutation);

  useEffect(() => {
    const next = draftFromRow(row);
    setBaseline(next);
    setDraft(next);
  }, [row.id, row.updatedAt]);

  const dirty = !draftsEqual(draft, baseline);

  const performSave = useCallback(async (): Promise<boolean> => {
    setSavePhase("saving");
    const res = await updateRequirement({
      input: {
        id: row.id,
        title: draft.title.trim(),
        status: draft.status,
        priority: draft.priority,
        requirementType: draft.requirementType,
        releaseLabel: draft.releaseLabel.trim() === "" ? null : draft.releaseLabel.trim(),
        sprintLabel: draft.sprintLabel.trim() === "" ? null : draft.sprintLabel.trim(),
        tags: parseCommaTags(draft.tagsText)
      }
    });
    setSavePhase("idle");
    if (res.error) {
      setTransportMessage(formatGraphQlTransportError(res.error));
      setFailBump((n) => n + 1);
      return false;
    }
    const appErr = res.data?.updateRequirement?.error;
    if (appErr) {
      setPayloadAppError(appErr);
      setFailBump((n) => n + 1);
      return false;
    }
    const updated = res.data?.updateRequirement?.requirement;
    if (updated) {
      const next = {
        title: updated.title,
        status: updated.status ?? draft.status,
        priority: updated.priority ?? draft.priority,
        requirementType: updated.requirementType ?? draft.requirementType,
        releaseLabel: updated.releaseLabel ?? "",
        sprintLabel: updated.sprintLabel ?? "",
        tagsText: formatCommaTags(updated.tags)
      };
      setBaseline(next);
      setDraft(next);
    }
    onSaved();
    return true;
  }, [draft, onSaved, row.id, setPayloadAppError, setTransportMessage, updateRequirement]);

  const autosaveKey = `${JSON.stringify(draft)}\0${failBump}`;
  useDebouncedAutosaveEffect(dirty && draft.title.trim().length > 0, autosaveKey, () => {
    void performSave();
  });

  const saveState = savePhase === "saving" ? "saving" : dirty ? "unsaved" : "saved";

  const patch = useMemo(
    () => (partial: Partial<RowDraft>) => setDraft((d) => ({ ...d, ...partial })),
    []
  );

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <tr
      className={selected ? "projects-table-row--selected" : undefined}
      data-requirement-key={row.externalKey}
      data-testid="requirement-row"
      onClick={onSelect}
    >
      <td data-column="hierarchy" onClick={(e) => e.stopPropagation()}>
        <RequirementHierarchyCell
          depth={hierarchy.depth}
          hasChildren={hierarchy.hasChildren}
          isCollapsed={hierarchy.isCollapsed}
          onToggle={onToggleCollapse}
        />
      </td>
      {columnVisibility.parent ? (
        <td data-column="parent">
          {parentExternalKey ? <code>{parentExternalKey}</code> : <span className="projects-empty">—</span>}
        </td>
      ) : null}
      {columnVisibility.externalKey ? (
        <td onClick={stop} data-column="externalKey">
          <code>{row.externalKey}</code>
        </td>
      ) : null}
      {columnVisibility.title ? (
        <td onClick={stop} data-column="title">
          <input
            type="text"
            className="projects-table-inline-input"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
            data-testid={`requirement-row-title-${row.id}`}
            aria-label="Title"
          />
        </td>
      ) : null}
      {columnVisibility.status ? (
        <td onClick={stop} data-column="status">
          <select
            className="projects-table-inline-input"
            value={draft.status}
            onChange={(e) => patch({ status: e.target.value })}
            data-testid={`requirement-row-status-${row.id}`}
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
        <td onClick={stop} data-column="priority">
          <select
            className="projects-table-inline-input"
            value={draft.priority}
            onChange={(e) => patch({ priority: e.target.value })}
            data-testid={`requirement-row-priority-${row.id}`}
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
        <td onClick={stop} data-column="requirementType">
          <select
            className="projects-table-inline-input"
            value={draft.requirementType}
            onChange={(e) => patch({ requirementType: e.target.value })}
            data-testid={`requirement-row-type-${row.id}`}
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
        <td onClick={stop} data-column="releaseLabel">
          <input
            type="text"
            className="projects-table-inline-input"
            value={draft.releaseLabel}
            onChange={(e) => patch({ releaseLabel: e.target.value })}
            placeholder={demoPlaceholders.requirement.releaseLabel}
            data-testid={`requirement-row-release-${row.id}`}
            aria-label="Release"
          />
        </td>
      ) : null}
      {columnVisibility.sprintLabel ? (
        <td onClick={stop} data-column="sprintLabel">
          <input
            type="text"
            className="projects-table-inline-input"
            value={draft.sprintLabel}
            onChange={(e) => patch({ sprintLabel: e.target.value })}
            placeholder={demoPlaceholders.requirement.sprintLabel}
            data-testid={`requirement-row-sprint-${row.id}`}
            aria-label="Sprint"
          />
        </td>
      ) : null}
      {columnVisibility.tags ? (
        <td onClick={stop} data-column="tags">
          <input
            type="text"
            className="projects-table-inline-input"
            value={draft.tagsText}
            onChange={(e) => patch({ tagsText: e.target.value })}
            placeholder={demoPlaceholders.requirement.tags}
            data-testid={`requirement-row-tags-${row.id}`}
            aria-label="Tags"
          />
        </td>
      ) : null}
      {columnVisibility.linkedManualTestCaseCount ? (
        <td data-column="linkedManualTestCaseCount">{row.linkedManualTestCaseCount}</td>
      ) : null}
      <td onClick={stop} data-column="actions">
        <RowSaveIndicator state={saveState} data-testid={`requirement-row-save-${row.id}`} />
        <RouterLink to={`/projects/${projectId}/requirements/${row.id}`} data-testid="requirement-open">
          Open
        </RouterLink>
      </td>
    </tr>
  );
}
