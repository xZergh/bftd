import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export default async function globalSetup() {
  execSync("npm run e2e:reset-db", { cwd: repoRoot, stdio: "inherit", env: process.env });
}
