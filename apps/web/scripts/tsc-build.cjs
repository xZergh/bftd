"use strict";

/**
 * Runs the workspace-local TypeScript compiler without relying on a global `tsc`
 * or on `node_modules/.bin` being on PATH (Windows + npm workspaces can omit it
 * when npm invokes scripts via cmd.exe).
 */
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const webRoot = path.resolve(__dirname, "..");
/** Monorepo root (…/tcms), one level above `apps/`. */
const repoRoot = path.resolve(__dirname, "../..", "..");

let tscMain;
try {
  tscMain = require.resolve("typescript/lib/tsc.js", { paths: [webRoot, repoRoot] });
} catch {
  console.error(
    'Cannot find the "typescript" package. From the repo root run: npm install\n' +
      "(workspaces hoist devDependencies; typescript may live under the repo root node_modules)."
  );
  process.exit(1);
}

const result = spawnSync(process.execPath, [tscMain, "-b"], {
  stdio: "inherit",
  cwd: webRoot,
  env: process.env
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status === null ? 1 : result.status);
