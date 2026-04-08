/**
 * Ensures SQLite index names in `src/db/init.ts` match Drizzle `src/db/schema.ts`.
 * Catches drift when one side is updated without the other (A9 / migration hygiene).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "..", "..");

function extractFromSchema(content: string): { unique: Set<string>; nonUnique: Set<string> } {
  const unique = new Set<string>();
  const nonUnique = new Set<string>();
  const uRe = /uniqueIndex\("([^"]+)"\)/g;
  const iRe = /\bindex\("([^"]+)"\)/g;
  let m: RegExpExecArray | null;
  while ((m = uRe.exec(content)) !== null) {
    unique.add(m[1]);
  }
  while ((m = iRe.exec(content)) !== null) {
    nonUnique.add(m[1]);
  }
  return { unique, nonUnique };
}

function extractFromInit(content: string): { unique: Set<string>; nonUnique: Set<string> } {
  const unique = new Set<string>();
  const nonUnique = new Set<string>();
  const re = /CREATE\s+(UNIQUE\s+)?INDEX\s+IF\s+NOT\s+EXISTS\s+(\w+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    const name = m[2];
    if (m[1]) {
      unique.add(name);
    } else {
      nonUnique.add(name);
    }
  }
  return { unique, nonUnique };
}

function diff(a: Set<string>, b: Set<string>, label: string): string[] {
  const out: string[] = [];
  for (const x of a) {
    if (!b.has(x)) {
      out.push(`  - ${label} only in first set: ${x}`);
    }
  }
  for (const x of b) {
    if (!a.has(x)) {
      out.push(`  - ${label} only in second set: ${x}`);
    }
  }
  return out;
}

function main() {
  const schemaPath = join(repoRoot, "src", "db", "schema.ts");
  const initPath = join(repoRoot, "src", "db", "init.ts");
  const schema = extractFromSchema(readFileSync(schemaPath, "utf8"));
  const init = extractFromInit(readFileSync(initPath, "utf8"));

  const problems: string[] = [];
  problems.push(...diff(schema.unique, init.unique, "UNIQUE index name"));
  problems.push(...diff(schema.nonUnique, init.nonUnique, "non-unique index name"));

  if (problems.length > 0) {
    console.error("Schema/init SQLite index name mismatch:\n" + problems.join("\n"));
    process.exit(1);
  }
  console.log("OK: src/db/schema.ts indexes match src/db/init.ts");
}

main();
