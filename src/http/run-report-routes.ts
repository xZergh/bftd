import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defaultReportDir } from "../domain/automation/spawn-runner";

const RUN_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function runCtrfPath(runId: string) {
  return join(defaultReportDir(), runId, "ctrf.json");
}

export function archiveCtrfReport(runId: string, sourcePath: string): string | null {
  if (!existsSync(sourcePath)) {
    return null;
  }
  const dest = runCtrfPath(runId);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(sourcePath, dest);
  return dest;
}

export function runReportPublicUrl(runId: string) {
  return `/api/run-reports/${runId}/ctrf.json`;
}

/** Serve archived CTRF JSON from data/run-reports/<runId>/ctrf.json */
export function tryHandleRunReportRoute(req: IncomingMessage, res: ServerResponse): boolean {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return false;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const match = url.pathname.match(/^\/api\/run-reports\/([^/]+)\/ctrf\.json$/);
  if (!match) {
    return false;
  }

  const runId = match[1]!;
  if (!RUN_ID_RE.test(runId)) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Invalid run id");
    return true;
  }

  const filePath = runCtrfPath(runId);
  if (!existsSync(filePath)) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Report not found");
    return true;
  }

  if (req.method === "HEAD") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end();
    return true;
  }

  const body = readFileSync(filePath);
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(body);
  return true;
}
