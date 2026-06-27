import { RouterLink } from "../../tamagui/RouterLink";
import type { RequirementListItem } from "../../graphql/types";

type Props = {
  row: RequirementListItem;
  projectId: string;
  selected: boolean;
  onSelect: () => void;
};

export function RequirementTableRow({ row, projectId, selected, onSelect }: Props) {
  return (
    <tr
      className={selected ? "projects-table-row--selected" : undefined}
      data-requirement-key={row.externalKey}
      data-testid="requirement-row"
      onClick={onSelect}
    >
      <td onClick={(e) => e.stopPropagation()}>
        <code>{row.externalKey}</code>
      </td>
      <td>
        <div className="clamp-4">{row.title}</div>
      </td>
      <td>{row.epic ? <code>{row.epic.externalKey}</code> : "—"}</td>
      <td>{row.status ?? "—"}</td>
      <td>{row.priority ?? "—"}</td>
      <td>{row.requirementType ?? "—"}</td>
      <td>{row.releaseLabel ?? "—"}</td>
      <td>{row.sprintLabel ?? "—"}</td>
      <td>{row.tags.length > 0 ? row.tags.join(", ") : "—"}</td>
      <td>{row.linkedManualTestCaseCount}</td>
      <td onClick={(e) => e.stopPropagation()}>
        <RouterLink to={`/projects/${projectId}/requirements/${row.id}`} data-testid="requirement-open">
          Open
        </RouterLink>
      </td>
    </tr>
  );
}
