export const REQUIRED_MSG = "This field is required.";

export function trimmedNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
