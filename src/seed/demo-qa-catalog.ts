import type { DemoQaSeedData } from "./demo-qa-seed-data";

/** Stable E2E anchor keys — fe-c/fe-d/fe-f specs target these explicitly. */
export const DEMO_QA_E2E_REQUIREMENT_KEYS = ["DEMO-R1", "DEMO-R2", "DEMO-R3"] as const;

type CatalogRequirement = {
  externalKey: string;
  title: string;
  description: string;
  parentExternalKey?: string;
  releaseLabel: string;
  sprintLabel: string;
  status: "draft" | "in_progress" | "approved";
  priority: "low" | "medium" | "high";
  requirementType: "functional" | "nonfunctional";
  tags: string[];
  manualTitle: string;
  manualSteps: Array<{ name: string; expectedResult: string }>;
};

const epics = [
  { key: "DEMO-EP-01", title: "TCMS workspace", sprint: "Sprint-1" },
  { key: "DEMO-EP-02", title: "Requirements & traceability", sprint: "Sprint-1" },
  { key: "DEMO-EP-03", title: "Test cases & plans", sprint: "Sprint-2" },
  { key: "DEMO-EP-04", title: "Runs, KPI & imports", sprint: "Sprint-2" }
] as const;

const features = [
  { key: "DEMO-FT-01-01", parent: "DEMO-EP-01", title: "Projects & navigation", sprint: "Sprint-1" },
  { key: "DEMO-FT-01-02", parent: "DEMO-EP-01", title: "Project overview", sprint: "Sprint-1" },
  { key: "DEMO-FT-02-01", parent: "DEMO-EP-02", title: "Requirements list & CRUD", sprint: "Sprint-1" },
  { key: "DEMO-FT-02-02", parent: "DEMO-EP-02", title: "Requirement metadata & hierarchy", sprint: "Sprint-2" },
  { key: "DEMO-FT-03-01", parent: "DEMO-EP-03", title: "Manual test cases", sprint: "Sprint-2" },
  { key: "DEMO-FT-03-02", parent: "DEMO-EP-03", title: "Automated test cases", sprint: "Sprint-2" },
  { key: "DEMO-FT-03-03", parent: "DEMO-EP-03", title: "Test plans", sprint: "Sprint-3" },
  { key: "DEMO-FT-04-01", parent: "DEMO-EP-04", title: "Test runs & results", sprint: "Sprint-2" },
  { key: "DEMO-FT-04-02", parent: "DEMO-EP-04", title: "KPI & traceability reporting", sprint: "Sprint-3" },
  { key: "DEMO-FT-04-03", parent: "DEMO-EP-04", title: "Bulk imports & design links", sprint: "Sprint-3" }
] as const;

