import type { TcmsService } from "../domain/service";
import { slugifyProjectKey } from "../domain/services/projects";
import { TCMS_EPIC_KEYS, TCMS_PROJECT_KEY, TCMS_REQUIREMENT_KEYS } from "./tcms-project-constants";

export const TCMS_R1_MANUAL_TEST_TITLES = {
  createUniqueKey: "Manual: create project with unique key",
  rejectDuplicateKey: "Manual: reject duplicate project key",
  keyInShellPicker: "Manual: project key shown in shell picker",
  graphqlResolveByKey: "Manual: GraphQL resolves project by key",
  archiveHiddenByDefault: "Manual: archived project hidden from default list"
} as const;

type ManualSeed = {
  title: string;
  externalKey: string;
  automationStatus: string;
  description: string;
  preconditions: string;
  notes: string;
  automationNotes: string;
  releaseLabel: string;
  sprintLabel: string;
  steps: Array<{ name: string; expectedResult: string }>;
};

const R1_MANUAL_SEEDS: ManualSeed[] = [
  {
    title: TCMS_R1_MANUAL_TEST_TITLES.createUniqueKey,
    externalKey: "TCMS-TC-R1-01",
    automationStatus: "not_automated",
    description:
      "Verify that a new project can be created with a unique key and appears in the Projects list with that key.",
    preconditions: "TCMS database; user can open Projects and create projects.",
    notes: "Covers TCMS-R1 acceptance: stable project keys. Use disposable keys such as tcms-r1-create-*.",
    automationNotes:
      "Automated: e2e/fe-projects-create.spec.ts (npm run e2e -w tcms-web -- fe-projects-create.spec.ts). Seed DB: npm run seed:tcms:r1-automation.",
    releaseLabel: "MVP",
    sprintLabel: "MVP-1",
    steps: [
      {
        name: "Open Projects and start create project",
        expectedResult: "Create project form accepts name and key"
      },
      {
        name: "Enter a new name and unique key, then submit",
        expectedResult: "Project appears in the list with the chosen key"
      },
      {
        name: "Open the new project overview",
        expectedResult: "Workspace loads; project key is visible in navigation context"
      }
    ]
  },
  {
    title: TCMS_R1_MANUAL_TEST_TITLES.rejectDuplicateKey,
    externalKey: "TCMS-TC-R1-02",
    automationStatus: "not_automated",
    description: "Verify that creating a project with an existing key is rejected with a clear error.",
    preconditions: "TCMS database; at least one project with a known key (for example tcms).",
    notes: "Negative path for TCMS-R1 key uniqueness.",
    automationNotes:
      "Automated: e2e/fe-projects-duplicate-key.spec.ts (npm run e2e -w tcms-web -- fe-projects-duplicate-key.spec.ts). Seed DB: npm run seed:tcms:r1-automation.",
    releaseLabel: "MVP",
    sprintLabel: "MVP-1",
    steps: [
      {
        name: "Note an existing project key (for example tcms)",
        expectedResult: "Key is visible on the Projects list"
      },
      {
        name: "Attempt to create another project with the same key",
        expectedResult: "Create is rejected with a stable error and fix hint"
      },
      {
        name: "Dismiss the error and refresh the list",
        expectedResult: "No duplicate project row was added"
      }
    ]
  },
  {
    title: TCMS_R1_MANUAL_TEST_TITLES.keyInShellPicker,
    externalKey: "TCMS-TC-R1-03",
    automationStatus: "not_automated",
    description: "Verify the shell project picker shows project name and key for switching workspaces.",
    preconditions: "TCMS database; at least two projects.",
    notes: "UI traceability for TCMS-R1: keys visible outside the Projects list.",
    automationNotes:
      "Automated: e2e/fe-project-picker-key.spec.ts (npm run e2e -w tcms-web -- fe-project-picker-key.spec.ts). Seed DB: npm run seed:tcms:r1-automation.",
    releaseLabel: "MVP",
    sprintLabel: "MVP-1",
    steps: [
      {
        name: "Open any project workspace from the Projects list",
        expectedResult: "Shell header shows the active project"
      },
      {
        name: "Open the project picker in the shell",
        expectedResult: "Picker lists projects with name and key (for example TCMS (tcms))"
      },
      {
        name: "Switch to a different project and back",
        expectedResult: "Picker and workspace reflect the selected project key"
      }
    ]
  },
  {
    title: TCMS_R1_MANUAL_TEST_TITLES.graphqlResolveByKey,
    externalKey: "TCMS-TC-R1-04",
    automationStatus: "not_automated",
    description: "Verify GraphQL project lookup by key returns the same project as the UI workspace.",
    preconditions: "TCMS database; TCMS project seeded with key tcms.",
    notes: "API-level check for TCMS-R1 stable keys.",
    automationNotes:
      "Automated: e2e/fe-projects-graphql-key.spec.ts (npm run e2e -w tcms-web -- fe-projects-graphql-key.spec.ts). Seed DB: npm run seed:tcms:r1-automation.",
    releaseLabel: "MVP",
    sprintLabel: "MVP-1",
    steps: [
      {
        name: "Query project by key via GraphQL (project input key field)",
        expectedResult: "Response returns the project id, key, and name"
      },
      {
        name: "Open the same project in the UI",
        expectedResult: "UI project id and key match the GraphQL response"
      }
    ]
  },
  {
    title: TCMS_R1_MANUAL_TEST_TITLES.archiveHiddenByDefault,
    externalKey: "TCMS-TC-R1-05",
    automationStatus: "automation_required",
    description:
      "Verify archived projects are hidden from the default Projects list and reappear when Show archived is enabled.",
    preconditions:
      "TCMS database; ability to create and archive a disposable project (use keys such as tcms-archive-test-*).",
    notes: "TCMS-R1 lifecycle: archive must not delete data but must hide from default navigation.",
    automationNotes:
      "Automated: e2e/fe-projects-archive.spec.ts (npm run e2e -w tcms-web -- fe-projects-archive.spec.ts). Seed DB: npm run seed:tcms:r1-automation.",
    releaseLabel: "MVP",
    sprintLabel: "MVP-1",
    steps: [
      {
        name: "Create a disposable project or pick a non-critical test project",
        expectedResult: "Project is active and visible on the default Projects list"
      },
      {
        name: "Archive the project",
        expectedResult: "Archive action succeeds"
      },
      {
        name: "With Show archived off, search for the project",
        expectedResult: "Project is not listed"
      },
      {
        name: "Enable Show archived",
        expectedResult: "Archived project reappears with archived state indicated"
      }
    ]
  }
];

