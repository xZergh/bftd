export const ACTIVE_DATABASE_STORAGE_KEY = "tcms.activeDatabaseId";

export type DatabaseProfileInfo = {
  id: string;
  label: string;
  description: string;
};

export type DatabasesResponse = {
  activeProfileId: string | null;
  activeDbPath: string;
  profiles: DatabaseProfileInfo[];
};

export async function fetchDatabases(): Promise<DatabasesResponse> {
  const res = await fetch("/api/databases");
  if (!res.ok) {
    throw new Error(`Failed to load databases (${res.status})`);
  }
  return (await res.json()) as DatabasesResponse;
}

export async function switchDatabase(profileId: string): Promise<void> {
  const res = await fetch("/api/databases/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: profileId })
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Failed to switch database (${res.status})`);
  }
}