const leaves: Array<Omit<CatalogRequirement, "manualTitle" | "manualSteps"> & { manualTitle?: string }> = [
  {
    externalKey: "DEMO-R1",
    parentExternalKey: "DEMO-FT-01-01",
    title: "User can create a project with a unique key",
    description: "Project key is the stable slug for imports, routing, and E2E selectors.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["demo", "projects"]
  },
  {
    externalKey: "DEMO-R2",
    parentExternalKey: "DEMO-FT-01-01",
    title: "Archived projects are hidden from the default list",
    description: "Archived projects remain recoverable via Show archived toggle.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "draft",
    priority: "medium",
    requirementType: "functional",
    tags: ["demo", "projects"]
  },
  {
    externalKey: "DEMO-R3",
    parentExternalKey: "DEMO-FT-01-02",
    title: "Overview KPI strip shows requirement, manual, and run counts",
    description: "Dashboard hub summarizes entity totals for the active project.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "in_progress",
    priority: "high",
    requirementType: "functional",
    tags: ["demo", "overview"]
  },
  {
    externalKey: "DEMO-R4",
    parentExternalKey: "DEMO-FT-01-02",
    title: "Overview surfaces the latest test run summary",
    description: "Recent execution activity is visible without opening the runs list.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "approved",
    priority: "low",
    requirementType: "functional",
    tags: ["demo", "overview"]
  },
  {
    externalKey: "DEMO-R5",
    parentExternalKey: "DEMO-FT-02-01",
    title: "Inline create row accepts external key, title, status, and priority",
    description: "Dense requirements table supports inline create without modals.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "approved",
    priority: "medium",
    requirementType: "functional",
    tags: ["demo", "requirements"]
  },
  {
    externalKey: "DEMO-R6",
    parentExternalKey: "DEMO-FT-02-01",
    title: "Delete is blocked when a manual testcase is linked",
    description: "API returns fixHint directing the user to unlink manual tests first.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["demo", "requirements", "validation"]
  },
  {
    externalKey: "DEMO-R7",
    parentExternalKey: "DEMO-FT-02-02",
    title: "Release and sprint labels scope list filters",
    description: "Delivery labels align requirements with release planning views.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "draft",
    priority: "low",
    requirementType: "nonfunctional",
    tags: ["demo", "requirements", "labels"]
  },
  {
    externalKey: "DEMO-R8",
    parentExternalKey: "DEMO-FT-02-02",
    title: "Parent requirement links form a folder hierarchy",
    description: "Epic, feature, and leaf requirements share one project-scoped tree.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "draft",
    priority: "medium",
    requirementType: "nonfunctional",
    tags: ["demo", "requirements", "hierarchy"]
  },
  {
    externalKey: "DEMO-R9",
    parentExternalKey: "DEMO-FT-03-01",
    title: "Manual testcase requires at least one ordered step",
    description: "Step name and expected result columns support dense inline editing.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["demo", "testcases", "manual"]
  },
  {
    externalKey: "DEMO-R10",
    parentExternalKey: "DEMO-FT-03-01",
    title: "Manual testcase must link to one or more requirements",
    description: "Traceability starts at requirement to manual testcase edges.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["demo", "testcases", "traceability"]
  },
  {
    externalKey: "DEMO-R11",
    parentExternalKey: "DEMO-FT-03-02",
    title: "Automated testcase links to manual testcase for traceability",
    description: "Automation coverage rolls up through manual bridges to requirements.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "in_progress",
    priority: "medium",
    requirementType: "functional",
    tags: ["demo", "testcases", "automated"]
  },
  {
    externalKey: "DEMO-R12",
    parentExternalKey: "DEMO-FT-03-02",
    title: "Tombstoned testcase is hidden from default lists",
    description: "Soft-deleted automated cases remain in version history when referenced.",
    releaseLabel: "1.1",
    sprintLabel: "Sprint-2",
    status: "draft",
    priority: "medium",
    requirementType: "functional",
    tags: ["demo", "testcases", "tombstone"]
  },
  {
    externalKey: "DEMO-R13",
    parentExternalKey: "DEMO-FT-03-03",
    title: "Test plan groups test cases for regression scope",
    description: "Plans curate cases for staging sign-off without duplicating cases.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-3",
    status: "approved",
    priority: "medium",
    requirementType: "functional",
    tags: ["demo", "plans"]
  },
  {
    externalKey: "DEMO-R14",
    parentExternalKey: "DEMO-FT-03-03",
    title: "Run creation can seed cases from test plan membership",
    description: "Run assignments inherit plan-linked manual and automated cases.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-3",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["demo", "plans", "runs"]
  },
  {
    externalKey: "DEMO-R15",
    parentExternalKey: "DEMO-FT-04-01",
    title: "Tester can submit pass, fail, skip, and blocked results",
    description: "Run detail supports per-case execution with duration capture.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "approved",
    priority: "high",
    requirementType: "functional",
    tags: ["demo", "runs"]
  },
  {
    externalKey: "DEMO-R16",
    parentExternalKey: "DEMO-FT-04-01",
    title: "Run aggregate shows totals, pass rate, and duration",
    description: "Execution summary is available without exporting results.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2",
    status: "approved",
    priority: "medium",
    requirementType: "functional",
    tags: ["demo", "runs", "reporting"]
  },
  {
    externalKey: "DEMO-R17",
    parentExternalKey: "DEMO-FT-04-02",
    title: "KPI dashboard shows formula-driven coverage metrics",
    description: "Requirement and testcase coverage percentages use live link counts.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-3",
    status: "approved",
    priority: "high",
    requirementType: "nonfunctional",
    tags: ["demo", "kpi"]
  },
  {
    externalKey: "DEMO-R18",
    parentExternalKey: "DEMO-FT-04-02",
    title: "Run traceability snapshot records requirement-manual edges",
    description: "Point-in-time run reporting is immutable after snapshot capture.",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-3",
    status: "approved",
    priority: "high",
    requirementType: "nonfunctional",
    tags: ["demo", "traceability"]
  },
  {
    externalKey: "DEMO-R19",
    parentExternalKey: "DEMO-FT-04-03",
    title: "Bulk requirements import runs in a single transaction",
    description: "Import rollback preserves project state when any row fails validation.",
    releaseLabel: "1.1",
    sprintLabel: "Sprint-3",
    status: "draft",
    priority: "medium",
    requirementType: "functional",
    tags: ["demo", "imports"]
  },
  {
    externalKey: "DEMO-R20",
    parentExternalKey: "DEMO-FT-04-03",
    title: "Penpot design link can be attached to a requirement",
    description: "Design URLs associate UI frames with requirement rows for review.",
    releaseLabel: "1.1",
    sprintLabel: "Sprint-3",
    status: "in_progress",
    priority: "low",
    requirementType: "functional",
    tags: ["demo", "design-links"]
  }
];

function manualTitleFor(key: string, title: string) {
  return `Manual: ${title}`;
}

function defaultStep(title: string) {
  return [{ name: `Verify ${title.toLowerCase()}`, expectedResult: "Expected behavior observed" }];
}

