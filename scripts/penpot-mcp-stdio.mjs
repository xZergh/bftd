/**
 * Cursor MCP stdio entry for Penpot (hosted): reads PENPOT_MCP_USER_TOKEN from
 * workspace .env.local only (does not use OS env for that variable), then spawns
 * mcp-remote against design.penpot.app. Cursor docs: remote HTTP servers do not
 * support envFile; stdio + this script bridges .env.local → Penpot stream URL.
 */
import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const envPath = join(root, ".env.local");

function readTokenFromEnvLocal() {
  if (!existsSync(envPath)) {
    console.error(`penpot-mcp-stdio: missing ${envPath}`);
    process.exit(1);
  }
  const text = readFileSync(envPath, "utf8");
  const prefix = "PENPOT_MCP_USER_TOKEN=";
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    if (t.startsWith(prefix)) {
      let v = t.slice(prefix.length).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      return v;
    }
  }
  console.error(
    "penpot-mcp-stdio: PENPOT_MCP_USER_TOKEN= not found in .env.local"
  );
  process.exit(1);
}

const token = readTokenFromEnvLocal();
if (!token) {
  console.error("penpot-mcp-stdio: PENPOT_MCP_USER_TOKEN is empty in .env.local");
  process.exit(1);
}

const url = `https://design.penpot.app/mcp/stream?userToken=${encodeURIComponent(token)}`;

const child = spawn("npx", ["-y", "mcp-remote", url, "--transport", "http-only"], {
  stdio: "inherit",
  shell: true,
  cwd: root,
  env: process.env
});

child.on("error", (err) => {
  console.error("penpot-mcp-stdio:", err.message);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 0);
});
