/**
 * Seeds a demo project with requirements, manual/automated tests, links, and a sample run.
 * Uses the same domain layer as the GraphQL API. Safe to re-run: skips if project key exists.
 *
 * Usage (from repo root):
 *   npx tsx scripts/seed-demo-qa-project.ts
 *
 * Optional: DB_PATH=./data/custom.sqlite npx tsx scripts/seed-demo-qa-project.ts
 */
import { join } from "node:path";
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { TcmsService } from "../src/domain/service";

const DEMO_KEY = "DEMO-QA";

async function main() {
  const dbPath = process.env.DB_PATH ?? join(process.cwd(), "data", "tcms.sqlite");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);

  const projects = await service.listProjects({ includeArchived: true });
  if (projects.some((p) => p.key === DEMO_KEY)) {
    console.log(`Project with key "${DEMO_KEY}" already exists; skipping seed.`);
    return;
  }

  const project = await service.createProject("Demo QA sample workspace", DEMO_KEY);
  const projectId = project.id;

  const r1 = await service.createRequirement({
    projectId,
    externalKey: "DEMO-R1",
    title: "User can sign in with email and password",
    description: "Covers primary authentication for the web client.",
    status: "approved",
    priority: "high",
    tags: ["demo", "auth"],
    requirementType: "functional"
  });
  const r2 = await service.createRequirement({
    projectId,
    externalKey: "DEMO-R2",
    title: "Session expires after configured idle timeout",
    description: "Security requirement for idle logout.",
    status: "draft",
    priority: "medium",
    tags: ["demo", "security"],
    requirementType: "nonfunctional"
  });
  const r3 = await service.createRequirement({
    projectId,
    externalKey: "DEMO-R3",
    title: "Password reset sends a single-use link",
    description: "Self-service recovery flow.",
    status: "in_progress",
    priority: "high",
    tags: ["demo", "auth"],
    requirementType: "functional"
  });

  const manualLogin = await service.createManualTestCase({
    projectId,
    title: "Manual: successful login with valid credentials",
    requirementIds: [r1.id],
    steps: [
      { name: "Open sign-in page", expectedResult: "Email and password fields visible" },
      { name: "Enter valid credentials and submit", expectedResult: "User lands on home dashboard" }
    ],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  });

  const manualTimeout = await service.createManualTestCase({
    projectId,
    title: "Manual: idle timeout logs user out",
    requirementIds: [r2.id],
    steps: [
      { name: "Sign in and remain idle past timeout", expectedResult: "Session ends; sign-in required" }
    ],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  });

  const manualReset = await service.createManualTestCase({
    projectId,
    title: "Manual: password reset happy path",
    requirementIds: [r3.id],
    steps: [
      { name: "Request reset for known email", expectedResult: "Confirmation message shown" },
      { name: "Open reset link and set new password", expectedResult: "Can sign in with new password" }
    ],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-2"
  });

  const automatedAuth = await service.createAutomatedTestCase({
    projectId,
    title: "API: token exchange returns access token",
    manualTestCaseIds: [manualLogin.id],
    releaseLabel: "1.0",
    sprintLabel: "Sprint-1"
  });

  const run = await service.createTestRun({
    projectId,
    name: "Demo regression — staging",
    environment: "staging",
    buildVersion: "demo-1.0.0",
    trigger: "seed-script"
  });

  await service.submitTestResult({
    runId: run.id,
    testCaseId: manualLogin.id,
    status: "passed",
    durationMs: 1200
  });
  await service.submitTestResult({
    runId: run.id,
    testCaseId: manualTimeout.id,
    status: "failed",
    durationMs: 800
  });
  await service.submitTestResult({
    runId: run.id,
    testCaseId: manualReset.id,
    status: "skipped",
    durationMs: 0
  });
  await service.submitTestResult({
    runId: run.id,
    testCaseId: automatedAuth.id,
    status: "passed",
    durationMs: 340
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        dbPath,
        projectId,
        projectKey: DEMO_KEY,
        requirementIds: [r1.id, r2.id, r3.id],
        manualTestCaseIds: [manualLogin.id, manualTimeout.id, manualReset.id],
        automatedTestCaseId: automatedAuth.id,
        runId: run.id
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