function buildCatalogRequirements(): CatalogRequirement[] {
  const out: CatalogRequirement[] = [];

  for (const epic of epics) {
    out.push({
      externalKey: epic.key,
      title: `Epic: ${epic.title}`,
      description: `Top-level scope for ${epic.title.toLowerCase()} capabilities.`,
      releaseLabel: "1.0",
      sprintLabel: epic.sprint,
      status: "approved",
      priority: "high",
      requirementType: "nonfunctional",
      tags: ["demo", "epic"],
      manualTitle: `Manual: smoke - ${epic.title}`,
      manualSteps: [{ name: `Walk ${epic.title} surfaces`, expectedResult: "Core flows reachable" }]
    });
  }

  for (const feature of features) {
    out.push({
      externalKey: feature.key,
      parentExternalKey: feature.parent,
      title: `Feature: ${feature.title}`,
      description: `Feature group for ${feature.title.toLowerCase()}.`,
      releaseLabel: "1.0",
      sprintLabel: feature.sprint,
      status: "approved",
      priority: "medium",
      requirementType: "nonfunctional",
      tags: ["demo", "feature"],
      manualTitle: `Manual: smoke - ${feature.title}`,
      manualSteps: [{ name: `Exercise ${feature.title}`, expectedResult: "Feature paths behave as specified" }]
    });
  }

  for (const leaf of leaves) {
    out.push({
      ...leaf,
      manualTitle: leaf.manualTitle ?? manualTitleFor(leaf.externalKey, leaf.title),
      manualSteps: defaultStep(leaf.title)
    });
  }

  return out;
}

const automatedCases = [
  {
    title: "API: project create returns stable key",
    manualKey: "DEMO-R1",
    sprint: "Sprint-1"
  },
  {
    title: "API: requirements list returns linked manual counts",
    manualKey: "DEMO-R5",
    sprint: "Sprint-1"
  },
  {
    title: "API: manual testcase create enforces step minimum",
    manualKey: "DEMO-R9",
    sprint: "Sprint-2"
  },
  {
    title: "API: run aggregate computes pass rate",
    manualKey: "DEMO-R16",
    sprint: "Sprint-2"
  },
  {
    title: "API: KPI dashboard returns coverage formulas",
    manualKey: "DEMO-R17",
    sprint: "Sprint-3"
  },
  {
    title: "API: import requirements rolls back on validation error",
    manualKey: "DEMO-R19",
    sprint: "Sprint-3"
  }
] as const;

/** Build canonical DEMO-QA seed manifest for fixtures/demo-qa-seed-data.json. */
export function buildDemoQaSeedData(): DemoQaSeedData {
  const catalog = buildCatalogRequirements();
  const manualByReqKey = new Map(catalog.map((r) => [r.externalKey, r.manualTitle]));

  const requirements = catalog.map((r) => ({
    externalKey: r.externalKey,
    title: r.title,
    description: r.description,
    releaseLabel: r.releaseLabel,
    sprintLabel: r.sprintLabel,
    status: r.status,
    priority: r.priority,
    requirementType: r.requirementType,
    tags: r.tags,
    parentExternalKey: r.parentExternalKey
  }));

  const manualTestCases = catalog.map((r) => ({
    title: r.manualTitle,
    releaseLabel: r.releaseLabel,
    sprintLabel: r.sprintLabel,
    requirementExternalKeys: [r.externalKey],
    steps: r.manualSteps.map((s) => ({ name: s.name, expectedResult: s.expectedResult }))
  }));

  const automatedTestCases = automatedCases.map((a) => ({
    title: a.title,
    releaseLabel: "1.0",
    sprintLabel: a.sprint,
    manualTitles: [manualByReqKey.get(a.manualKey)!]
  }));

  const planCaseTitles = [
    manualByReqKey.get("DEMO-R1")!,
    manualByReqKey.get("DEMO-R3")!,
    manualByReqKey.get("DEMO-R9")!,
    manualByReqKey.get("DEMO-R15")!,
    ...automatedTestCases.map((a) => a.title)
  ];

  const runResults: DemoQaSeedData["runs"][number]["results"] = [
    { testCaseTitle: manualByReqKey.get("DEMO-R1")!, status: "passed", durationMs: 1100 },
    { testCaseTitle: manualByReqKey.get("DEMO-R3")!, status: "failed", durationMs: 900 },
    { testCaseTitle: manualByReqKey.get("DEMO-R9")!, status: "skipped", durationMs: 0 },
    { testCaseTitle: manualByReqKey.get("DEMO-R15")!, status: "passed", durationMs: 1400 },
    { testCaseTitle: automatedTestCases[0]!.title, status: "passed", durationMs: 320 },
    { testCaseTitle: automatedTestCases[3]!.title, status: "passed", durationMs: 280 }
  ];

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    project: {
      key: "demo-qa",
      name: "Demo QA sample workspace",
      description: "Seeded demo workspace for UI review, manual QA, and Playwright E2E."
    },
    requirements,
    manualTestCases,
    automatedTestCases,
    plans: [
      {
        name: "Demo regression plan",
        description: "Curated regression slice for staging sign-off.",
        releaseLabel: "1.0",
        sprintLabel: "Sprint-1",
        testCaseTitles: planCaseTitles
      }
    ],
    runs: [
      {
        name: "Demo regression - staging",
        releaseLabel: null,
        sprintLabel: null,
        environment: "staging",
        buildVersion: "demo-1.0.0",
        trigger: "seed-script",
        results: runResults
      }
    ]
  };
}
