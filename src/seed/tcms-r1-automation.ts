import type { TcmsService } from "../domain/service";

import { slugifyProjectKey } from "../domain/services/projects";

import { TCMS_PROJECT_KEY } from "./tcms-project-constants";

import { TCMS_R1_MANUAL_TEST_TITLES, TCMS_R1_REFERENCE_PROJECT_KEY } from "./tcms-r1-test-cases";



export const TCMS_R1_01_AUTO_EXTERNAL_ID = "e2e/fe-projects-create.spec.ts";

export const TCMS_R1_01_AUTO_EXTERNAL_KEY = "TCMS-AUTO-R1-01";

export const TCMS_R1_02_AUTO_EXTERNAL_ID = "e2e/fe-projects-duplicate-key.spec.ts";

export const TCMS_R1_02_AUTO_EXTERNAL_KEY = "TCMS-AUTO-R1-02";

export const TCMS_R1_03_AUTO_EXTERNAL_ID = "e2e/fe-project-picker-key.spec.ts";

export const TCMS_R1_03_AUTO_EXTERNAL_KEY = "TCMS-AUTO-R1-03";

export const TCMS_R1_04_AUTO_EXTERNAL_ID = "e2e/fe-projects-graphql-key.spec.ts";

export const TCMS_R1_04_AUTO_EXTERNAL_KEY = "TCMS-AUTO-R1-04";

export const TCMS_R1_05_AUTO_EXTERNAL_ID = "e2e/fe-projects-archive.spec.ts";

export const TCMS_R1_05_AUTO_EXTERNAL_KEY = "TCMS-AUTO-R1-05";



type TrrStep = {

  order: number;

  name: string;

  sourceStepId: string;

  parentStepId?: string;

  metaJson?: string;

  expectedResult?: string;

};



type R1AutomationSeed = {

  manualTitle: (typeof TCMS_R1_MANUAL_TEST_TITLES)[keyof typeof TCMS_R1_MANUAL_TEST_TITLES];

  externalId: string;

  externalKey: string;

  autoTitle: string;

  specFile: string;

  steps: TrrStep[];

};



