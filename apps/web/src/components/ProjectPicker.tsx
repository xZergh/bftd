import { useNavigate, useParams } from "react-router-dom";
import { Label, YStack } from "tamagui";
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
    <YStack gap="$1" minWidth={180} maxWidth={280}>
      <Label htmlFor="project-picker-select" size="$2" color="$color11" fontWeight="600">
        Project
      </Label>
      <select
        id="project-picker-select"
        data-testid="project-picker"
        aria-label="Select project"
        disabled={fetching && !data}
        value={value}
        style={{
          width: "100%",
          padding: "0.35rem 0.5rem",
          fontSize: "0.9rem",
          borderRadius: 6,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: "#d4d4d8"
        }}
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
    </YStack>
  );
}
