/**
 * Prepares isolated project (tcms) and demo SQLite files under data/.
 *
 * - demo.sqlite: seeded with DEMO-QA when missing
 * - tcms.sqlite: empty schema for your project work
 * - plan-automation.sqlite: use `npm run seed:plan-automation-db` (automation sandbox; not created here)
 * - Legacy: if only tcms.sqlite exists with demo data, copies it to demo.sqlite first
 */
import { copyFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import Database from "better-sqlite3";
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { resolveDatabasePath } from "../src/db/registry";
import { TcmsService } from "../src/domain/service";
import { seedDemoQaProject } from "../src/seed/demo-qa-seed";

const cwd = process.cwd();
const tcmsPath = resolveDatabasePath("tcms", cwd);
const demoPath = resolveDatabasePath("demo", cwd);

function resetTcmsDatabase() {
  try {
    for (const suffix of ["", "-wal", "-shm"]) {
      const p = `${tcmsPath}${suffix}`;
      if (existsSync(p)) {
        unlinkSync(p);
      }
    }
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "EBUSY" || code === "EPERM") {
      throw new Error(
        `Cannot reset ${tcmsPath}: file is in use. Stop the TCMS API (npm run dev:api) and run db:init again.`
      );
    }
    throw err;
  }
  initSqlite(tcmsPath);
  createDb(tcmsPath);
  console.log(`Reset project database to empty schema at ${tcmsPath}`);
}

function databaseHasDemoQa(dbPath: string): boolean {
  if (!existsSync(dbPath)) {
    return false;
  }
  const sqlite = new Database(dbPath, { readonly: true });
  try {
    const row = sqlite.prepare("SELECT 1 AS ok FROM projects WHERE key = ? LIMIT 1").get("demo-qa");
    return row !== undefined;
  } finally {
    sqlite.close();
  }
}

async function maybeSplitLegacyTcms() {
  if (!existsSync(tcmsPath)) {
    return false;
  }
  if (!existsSync(demoPath) && databaseHasDemoQa(tcmsPath)) {
    copySqliteBundle(tcmsPath, demoPath);
    console.log(`Migrated legacy demo data from tcms.sqlite to ${demoPath}`);
    return true;
  }
  if (existsSync(demoPath) && databaseHasDemoQa(tcmsPath) && databaseHasDemoQa(demoPath)) {
    resetTcmsDatabase();
    return false;
  }
  return false;
}
function copySqliteBundle(from: string, to: string) {
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  for (const suffix of ["-wal", "-shm"]) {
    const src = `${from}${suffix}`;
    if (existsSync(src)) {
      copyFileSync(src, `${to}${suffix}`);
    }
  }
}

function ensureEmptyTcms() {
  if (!existsSync(tcmsPath)) {
    initSqlite(tcmsPath);
    createDb(tcmsPath);
    console.log(`Created empty project database at ${tcmsPath}`);
    return;
  }
  console.log(`Project database already exists at ${tcmsPath}`);
}

async function ensureDemo(skipSeed = false) {
  if (skipSeed) {
    console.log(`Demo database ready at ${demoPath}`);
    return;
  }

  if (!existsSync(demoPath)) {
    initSqlite(demoPath);
    const db = createDb(demoPath);
    const service = new TcmsService(db);
    const manifest = await seedDemoQaProject(service, { skipIfExists: false });
    console.log(`Seeded demo database at ${demoPath}`, manifest?.projectKey ?? "");
    return;
  }

  initSqlite(demoPath);
  const db = createDb(demoPath);
  const service = new TcmsService(db);
  const manifest = await seedDemoQaProject(service, { skipIfExists: true });
  if (manifest === null) {
    console.log(`Demo database already seeded at ${demoPath}`);
  } else {
    console.log(`Seeded demo database at ${demoPath}`, manifest.projectKey);
  }
}

async function main() {
  mkdirSync(join(cwd, "data"), { recursive: true });

  let migratedLegacy = await maybeSplitLegacyTcms();

  await ensureDemo(migratedLegacy);

  if (migratedLegacy) {
    resetTcmsDatabase();
  } else {
    ensureEmptyTcms();
  }

  console.log(JSON.stringify({ ok: true, tcmsPath, demoPath }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