const R1_AUTOMATION_SEEDS: R1AutomationSeed[] = [

  {

    manualTitle: TCMS_R1_MANUAL_TEST_TITLES.createUniqueKey,

    externalId: TCMS_R1_01_AUTO_EXTERNAL_ID,

    externalKey: TCMS_R1_01_AUTO_EXTERNAL_KEY,

    autoTitle: "E2E: create project with unique key",

    specFile: "fe-projects-create.spec.ts",

    steps: [

      { order: 1, name: "Open Projects list", sourceStepId: "s-1" },

      { order: 2, name: "Create project with unique tcms-r1-create-* key", sourceStepId: "s-2" },

      {

        order: 3,

        name: "Project row shows chosen key",

        parentStepId: "s-2",

        sourceStepId: "s-3",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "List row contains project key"

      },

      { order: 4, name: "Open project workspace", sourceStepId: "s-4" },

      {

        order: 5,

        name: "Shell shows project key in navigation",

        parentStepId: "s-4",

        sourceStepId: "s-5",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "project-detail-key matches created key"

      }

    ]

  },

  {

    manualTitle: TCMS_R1_MANUAL_TEST_TITLES.rejectDuplicateKey,

    externalId: TCMS_R1_02_AUTO_EXTERNAL_ID,

    externalKey: TCMS_R1_02_AUTO_EXTERNAL_KEY,

    autoTitle: "E2E: reject duplicate project key",

    specFile: "fe-projects-duplicate-key.spec.ts",

    steps: [

      { order: 1, name: `Note existing TCMS project key (${TCMS_R1_REFERENCE_PROJECT_KEY}) on Projects list`, sourceStepId: "s-1" },

      { order: 2, name: "Attempt create with duplicate key", sourceStepId: "s-2" },

      {

        order: 3,

        name: "PROJECT_KEY_CONFLICT error shown",

        parentStepId: "s-2",

        sourceStepId: "s-3",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "shell-app-error-code is PROJECT_KEY_CONFLICT"

      },

      {

        order: 4,

        name: "No duplicate project row added",

        sourceStepId: "s-4",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "Single row remains for the key"

      }

    ]

  },

  {

    manualTitle: TCMS_R1_MANUAL_TEST_TITLES.keyInShellPicker,

    externalId: TCMS_R1_03_AUTO_EXTERNAL_ID,

    externalKey: TCMS_R1_03_AUTO_EXTERNAL_KEY,

    autoTitle: "E2E: shell picker shows project keys",

    specFile: "fe-project-picker-key.spec.ts",

    steps: [

      { order: 1, name: "Open project workspace", sourceStepId: "s-1" },

      { order: 2, name: "Open shell project picker", sourceStepId: "s-2" },

      {

        order: 3,

        name: "Picker options include project key in label",

        parentStepId: "s-2",

        sourceStepId: "s-3",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "Options show Name (key) format"

      },

      { order: 4, name: "Switch to another project and back", sourceStepId: "s-4" },

      {

        order: 5,

        name: "Workspace key matches selection",

        parentStepId: "s-4",

        sourceStepId: "s-5",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "project-detail-key matches picked project"

      }

    ]

  },

  {

    manualTitle: TCMS_R1_MANUAL_TEST_TITLES.graphqlResolveByKey,

    externalId: TCMS_R1_04_AUTO_EXTERNAL_ID,

    externalKey: TCMS_R1_04_AUTO_EXTERNAL_KEY,

    autoTitle: "E2E: GraphQL project lookup by key",

    specFile: "fe-projects-graphql-key.spec.ts",

    steps: [

      { order: 1, name: `Query project by key ${TCMS_R1_REFERENCE_PROJECT_KEY} via GraphQL`, sourceStepId: "s-1" },

      {

        order: 2,

        name: "Response returns id, key, and name",

        parentStepId: "s-1",

        sourceStepId: "s-2",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "project field is non-null with matching key"

      },

      { order: 3, name: "Open same project in UI", sourceStepId: "s-3" },

      {

        order: 4,

        name: "UI project id and key match GraphQL",

        parentStepId: "s-3",

        sourceStepId: "s-4",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "project-detail-key matches GraphQL key"

      }

    ]

  },

  {

    manualTitle: TCMS_R1_MANUAL_TEST_TITLES.archiveHiddenByDefault,

    externalId: TCMS_R1_05_AUTO_EXTERNAL_ID,

    externalKey: TCMS_R1_05_AUTO_EXTERNAL_KEY,

    autoTitle: "E2E: archived project hidden from default list",

    specFile: "fe-projects-archive.spec.ts",

    steps: [

      { order: 1, name: "Open Projects list", sourceStepId: "s-1" },

      { order: 2, name: "Create disposable project with tcms-archive-test-* key", sourceStepId: "s-2" },

      {

        order: 3,

        name: "Project row visible on default list",

        parentStepId: "s-2",

        sourceStepId: "s-3",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "Row shows project name and key"

      },

      { order: 4, name: "Archive project from Projects list", sourceStepId: "s-4" },

      {

        order: 5,

        name: "Archived project hidden when Show archived is off",

        parentStepId: "s-4",

        sourceStepId: "s-5",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "Project key not found in default list"

      },

      { order: 6, name: "Enable Show archived on Projects list", sourceStepId: "s-6" },

      {

        order: 7,

        name: "Archived project visible with archived badge",

        parentStepId: "s-6",

        sourceStepId: "s-7",

        metaJson: JSON.stringify({ kind: "assert" }),

        expectedResult: "Row shows Archived badge"

      }

    ]

  }

];



export type TcmsR1AutomationSeedEntry = {

  manualTestCaseId: string;

  automatedTestCaseId: string;

  externalKey: string;

  created: boolean;

  updated: boolean;

};



export type TcmsR1AutomationSeedResult = {

  projectId: string;

  entries: TcmsR1AutomationSeedEntry[];

};



async function seedOneR1Automation(

  service: TcmsService,

  projectId: string,

  manualCases: Awaited<ReturnType<TcmsService["listTestCases"]>>,

  seed: R1AutomationSeed

): Promise<TcmsR1AutomationSeedEntry> {

  const manual = manualCases.find((tc) => tc.title === seed.manualTitle);

  if (manual === undefined) {

    throw new Error(`Manual test "${seed.manualTitle}" not found. Run seed:tcms:r1-tcs first.`);

  }



  const importResult = await service.importAutomatedFromTrr({

    projectId,

    automatedTests: [

      {

        externalId: seed.externalId,

        title: seed.autoTitle,

        linkedManualCaseIds: [manual.id],

        steps: seed.steps

      }

    ]

  });



  if (importResult.errors.length > 0) {

    throw new Error(`TRR import failed for ${seed.externalKey}: ${JSON.stringify(importResult.errors)}`);

  }



  const automatedCases = await service.listTestCases({ projectId, type: "automated", includeDeleted: true });

  const automated = automatedCases.find((tc) => tc.externalId === seed.externalId);

  if (automated === undefined) {

    throw new Error(`Automated test case missing after TRR import: ${seed.externalId}`);

  }



  await service.updateAutomatedTestCase({

    id: automated.id,

    externalKey: seed.externalKey,

    epicId: manual.epicId ?? null,

    automationNotes: `Playwright: apps/web/e2e/${seed.specFile} (@smoke) via playwright.tcms-automation.config.ts (sandbox :5182). Covers ${manual.externalKey ?? manual.title}.`

  });



  await service.updateManualTestCase({

    id: manual.id,

    automationStatus: "automated",

    automationNotes: `Automated by ${seed.externalId}. Linked run uses plan-automation sandbox (key ${TCMS_R1_REFERENCE_PROJECT_KEY} where applicable). Spec: ${seed.specFile}`

  });



  return {

    manualTestCaseId: manual.id,

    automatedTestCaseId: automated.id,

    externalKey: seed.externalKey,

    created: importResult.createdCount > 0,

    updated: importResult.updatedCount > 0

  };

}



