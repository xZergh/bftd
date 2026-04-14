import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "urql";
import { ProjectsListQuery } from "../graphql/documents";
import type { ProjectListItem } from "../graphql/types";

export function ProjectPicker() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [{ data, fetching }] = useQuery({
    query: ProjectsListQuery,
    variables: { includeArchived: true }
  });

  const value = projectId ?? "";

  return (
    <label className="project-picker-label">
      <span className="project-picker-title">Project</span>
      <select
        className="project-picker-select"
        data-testid="project-picker"
        disabled={fetching && !data}
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          if (next === "") {
            navigate("/projects");
          } else {
            navigate(`/projects/${next}`);
          }
        }}
      >
        <option value="">All projects</option>
        {(data?.projects ?? []).map((p: ProjectListItem) => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.key})
            {p.isArchived ? " · archived" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
