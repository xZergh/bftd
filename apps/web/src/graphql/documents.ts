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

export const TestCasesListQuery = parse(`
  query TestCasesList($projectId: ID!, $type: String, $includeDeleted: Boolean) {
    testCases(input: { projectId: $projectId, type: $type, includeDeleted: $includeDeleted }) {
      id
      type
      title
      externalId
      isDeleted
      deletedAt
      createdAt
      updatedAt
    }
  }
`);

export const TestCaseByIdQuery = parse(`
  query TestCaseById($id: ID!, $projectId: ID, $includeDeleted: Boolean) {
    testCase(input: { id: $id, projectId: $projectId, includeDeleted: $includeDeleted }) {
      id
      projectId
      type
      title
      externalId
      isDeleted
      deletedAt
      createdAt
      updatedAt
      steps {
        id
        stepOrder
        name
        expectedResult
      }
    }
  }
`);

export const TraceabilityGraphQuery = parse(`
  query TraceabilityGraph($projectId: ID!) {
    traceabilityGraph(input: { projectId: $projectId }) {
      projectId
      nodes {
        id
        kind
        title
      }
      edges {
        id
        kind
        sourceId
        targetId
      }
    }
  }
`);

export const CreateManualTestCaseMutation = parse(`
  mutation CreateManualTestCase($input: CreateManualTestCaseInput!) {
    createManualTestCase(input: $input) {
      testCase {
        id
        type
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

export const CreateAutomatedTestCaseMutation = parse(`
  mutation CreateAutomatedTestCase($input: CreateAutomatedTestCaseInput!) {
    createAutomatedTestCase(input: $input) {
      testCase {
        id
        type
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

export const UpdateManualTestCaseMutation = parse(`
  mutation UpdateManualTestCase($input: UpdateManualTestCaseInput!) {
    updateManualTestCase(input: $input) {
      testCase {
        id
        title
        steps {
          id
          stepOrder
          name
          expectedResult
        }
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

export const UpdateAutomatedTestCaseMutation = parse(`
  mutation UpdateAutomatedTestCase($input: UpdateAutomatedTestCaseInput!) {
    updateAutomatedTestCase(input: $input) {
      testCase {
        id
        title
        externalId
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

export const LinkRequirementManualMutation = parse(`
  mutation LinkRequirementManual($input: LinkRequirementManualInput!) {
    linkRequirementManualTestCase(input: $input) {
      linked
    }
  }
`);

export const UnlinkRequirementManualMutation = parse(`
  mutation UnlinkRequirementManual($input: UnlinkRequirementManualInput!) {
    unlinkRequirementManualTestCase(input: $input) {
      success
    }
  }
`);

export const LinkAutomatedManualMutation = parse(`
  mutation LinkAutomatedManual($input: LinkAutomatedManualInput!) {
    linkAutomatedManualTestCase(input: $input) {
      linked
    }
  }
`);

export const UnlinkAutomatedManualMutation = parse(`
  mutation UnlinkAutomatedManual($input: UnlinkAutomatedManualInput!) {
    unlinkAutomatedManualTestCase(input: $input) {
      success
    }
  }
`);

export const TombstoneTestCaseMutation = parse(`
  mutation TombstoneTestCase($testCaseId: ID!) {
    tombstoneTestCase(input: { testCaseId: $testCaseId }) {
      success
    }
  }
`);

export const RestoreTestCaseMutation = parse(`
  mutation RestoreTestCase($testCaseId: ID!) {
    restoreTestCase(input: { testCaseId: $testCaseId }) {
      success
    }
  }
`);
