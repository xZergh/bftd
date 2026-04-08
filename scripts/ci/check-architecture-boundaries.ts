import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const repoRoot = join(__dirname, "..", "..");

function walkTsFiles(dir: string, acc: string[]) {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkTsFiles(full, acc);
    } else if (stat.isFile() && entry.endsWith(".ts")) {
      acc.push(full);
    }
  }
}

/** import/export ... from "..." */
const FROM_SPEC_RE = /(?:import|export)\s+[^;]*?\s+from\s+['"]([^'"]+)['"]/g;

function specsInSource(content: string): string[] {
  const out: string[] = [];
  let m: RegExpExecArray | null;
  const re = new RegExp(FROM_SPEC_RE.source, "g");
  while ((m = re.exec(content)) !== null) {
    out.push(m[1]);
  }
  return out;
}

function pathMentionsLayer(spec: string, layer: "db" | "domain" | "graphql"): boolean {
  const norm = spec.replace(/\\/g, "/");
  if (layer === "db") {
    return (
      norm === "db" ||
      norm.startsWith("db/") ||
      norm.includes("/db/") ||
      norm.endsWith("/db")
    );
  }
  if (layer === "domain") {
    return norm.includes("/domain/") || norm.startsWith("../domain/") || /^\.{1,2}\/domain\//.test(norm);
  }
  if (layer === "graphql") {
    return norm.includes("/graphql/") || /^\.{1,2}\/graphql\//.test(norm);
  }
  return false;
}

function main() {
  const graphqlDir = join(repoRoot, "src", "graphql");
  const domainServicesDir = join(repoRoot, "src", "domain", "services");
  const dbDir = join(repoRoot, "src", "db");

  const graphqlFiles: string[] = [];
  const domainServiceFiles: string[] = [];
  const dbFiles: string[] = [];

  walkTsFiles(graphqlDir, graphqlFiles);
  walkTsFiles(domainServicesDir, domainServiceFiles);
  walkTsFiles(dbDir, dbFiles);

  const violations: string[] = [];

  for (const file of graphqlFiles) {
    const content = readFileSync(file, "utf8");
    for (const spec of specsInSource(content)) {
      if (pathMentionsLayer(spec, "db")) {
        violations.push(`${relative(repoRoot, file)}: GraphQL layer must not import db (${spec})`);
      }
    }
  }

  for (const file of domainServiceFiles) {
    const content = readFileSync(file, "utf8");
    for (const spec of specsInSource(content)) {
      if (pathMentionsLayer(spec, "graphql")) {
        violations.push(`${relative(repoRoot, file)}: domain/services must not import graphql (${spec})`);
      }
    }
  }

  for (const file of dbFiles) {
    const content = readFileSync(file, "utf8");
    for (const spec of specsInSource(content)) {
      if (pathMentionsLayer(spec, "domain")) {
        violations.push(`${relative(repoRoot, file)}: db layer must not import domain (${spec})`);
      }
    }
  }

  if (violations.length > 0) {
    console.error("Architecture boundary violations:\n");
    for (const v of violations) console.error(`  - ${v}`);
    process.exit(1);
  }

  console.log("Architecture boundary check passed.");
}

main();