export type TcmsR1TestCaseSeedResult = {
  projectId: string;
  requirementId: string;
  epicId: string | null;
  created: number;
  skipped: number;
  updated: number;
  testCaseIds: string[];
};

function contentPatchFromSeed(seed: ManualSeed) {
  return {
    externalKey: seed.externalKey,
    automationStatus: seed.automationStatus,
    description: seed.description,
    preconditions: seed.preconditions,
    notes: seed.notes,
    automationNotes: seed.automationNotes
  };
}

function seedNeedsContentUpdate(
  existing: {
    externalKey: string | null;
    automationStatus: string | null;
    description: string | null;
    preconditions: string | null;
    notes: string | null;
    automationNotes: string | null;
  },
  seed: ManualSeed
): boolean {
  const patch = contentPatchFromSeed(seed);
  return (
    (existing.externalKey ?? "") !== patch.externalKey ||
    (existing.automationStatus ?? "not_automated") !== patch.automationStatus ||
    (existing.description ?? "") !== patch.description ||
    (existing.preconditions ?? "") !== patch.preconditions ||
    (existing.notes ?? "") !== patch.notes ||
    (existing.automationNotes ?? "") !== patch.automationNotes
  );
}

/** Idempotent: seeds manual test cases linked to TCMS-R1 and patches content fields. */
export async function seedTcmsR1ManualTestCases(service: TcmsService): Promise<TcmsR1TestCaseSeedResult | null> {
  const tcmsKey = slugifyProjectKey(TCMS_PROJECT_KEY);
  const project = await service.getProject({ key: tcmsKey });
  if (project === null) {
    return null;
  }

  const requirements = await service.listRequirements({ projectId: project.id });
  const r1 = requirements.find((r) => r.externalKey === TCMS_REQUIREMENT_KEYS.R1);
  if (r1 === undefined) {
    throw new Error(`Requirement ${TCMS_REQUIREMENT_KEYS.R1} not found in TCMS project.`);
  }

  const epics = await service.listEpics({ projectId: project.id });
  const coreEpic = epics.find((e) => e.externalKey === TCMS_EPIC_KEYS.CORE);

  const existingCases = await service.listTestCases({ projectId: project.id, includeDeleted: true });
  const byTitle = new Map(existingCases.map((tc) => [tc.title, tc]));

  let created = 0;
  let skipped = 0;
  let updated = 0;
  const testCaseIds: string[] = [];

  for (const seed of R1_MANUAL_SEEDS) {
    const existing = byTitle.get(seed.title);
    if (existing !== undefined) {
      testCaseIds.push(existing.id);
      if (seedNeedsContentUpdate(existing, seed)) {
        await service.updateManualTestCase({
          id: existing.id,
          ...contentPatchFromSeed(seed)
        });
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    const tc = await service.createManualTestCase({
      projectId: project.id,
      title: seed.title,
      requirementIds: [r1.id],
      steps: seed.steps,
      releaseLabel: seed.releaseLabel,
      sprintLabel: seed.sprintLabel,
      epicId: coreEpic?.id,
      ...contentPatchFromSeed(seed)
    });
    testCaseIds.push(tc.id);
    byTitle.set(seed.title, tc);
    created += 1;
  }

  return {
    projectId: project.id,
    requirementId: r1.id,
    epicId: coreEpic?.id ?? null,
    created,
    skipped,
    updated,
    testCaseIds
  };
}
