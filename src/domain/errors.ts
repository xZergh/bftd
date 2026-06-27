export type ErrorCode =
  | "REQUIREMENT_PARENT_REQUIRED"
  | "MANUAL_LINK_REQUIRED"
  | "ENTITY_NOT_FOUND"
  | "VALIDATION_ERROR"
  | "INVALID_IMPORT_SCHEMA"
  | "TRR_IMPORT_INVALID"
  | "DESIGN_LINK_INVALID"
  | "KPI_RANGE_INVALID"
  | "DELETE_BLOCKED_LINKED_MANUAL"
  | "DELETE_BLOCKED_LINKED_AUTOMATED"
  | "DELETE_BLOCKED_REQUIREMENT_MANUAL"
  | "PARENT_REQUIREMENT_INVALID"
  | "PROJECT_KEY_CONFLICT"
  | "EPIC_KEY_CONFLICT"
  | "TEST_CASE_KEY_CONFLICT"
  | "INVALID_AUTOMATION_STATUS"
  | "EPIC_NOT_IN_PROJECT"
  | "STEPS_REQUIRED"
  | "CONFLICT"
  | "AUTOMATION_FRAMEWORK_UNSUPPORTED"
  | "RUN_NO_MANUAL_CASES"
  | "RUN_NO_LINKED_AUTOMATION"
  | "RUN_NO_AUTOMATION"
  | "PLAN_EMPTY"
  | "PLAN_NO_AUTOMATION"
  | "PLAN_AUTOMATION_NO_EXTERNAL_ID"
  | "PLAN_CYCLE"
  | "PLAN_PROJECT_MISMATCH";

export class AppError extends Error {
  code: ErrorCode;
  fixHint: string;
  context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    fixHint: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.code = code;
    this.fixHint = fixHint;
    this.context = context;
  }
}
