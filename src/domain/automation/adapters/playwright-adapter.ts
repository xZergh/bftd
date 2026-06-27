import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { archiveCtrfReport } from "../../../http/run-report-routes";
import { automationWebUrl } from "../constants";
import {
  normalizeSpecPath,
  outcomesFromCtrf,
  parseCtrfReportFile,
  summaryFromCtrf
} from "../ctrf";
import type { AutomationExecuteRequest, AutomationExecuteResult, TestFrameworkAdapter } from "../types";

const require = createRequire(__filename);

export const playwrightAdapter: TestFrameworkAdapter = {
  id: "playwright",

  async execute(request: AutomationExecuteRequest): Promise<AutomationExecuteResult> {
    const webDir = join(request.repoRoot, "apps", "web");
    const specArgs = [...new Set(request.targets.map((t) => normalizeSpecPath(t.externalId)))];
    const automationConfig = join(webDir, "playwright.tcms-automation.config.ts");

    mkdirSync(request.reportDir, { recursive: true });
    const ctrfReportPath = join(request.reportDir, `${request.runId}.ctrf.json`);

    const { exitCode, stderr } = await new Promise<{
      stderr: string;
      exitCode: number;
    }>((resolve, reject) => {
      const playwrightCli = require.resolve("@playwright/test/cli", { paths: [webDir] });
      const child = spawn(
        process.execPath,
        [playwrightCli, "test", ...specArgs, "--config", automationConfig],
        {
          cwd: webDir,
          env: {
            ...process.env,
            TCMS_WEB_URL: process.env.TCMS_WEB_URL ?? automationWebUrl(),
            TCMS_RUN_CTRF_REPORT: ctrfReportPath
          },
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true
        }
      );
      let err = "";
      child.stderr?.on("data", (chunk: Buffer) => {
        err += chunk.toString();
      });
      child.on("error", reject);
      child.on("close", (code) => resolve({ stderr: err, exitCode: code ?? 1 }));
    });

    const parsed = parseCtrfReportFile(ctrfReportPath);

    const runnerError =
      exitCode !== 0 && !parsed
        ? (stderr.trim().split("\n").pop() ?? `Playwright exited with code ${exitCode}`)
        : undefined;

    const outcomes = outcomesFromCtrf(parsed, request.targets, runnerError);
    const archivedCtrfPath = archiveCtrfReport(request.runId, ctrfReportPath);
    const generatedAt = new Date().toISOString();

    return {
      outcomes,
      report: {
        framework: "playwright",
        generatedAt,
        attachment: { kind: "ctrf", ref: archivedCtrfPath ?? ctrfReportPath },
        ctrfAttachment: archivedCtrfPath ? { kind: "ctrf", ref: archivedCtrfPath } : undefined,
        summary: summaryFromCtrf(parsed, outcomes)
      }
    };
  }
};
