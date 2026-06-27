import { join, resolve } from "node:path";

export type DatabaseProfile = {
  id: string;
  label: string;
  description: string;
  fileName: string;
};

export const DATABASE_PROFILES: DatabaseProfile[] = [
  {
    id: "tcms",
    label: "TCMS",
    description: "Your project database (isolated from demo data)",
    fileName: "tcms.sqlite"
  },
  {
    id: "demo",
    label: "Demo",
    description: "DEMO-QA sample project for exploration",
    fileName: "demo.sqlite"
  },
  {
    id: "plan-automation",
    label: "Plan automation sandbox",
    description: "Disposable DB for Playwright runs (Run linked automation); not your project DB",
    fileName: "plan-automation.sqlite"
  }
];

export const DEFAULT_DATABASE_PROFILE_ID = "tcms";

export function resolveDatabasePath(profileId: string, cwd: string = process.cwd()): string {
  const profile = DATABASE_PROFILES.find((p) => p.id === profileId);
  if (profile === undefined) {
    throw new Error(`Unknown database profile: ${profileId}`);
  }
  return join(cwd, "data", profile.fileName);
}

export function profileIdFromPath(dbPath: string, cwd: string = process.cwd()): string | null {
  const normalized = resolve(dbPath);
  for (const profile of DATABASE_PROFILES) {
    if (resolve(resolveDatabasePath(profile.id, cwd)) === normalized) {
      return profile.id;
    }
  }
  return null;
}

export function getDatabaseProfile(profileId: string): DatabaseProfile | undefined {
  return DATABASE_PROFILES.find((p) => p.id === profileId);
}
