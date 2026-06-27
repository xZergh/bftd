/** Strip ANSI color/formatting codes from Playwright and other runner output. */
export function sanitizeAutomationMessage(message: string | null | undefined): string | undefined {
  if (!message) {
    return undefined;
  }
  return message
    .replace(/\u001b\[[0-9;]*m/g, "")
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\r\n/g, "\n")
    .trim();
}
