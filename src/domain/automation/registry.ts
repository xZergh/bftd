import { AppError } from "../errors";
import { playwrightAdapter } from "./adapters/playwright-adapter";
import type { TestFrameworkAdapter } from "./types";

const adapters = new Map<string, TestFrameworkAdapter>([[playwrightAdapter.id, playwrightAdapter]]);

export function getAutomationAdapter(frameworkId?: string | null): TestFrameworkAdapter {
  const id = (frameworkId ?? "playwright").toLowerCase();
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new AppError(
      "AUTOMATION_FRAMEWORK_UNSUPPORTED",
      `Test framework "${id}" is not supported.`,
      "Use a registered framework adapter (MVP: playwright).",
      { framework: id, supported: [...adapters.keys()] }
    );
  }
  return adapter;
}

export function listAutomationFrameworks(): string[] {
  return [...adapters.keys()];
}
