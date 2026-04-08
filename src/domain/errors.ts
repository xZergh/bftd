export type ErrorCode =
  | "REQUIREMENT_PARENT_REQUIRED"
  | "MANUAL_LINK_REQUIRED"
  | "ENTITY_NOT_FOUND"
  | "VALIDATION_ERROR";

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
