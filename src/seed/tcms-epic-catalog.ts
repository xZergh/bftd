import { TCMS_EPIC_KEYS, TCMS_REQUIREMENT_KEYS } from "./tcms-project-constants";

export type TcmsEpicCatalogKey = keyof typeof TCMS_EPIC_KEYS;

export type TcmsEpicSeed = {
  key: TcmsEpicCatalogKey;
  externalKey: string;
  title: string;
  description: string;
};

export const TCMS_EPIC_SEEDS: TcmsEpicSeed[] = [
  {
    key: "CORE",
    externalKey: TCMS_EPIC_KEYS.CORE,
    title: "Core platform",
    description: "Projects, data isolation, and local-first operation."
  },
  {
    key: "REQUIREMENTS",
    externalKey: TCMS_EPIC_KEYS.REQUIREMENTS,
    title: "Requirements",
    description: "Requirement authoring, hierarchy, imports, and design links."
  },
  {
    key: "TEST_CASES",
    externalKey: TCMS_EPIC_KEYS.TEST_CASES,
    title: "Test cases",
    description: "Manual and automated tests, steps, and TRR import."
  },
  {
    key: "TRACEABILITY",
    externalKey: TCMS_EPIC_KEYS.TRACEABILITY,
    title: "Traceability",
    description: "Requirement ↔ manual ↔ automated linking and graph reporting."
  },
  {
    key: "RUNS",
    externalKey: TCMS_EPIC_KEYS.RUNS,
    title: "Runs and reporting",
    description: "Test execution, snapshots, and KPI coverage."
  },
  {
    key: "QUALITY",
    externalKey: TCMS_EPIC_KEYS.QUALITY,
    title: "API quality",
    description: "Deterministic errors, versioning, and contract stability."
  }
];

/** Maps each seeded requirement external key to its epic catalog key. */
export const TCMS_REQUIREMENT_EPIC_BY_EXTERNAL_KEY: Record<string, TcmsEpicCatalogKey> = {
  [TCMS_REQUIREMENT_KEYS.R1]: "CORE",
  [TCMS_REQUIREMENT_KEYS.R2]: "CORE",
  [TCMS_REQUIREMENT_KEYS.R3]: "CORE",
  [TCMS_REQUIREMENT_KEYS.R10]: "REQUIREMENTS",
  [TCMS_REQUIREMENT_KEYS.R11]: "REQUIREMENTS",
  [TCMS_REQUIREMENT_KEYS.R12]: "REQUIREMENTS",
  [TCMS_REQUIREMENT_KEYS.R13]: "REQUIREMENTS",
  [TCMS_REQUIREMENT_KEYS.R20]: "TEST_CASES",
  [TCMS_REQUIREMENT_KEYS.R21]: "TEST_CASES",
  [TCMS_REQUIREMENT_KEYS.R22]: "TEST_CASES",
  [TCMS_REQUIREMENT_KEYS.R23]: "TEST_CASES",
  [TCMS_REQUIREMENT_KEYS.R30]: "TRACEABILITY",
  [TCMS_REQUIREMENT_KEYS.R31]: "TRACEABILITY",
  [TCMS_REQUIREMENT_KEYS.R40]: "RUNS",
  [TCMS_REQUIREMENT_KEYS.R41]: "RUNS",
  [TCMS_REQUIREMENT_KEYS.R42]: "RUNS",
  [TCMS_REQUIREMENT_KEYS.R50]: "QUALITY",
  [TCMS_REQUIREMENT_KEYS.R51]: "QUALITY"
};
