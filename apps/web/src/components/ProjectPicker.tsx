import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Label, XStack } from "tamagui";
import { useQuery } from "urql";
import { ProjectsListQuery } from "../graphql/documents";
import type { ProjectListItem } from "../graphql/types";

/** Loads the full project list; project detail is fetched on each page route (shell does not duplicate ProjectById). */
export function ProjectPicker() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [{ data, fetching }] = useQuery({
    query: ProjectsListQuery,
    variables: { includeArchived: true }
  });

  const value = projectId ?? "";
  const projects = data?.projects ?? [];
  const selected = useMemo(() => projects.find((p) => p.id === value), [projects, value]);
  const selectTitle =
    selected !== undefined
      ? `${selected.name} (${selected.key})${selected.isArchived ? " · archived" : ""}`
      : value === ""
        ? "All projects"
        : undefined;

  return (
    <XStack
      gap="$2"
      alignItems="center"
      flex={1}
      flexBasis={0}
      minWidth={0}
      justifyContent="flex-end"
      flexWrap="wrap"
      style={{ minWidth: "min(100%, 18rem)" }}
    >
      <Label
        htmlFor="project-picker-select"
        size="$1"
        color="$color10"
        fontWeight="500"
        letterSpacing={0.02}
        textTransform="uppercase"
        flexShrink={0}
        className="project-picker-label"
      >
        Open
      </Label>
      <div className="project-picker-select-wrap">
        <select
          id="project-picker-select"
          data-testid="project-picker"
          aria-label="Choose project or all projects list"
          title={selectTitle}
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
          {projects.map((p: ProjectListItem) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.key})
              {p.isArchived ? " · archived" : ""}
            </option>
          ))}
        </select>
      </div>
    </XStack>
  );
}
