import type { IncomingMessage, ServerResponse } from "node:http";
import { DATABASE_PROFILES } from "../db/registry";
import type { AppRuntime } from "../db/runtime";

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (raw === "") {
    return {};
  }
  return JSON.parse(raw) as unknown;
}

export async function tryHandleDbRoute(
  req: IncomingMessage,
  res: ServerResponse,
  runtime: AppRuntime
): Promise<boolean> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  if (url.pathname === "/health" && req.method === "GET") {
    sendJson(res, 200, {
      ok: true,
      dbPath: runtime.dbPath,
      profileId: runtime.profileId
    });
    return true;
  }

  if (url.pathname === "/api/databases" && req.method === "GET") {
    sendJson(res, 200, {
      activeProfileId: runtime.profileId,
      activeDbPath: runtime.dbPath,
      profiles: DATABASE_PROFILES.map((p) => ({
        id: p.id,
        label: p.label,
        description: p.description
      }))
    });
    return true;
  }

  if (url.pathname === "/api/databases/switch" && req.method === "POST") {
    try {
      const body = (await readJsonBody(req)) as { id?: unknown };
      if (typeof body.id !== "string" || body.id === "") {
        sendJson(res, 400, { ok: false, error: "Missing database profile id" });
        return true;
      }
      runtime.switchToProfile(body.id);
      sendJson(res, 200, {
        ok: true,
        profileId: runtime.profileId,
        dbPath: runtime.dbPath
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to switch database";
      sendJson(res, 400, { ok: false, error: message });
    }
    return true;
  }

  return false;
}
