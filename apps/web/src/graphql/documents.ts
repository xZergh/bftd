import { parse } from "graphql";

export const ProjectsQuery = parse(`
  query Projects {
    projects {
      id
      key
      name
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