/** Idempotent: seeds automated TCs for TCMS-R1-01 … R1-05 and links to manual test cases. */

export async function seedTcmsR1Automation(service: TcmsService): Promise<TcmsR1AutomationSeedResult | null> {

  const tcmsKey = slugifyProjectKey(TCMS_PROJECT_KEY);

  const project = await service.getProject({ key: tcmsKey });

  if (project === null) {

    return null;

  }



  const manualCases = await service.listTestCases({ projectId: project.id, type: "manual", includeDeleted: true });

  const entries: TcmsR1AutomationSeedEntry[] = [];

  for (const seed of R1_AUTOMATION_SEEDS) {

    entries.push(await seedOneR1Automation(service, project.id, manualCases, seed));

  }



  return { projectId: project.id, entries };

}



/** @deprecated Use seedTcmsR1Automation */

export async function seedTcmsR1ArchiveAutomation(service: TcmsService) {

  const result = await seedTcmsR1Automation(service);

  if (result === null) {

    return null;

  }

  const r5 = result.entries.find((e) => e.externalKey === TCMS_R1_05_AUTO_EXTERNAL_KEY);

  if (r5 === undefined) {

    throw new Error("R1-05 automation entry missing after seed.");

  }

  return {

    projectId: result.projectId,

    manualTestCaseId: r5.manualTestCaseId,

    automatedTestCaseId: r5.automatedTestCaseId,

    created: r5.created,

    updated: r5.updated

  };

}



export type TcmsR1AutomationTeardownResult = {

  projectId: string;

  removed: Array<{

    manualTestCaseId: string;

    automatedTestCaseId: string;

    externalKey: string;

    tombstoned: boolean;

  }>;

};



const R1_AUTOMATION_EXTERNAL_KEYS = R1_AUTOMATION_SEEDS.map((s) => s.externalKey);



/** Removes all TCMS-AUTO-R1-* tests and reverts linked manual statuses. */

export async function teardownTcmsR1Automation(service: TcmsService): Promise<TcmsR1AutomationTeardownResult | null> {

  const tcmsKey = slugifyProjectKey(TCMS_PROJECT_KEY);

  const project = await service.getProject({ key: tcmsKey });

  if (project === null) {

    return null;

  }



  const manualCases = await service.listTestCases({ projectId: project.id, type: "manual", includeDeleted: true });

  const automatedCases = await service.listTestCases({ projectId: project.id, type: "automated", includeDeleted: true });

  const removed: TcmsR1AutomationTeardownResult["removed"] = [];



  for (const seed of R1_AUTOMATION_SEEDS) {

    const automated = automatedCases.find(

      (tc) => tc.externalKey === seed.externalKey || tc.externalId === seed.externalId

    );

    if (automated === undefined) {

      continue;

    }



    const manual = manualCases.find((tc) => tc.title === seed.manualTitle);

    const deleteResult = await service.deleteAutomatedTestCase({ id: automated.id });



    if (manual !== undefined) {

      await service.updateManualTestCase({

        id: manual.id,

        automationStatus: seed.manualTitle === TCMS_R1_MANUAL_TEST_TITLES.archiveHiddenByDefault ? "automation_required" : "not_automated",

        automationNotes: `Target: ${seed.externalId} (npm run e2e -w tcms-web -- ${seed.specFile}). Seed: npm run seed:tcms:r1-automation.`

      });

    }



    removed.push({

      manualTestCaseId: manual?.id ?? "",

      automatedTestCaseId: automated.id,

      externalKey: seed.externalKey,

      tombstoned: deleteResult.tombstoned

    });

  }



  if (removed.length === 0) {

    return null;

  }



  return { projectId: project.id, removed };

}



/** @deprecated Use teardownTcmsR1Automation */

export async function teardownTcmsR1ArchiveAutomation(service: TcmsService) {

  const result = await teardownTcmsR1Automation(service);

  if (result === null) {

    return null;

  }

  const r5 = result.removed.find((e) => e.externalKey === TCMS_R1_05_AUTO_EXTERNAL_KEY);

  if (r5 === undefined) {

    return null;

  }

  return {

    projectId: result.projectId,

    manualTestCaseId: r5.manualTestCaseId,

    automatedTestCaseId: r5.automatedTestCaseId,

    tombstoned: r5.tombstoned

  };

}



export { R1_AUTOMATION_EXTERNAL_KEYS };

