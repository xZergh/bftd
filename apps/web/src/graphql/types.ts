/** Shapes aligned with `contracts/graphql-schema.snapshot.graphql` (MVP). */

export type ProjectListItem = {
  id: string;
  key: string;
  name: string;
  isArchived: boolean;
};

export type RequirementListItem = {
  id: string;
  externalKey: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type TestCaseListItem = {
  id: string;
  type: string;
  title: string;
  externalId: string | null;
  isDeleted: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TestRunListItem = {
  id: string;
  projectId: string;
  name: string;
  releaseLabel: string | null;
  sprintLabel: string | null;
  environment: string | null;
  buildVersion: string | null;
  trigger: string | null;
  createdAt: string;
  finishedAt: string | null;
};
