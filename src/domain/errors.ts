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
  | "STEPS_REQUIRED"
  | "CONFLICT";

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
