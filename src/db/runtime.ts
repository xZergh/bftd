import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { openDatabase, type DatabaseHandle } from "./client";
import { initSqlite } from "./init";
import {
  DEFAULT_DATABASE_PROFILE_ID,
  getDatabaseProfile,
  profileIdFromPath,
  resolveDatabasePath
} from "./registry";
import { TcmsService } from "../domain/service";

export class AppRuntime {
  private handle: DatabaseHandle;
  private _service: TcmsService;
  private _profileId: string | null;

  constructor(dbPath: string) {
    initSqlite(dbPath);
    this.handle = openDatabase(dbPath);
    this._service = new TcmsService(this.handle.db);
    this._profileId = profileIdFromPath(dbPath);
  }

  get service(): TcmsService {
    return this._service;
  }

  get db(): BetterSQLite3Database {
    return this.handle.db;
  }

  get dbPath(): string {
    return this.handle.path;
  }

  get profileId(): string | null {
    return this._profileId;
  }

  switchToProfile(profileId: string): void {
    const profile = getDatabaseProfile(profileId);
    if (profile === undefined) {
      throw new Error(`Unknown database profile: ${profileId}`);
    }
    this.switchToPath(resolveDatabasePath(profileId), profileId);
  }

  switchToPath(dbPath: string, profileId: string | null = profileIdFromPath(dbPath)): void {
    if (dbPath === this.handle.path) {
      this._profileId = profileId;
      return;
    }
    this.handle.close();
    initSqlite(dbPath);
    this.handle = openDatabase(dbPath);
    this._service = new TcmsService(this.handle.db);
    this._profileId = profileId;
  }

  static createDefault(cwd: string = process.cwd(), envDbPath?: string): AppRuntime {
    if (envDbPath !== undefined && envDbPath !== "") {
      return new AppRuntime(envDbPath);
    }
    return new AppRuntime(resolveDatabasePath(DEFAULT_DATABASE_PROFILE_ID, cwd));
  }
}
