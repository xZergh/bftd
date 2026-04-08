import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function run(cmd: string, args: string[]) {
  const bin = process.platform === "win32" && cmd === "npm" ? "npm.cmd" : cmd;
  return spawnSync(bin, args, { stdio: "inherit" });
}

function main() {
  console.log("Running non-blocking security checks...");
  const audit = run("npm", ["audit", "--audit-level=high"]);
  if (audit.status !== 0) {
    console.warn("npm audit reported issues (non-blocking mode).");
  }

  // Minimal secret pattern scan on source/docs; intentionally non-blocking in MVP hardening phase.
  const patterns = [/AKIA[0-9A-Z]{16}/, /-----BEGIN PRIVATE KEY-----/, /xox[baprs]-/];
  const scanRoots = ["src", "tests", "docs"];
  const findings: string[] = [];

  function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (stat.isFile()) {
        const content = readFileSync(full, "utf8");
        for (const p of patterns) {
          if (p.test(content)) {
            findings.push(full);
            break;
          }
        }
      }
    }
  }

  for (const root of scanRoots) {
    try {
      walk(root);
    } catch {
      // Ignore missing directories.
    }
  }
  if (findings.length > 0) {
    console.warn("Potential secret patterns found (non-blocking mode):");
    for (const f of findings) console.warn(` - ${f}`);
  } else {
    console.log("No obvious secret patterns found.");
  }

  console.log("Security checks completed (non-blocking).");
}

main();
