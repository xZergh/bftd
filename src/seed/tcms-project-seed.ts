import type { TcmsService } from "../domain/service";
import { slugifyProjectKey } from "../domain/services/projects";
import {
  TCMS_EPIC_SEEDS,
  TCMS_REQUIREMENT_EPIC_BY_EXTERNAL_KEY
} from "./tcms-epic-catalog";
import {
  TCMS_PROJECT_KEY,
  TCMS_PROJECT_NAME,
  TCMS_REQUIREMENT_KEYS,
  type TcmsProjectSeedManifest
} from "./tcms-project-constants";

export type SeedTcmsProjectOptions = {
  /** When true, skip if the TCMS project already exists. */
  skipIfExists?: boolean;
};

type RequirementSeed = {
  key: keyof typeof TCMS_REQUIREMENT_KEYS;
  externalKey: string;
  title: string;
  description: string;
  status: "draft" | "in_progress" | "approved";
  priority: "low" | "medium" | "high";
  requirementType: "functional" | "nonfunctional";
  tags: string[];
  sprintLabel: string;
};

const REQUIREMENT_SEEDS: RequirementSeed[] = [
  {
    key: "R1",
    externalKey: TCMS_REQUIREMENT_KEYS.R1,
    title: "Manage multiple projects with stable keys",
    description:
      "Each app under test is a project with a unique key used by imports, GraphQL, and navigation.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["core", "projects"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R2",
    externalKey: TCMS_REQUIREMENT_KEYS.R2,
    title: "Switch between isolated database profiles",
    description:
      "Operators can connect to separate SQLite profiles (project work vs demo sample) without restarting the stack.",
    status: "approved",
    priority: "medium",
    requirementType: "functional",
    tags: ["core", "data"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R3",
    externalKey: TCMS_REQUIREMENT_KEYS.R3,
    title: "Local-first operation without authentication",
    description: "Single-user MVP runs on SQLite with no sign-in; suitable for local QA workflows.",
    status: "approved",
    priority: "medium",
    requirementType: "nonfunctional",
    tags: ["core", "platform"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R10",
    externalKey: TCMS_REQUIREMENT_KEYS.R10,
    title: "Create and edit requirements with external keys",
    description:
      "Requirements support externalKey, title, description, type, status, priority, tags, and release/sprint labels.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["requirements"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R11",
    externalKey: TCMS_REQUIREMENT_KEYS.R11,
    title: "Requirement hierarchy via parent links",
    description: "Child requirements reference a parent in the same project for tree-style grouping.",
    status: "in_progress",
    priority: "medium",
    requirementType: "functional",
    tags: ["requirements"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R12",
    externalKey: TCMS_REQUIREMENT_KEYS.R12,
    title: "Import requirements from agile JSON",
    description: "Bulk upsert by projectKey + externalKey with parentExternalKey and deterministic validation errors.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["requirements", "imports"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R13",
    externalKey: TCMS_REQUIREMENT_KEYS.R13,
    title: "Link Penpot design nodes to requirements",
    description: "Design links resolve by requirementId or requirementKey; no title-based matching.",
    status: "draft",
    priority: "low",
    requirementType: "functional",
    tags: ["requirements", "design"],
    sprintLabel: "MVP-3"
  },
  {
    key: "R20",
    externalKey: TCMS_REQUIREMENT_KEYS.R20,
    title: "Manual test cases with ordered steps",
    description: "Manual tests store ordered action/expected pairs and display them on detail pages.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["test-cases", "manual"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R21",
    externalKey: TCMS_REQUIREMENT_KEYS.R21,
    title: "Manual tests must link to at least one requirement",
    description: "Creation and updates block manual tests with zero requirement links.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["test-cases", "manual", "traceability"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R22",
    externalKey: TCMS_REQUIREMENT_KEYS.R22,
    title: "Automated tests link to manual tests",
    description: "Automated cases reference one or more manual cases; shared automation across requirements is allowed.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["test-cases", "automated"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R23",
    externalKey: TCMS_REQUIREMENT_KEYS.R23,
    title: "TRR import for Allure-format automated steps",
    description: "Ingest nested Allure steps via internalTestCaseId or project + externalId identity.",
    status: "in_progress",
    priority: "medium",
    requirementType: "functional",
    tags: ["test-cases", "automated", "imports"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R30",
    externalKey: TCMS_REQUIREMENT_KEYS.R30,
    title: "Link and unlink requirement ↔ manual testcase",
    description: "Traceability mutations maintain many-to-many links with deterministic errors on invalid targets.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["traceability"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R31",
    externalKey: TCMS_REQUIREMENT_KEYS.R31,
    title: "Multi-hop traceability graph",
    description: "Reporting shows requirement → manual → automated paths; KPI deduplicates by unique IDs.",
    status: "approved",
    priority: "medium",
    requirementType: "functional",
    tags: ["traceability", "reporting"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R40",
    externalKey: TCMS_REQUIREMENT_KEYS.R40,
    title: "Create test runs and record results",
    description: "Runs capture environment, build, trigger, and per-test pass/fail/skip outcomes.",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["runs"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R41",
    externalKey: TCMS_REQUIREMENT_KEYS.R41,
    title: "Run-level traceability snapshots",
    description: "Historical run reporting reads immutable snapshot edges, not live link tables.",
    status: "approved",
    priority: "medium",
    requirementType: "nonfunctional",
    tags: ["runs", "reporting"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R42",
    externalKey: TCMS_REQUIREMENT_KEYS.R42,
    title: "KPI dashboard with formula-driven coverage",
    description: "Coverage values expose formulaId, numerator, denominator, and normalized percent (0–100).",
    status: "approved",
    priority: "medium",
    requirementType: "functional",
    tags: ["reporting", "kpi"],
    sprintLabel: "MVP-2"
  },
  {
    key: "R50",
    externalKey: TCMS_REQUIREMENT_KEYS.R50,
    title: "Deterministic API errors with fixHint",
    description: "Validation and domain failures return stable error codes and actionable fix hints in GraphQL.",
    status: "approved",
    priority: "high",
    requirementType: "nonfunctional",
    tags: ["api", "quality"],
    sprintLabel: "MVP-1"
  },
  {
    key: "R51",
    externalKey: TCMS_REQUIREMENT_KEYS.R51,
    title: "Test case version history with tombstone support",
    description: "Content and traceability changes append immutable versions; deleted cases remain in history when flagged.",
    status: "in_progress",
    priority: "medium",
    requirementType: "nonfunctional",
    tags: ["versioning", "test-cases"],
    sprintLabel: "MVP-3"
  }
];

export async function seedTcmsProject(
  service: TcmsService,
  options: SeedTcmsProjectOptions = {}
): Promise<TcmsProjectSeedManifest | null> {
  const skipIfExists = options.skipIfExists ?? true;
  const projects = await service.listProjects({ includeArchived: true });
  const tcmsKey = slugifyProjectKey(TCMS_PROJECT_KEY);
  const existing = projects.find((p) => p.key === tcmsKey);
  if (existing) {
    if (skipIfExists) {
      return null;
    }
    throw new Error(`Project key "${TCMS_PROJECT_KEY}" already exists; reset the database before re-seeding.`);
  }

  const project = await service.createProject(
    TCMS_PROJECT_NAME,
    TCMS_PROJECT_KEY,
    "Requirements and test assets for building TCMS itself (dogfooding backlog)."
  );
  const projectId = project.id;

  const epicIds = {} as TcmsProjectSeedManifest["epicIds"];
  for (const epicSeed of TCMS_EPIC_SEEDS) {
    const created = await service.createEpic({
      projectId,
      externalKey: epicSeed.externalKey,
      title: epicSeed.title,
      description: epicSeed.description
    });
    epicIds[epicSeed.key] = created.id;
  }

  const requirementIds = {} as TcmsProjectSeedManifest["requirementIds"];
  for (const seed of REQUIREMENT_SEEDS) {
    const created = await service.createRequirement({
      projectId,
      externalKey: seed.externalKey,
      title: seed.title,
      description: seed.description,
      releaseLabel: "MVP",
      sprintLabel: seed.sprintLabel,
      status: seed.status,
      priority: seed.priority,
      tags: seed.tags,
      requirementType: seed.requirementType,
      epicId: epicIds[TCMS_REQUIREMENT_EPIC_BY_EXTERNAL_KEY[seed.externalKey]]
    });
    requirementIds[seed.key] = created.id;
  }

  return {
    projectId,
    projectKey: TCMS_PROJECT_KEY,
    epicIds,
    requirementIds
  };
}
