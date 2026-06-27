/** Canonical identifiers for the TCMS product project (dogfooding / real backlog). */
export const TCMS_PROJECT_KEY = "TCMS";
export const TCMS_PROJECT_NAME = "TCMS";

export const TCMS_EPIC_KEYS = {
  CORE: "EPIC-CORE",
  REQUIREMENTS: "EPIC-REQ",
  TEST_CASES: "EPIC-TC",
  TRACEABILITY: "EPIC-TRACE",
  RUNS: "EPIC-RUN",
  QUALITY: "EPIC-QUALITY"
} as const;

export const TCMS_REQUIREMENT_KEYS = {
  R1: "TCMS-R1",
  R2: "TCMS-R2",
  R3: "TCMS-R3",
  R10: "TCMS-R10",
  R11: "TCMS-R11",
  R12: "TCMS-R12",
  R13: "TCMS-R13",
  R20: "TCMS-R20",
  R21: "TCMS-R21",
  R22: "TCMS-R22",
  R23: "TCMS-R23",
  R30: "TCMS-R30",
  R31: "TCMS-R31",
  R40: "TCMS-R40",
  R41: "TCMS-R41",
  R42: "TCMS-R42",
  R50: "TCMS-R50",
  R51: "TCMS-R51"
} as const;

export type TcmsProjectSeedManifest = {
  projectId: string;
  projectKey: string;
  epicIds: Record<keyof typeof TCMS_EPIC_KEYS, string>;
  requirementIds: Record<keyof typeof TCMS_REQUIREMENT_KEYS, string>;
};
