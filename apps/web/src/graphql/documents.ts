import { parse } from "graphql";

export const ProjectsQuery = parse(`
  query Projects {
    projects {
      id
      key
      name
      isArchived
    }
  }
`);

export const ProjectsListQuery = parse(`
  query ProjectsList($includeArchived: Boolean) {
    projects(input: { includeArchived: $includeArchived }) {
      id
      key
      name
      isArchived
    }
  }
`);

export const ProjectByIdQuery = parse(`
  query ProjectById($id: ID!) {
    project(input: { id: $id }) {
      id
      key
      name
      isArchived
      createdAt
      updatedAt
    }
  }
`);

export const UpdateProjectMutation = parse(`
  mutation UpdateProject($id: ID!, $name: String, $keyNew: String) {
    updateProject(input: { id: $id, name: $name, keyNew: $keyNew }) {
      project {
        id
        key
        name
        isArchived
      }
      error {
        code
        message
        fixHint
        context
      }
    }
  }
`);

export const ArchiveProjectMutation = parse(`
  mutation ArchiveProject($id: ID!, $archived: Boolean!) {
    archiveProject(input: { id: $id, archived: $archived }) {
      project {
        id
        key
        name
        isArchived
      }
      error {
        code
        message
        fixHint
        context
      }
    }
  }
`);

export const IntentionallyInvalidQuery = parse(`
  query IntentionallyInvalid {
    thisFieldDoesNotExistOnQuery
  }
`);

export const CreateProjectMutation = parse(`
  mutation CreateProject($name: String!, $key: String) {
    createProject(input: { name: $name, key: $key }) {
      project {
        id
        key
        name
        isArchived
      }
      error {
        code
        message
        fixHint
        context
      }
    }
  }
`);

export const RequirementsListQuery = parse(`
  query RequirementsList($projectId: ID!) {
    requirements(input: { projectId: $projectId }) {
      id
      externalKey
      title
      description
      status
      priority
      tags
      createdAt
      updatedAt
    }
  }
`);

export const RequirementByIdQuery = parse(`
  query RequirementById($id: ID!, $projectId: ID) {
    requirement(input: { id: $id, projectId: $projectId }) {
      id
      projectId
      externalKey
      title
      description
      releaseLabel
      sprintLabel
      requirementType
      status
      priority
      tags
      parentRequirementId
      createdAt
      updatedAt
    }
  }
`);

export const CreateRequirementMutation = parse(`
  mutation CreateRequirement($input: CreateRequirementInput!) {
    createRequirement(input: $input) {
      requirement {
        id
        externalKey
        title
      }
      error {
        code
        message
        fixHint
        context
      }
    }
  }
`);

export const UpdateRequirementMutation = parse(`
  mutation UpdateRequirement($input: UpdateRequirementInput!) {
    updateRequirement(input: $input) {
      requirement {
        id
        title
        description
      }
      error {
        code
        message
        fixHint
        context
      }
    }
  }
`);

export const DeleteRequirementMutation = parse(`
  mutation DeleteRequirement($id: ID!) {
    deleteRequirement(input: { id: $id }) {
      success
    }
  }
`);
