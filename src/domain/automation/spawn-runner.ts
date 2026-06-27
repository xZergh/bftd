import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { automationWebUrl } from "./constants";
const require = createRequire(__filename);

function spawnDetached(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) {
  const child = spawn(command, args, {
    cwd: options.cwd,
    detached: true,
    stdio: "ignore",
    env: options.env,
    windowsHide: true
  });
  child.unref();
  return child;
}

export function spawnAutomationRunner(options: {
  repoRoot?: string;
  dbPath: string;
  runId: string;
  automatedTestCaseIds: string[];
  framework?: string;
}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const tsxCli = require.resolve("tsx/cli");
  const scriptPath = join(repoRoot, "scripts", "run-plan-automation.ts");
  const args = [
    tsxCli,
    scriptPath,
    "--run-id",
    options.runId,
    "--db-path",
    options.dbPath,
    "--framework",
    options.framework ?? "playwright",
    "--automated-ids",
    options.automatedTestCaseIds.join(",")
  ];
  spawnDetached(process.execPath, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      DB_PATH: options.dbPath,
      TCMS_WEB_URL: process.env.TCMS_AUTOMATION_WEB_URL ?? automationWebUrl()
    }
  });
}
export function defaultDbPath(repoRoot?: string) {
  const root = repoRoot ?? process.cwd();
  return process.env.DB_PATH ?? join(root, "data", "tcms.sqlite");
}

export function defaultReportDir(repoRoot?: string) {
  const root = repoRoot ?? process.cwd();
  return join(root, "data", "run-reports");
}
