import { AppError } from "./errors";

/** System-default requirement enums (v1). Exposed via projectSettings query; overridable per project in v1.1. */
export const REQUIREMENT_STATUSES = ["draft", "in_progress", "approved"] as const;
export const REQUIREMENT_PRIORITIES = ["low", "medium", "high"] as const;
export const REQUIREMENT_TYPES = ["functional", "nonfunctional"] as const;
/**
 * Test-case authoring status. Deliberately avoids "active" so it never reads as the
 * is_deleted lifecycle already surfaced in the UI as active/deleted.
 */
export const TEST_CASE_STATUSES = ["draft", "ready", "deprecated"] as const;
export const DEFAULT_TEST_CASE_STATUS: TestCaseStatus = "draft";

export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];
export type RequirementPriority = (typeof REQUIREMENT_PRIORITIES)[number];
export type RequirementType = (typeof REQUIREMENT_TYPES)[number];
export type TestCaseStatus = (typeof TEST_CASE_STATUSES)[number];

export type ProjectEnumSettings = {
  requirementStatuses: readonly RequirementStatus[];
  requirementPriorities: readonly RequirementPriority[];
  requirementTypes: readonly RequirementType[];
  testCaseStatuses: readonly TestCaseStatus[];
};

export function defaultProjectEnumSettings(): ProjectEnumSettings {
  return {
    requirementStatuses: REQUIREMENT_STATUSES,
    requirementPriorities: REQUIREMENT_PRIORITIES,
    requirementTypes: REQUIREMENT_TYPES,
    testCaseStatuses: TEST_CASE_STATUSES
  };
}

function allowedHint(values: readonly string[]) {
  return `Allowed values: ${values.join(", ")}.`;
}

export function assertRequirementStatus(value: string) {
  if (!(REQUIREMENT_STATUSES as readonly string[]).includes(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid requirement status "${value}".`,
      allowedHint(REQUIREMENT_STATUSES),
      { status: value }
    );
  }
}

export function assertRequirementPriority(value: string) {
  if (!(REQUIREMENT_PRIORITIES as readonly string[]).includes(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid requirement priority "${value}".`,
      allowedHint(REQUIREMENT_PRIORITIES),
      { priority: value }
    );
  }
}

export function assertRequirementType(value: string) {
  if (!(REQUIREMENT_TYPES as readonly string[]).includes(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid requirement type "${value}".`,
      allowedHint(REQUIREMENT_TYPES),
      { requirementType: value }
    );
  }
}

export function assertTestCaseStatus(value: string) {
  if (!(TEST_CASE_STATUSES as readonly string[]).includes(value)) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Invalid testcase status "${value}".`,
      allowedHint(TEST_CASE_STATUSES),
      { status: value }
    );
  }
}
