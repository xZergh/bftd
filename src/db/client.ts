import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export type DatabaseHandle = {
  db: BetterSQLite3Database;
  sqlite: Database.Database;
  path: string;
  close: () => void;
};

export function openDatabase(dbPath: string): DatabaseHandle {
  const path = resolve(dbPath);
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  return {
    db: drizzle(sqlite),
    sqlite,
    path,
    close: () => sqlite.close()
  };
}

/** @deprecated Prefer openDatabase when the SQLite connection must be closed (e.g. runtime switch). */
export function createDb(dbPath: string) {
  return openDatabase(dbPath).db;
}
