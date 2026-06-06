/** Placeholders aligned with scripts/seed-demo-qa-project.ts (DEMO-QA). */
export const demoPlaceholders = {
  requirement: {
    externalKey: "DEMO-R4",
    title: "Password reset sends a single-use link",
    status: "draft",
    priority: "medium",
    requirementType: "functional",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    tags: "demo, auth"
  },
  testCase: {
    title: "Manual: successful login with valid credentials",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  },
  plan: {
    name: "Demo regression - staging",
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1",
    description: "Staging regression slice for release 1.0"
  }
} as const;

export function parseCommaTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function formatCommaTags(tags: string[] | null | undefined): string {
  return (tags ?? []).join(", ");
}
