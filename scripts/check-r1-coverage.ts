/**
 * Reports TCMS-R1 requirement coverage (linked manual test cases).
 *
 * Usage: npm run check:r1-coverage
 */
import { createDb } from "../src/db/client";
import { initSqlite } from "../src/db/init";
import { resolveDatabasePath } from "../src/db/registry";
import { TcmsService } from "../src/domain/service";
import { TCMS_PROJECT_KEY, TCMS_REQUIREMENT_KEYS } from "../src/seed/tcms-project-constants";
import { TCMS_R1_MANUAL_TEST_TITLES } from "../src/seed/tcms-r1-test-cases";
import { slugifyProjectKey } from "../src/domain/services/projects";

async function main() {
  const dbPath = process.env.DB_PATH ?? resolveDatabasePath("tcms");
  initSqlite(dbPath);
  const db = createDb(dbPath);
  const service = new TcmsService(db);

  const projects = await service.listProjects({ includeArchived: true });
  const project = projects.find((p) => p.key === slugifyProjectKey(TCMS_PROJECT_KEY));
  if (!project) {
    console.log("TCMS project not found");
    return;
  }

  const requirements = await service.listRequirements({ projectId: project.id });
  const r1 = requirements.find((r) => r.externalKey === TCMS_REQUIREMENT_KEYS.R1);
  if (!r1) {
    console.log("TCMS-R1 not found");
    return;
  }

  const testCases = await service.listTestCases({ projectId: project.id, type: "manual", includeDeleted: true });
  const r1TitleSet = new Set(Object.values(TCMS_R1_MANUAL_TEST_TITLES));
  const r1ManualTests = testCases
    .filter((tc) => r1TitleSet.has(tc.title))
    .map((tc) => ({
      id: tc.id,
      title: tc.title,
      linkedRequirementCount: tc.linkedRequirementCount,
      isDeleted: tc.isDeleted
    }));

  console.log(
    JSON.stringify(
      {
        requirement: {
          id: r1.id,
          externalKey: r1.externalKey,
          title: r1.title,
          description: r1.description,
          linkedManualTestCaseCount: r1.linkedManualTestCaseCount
        },
        r1ManualTests,
        coverage: {
          manualTestsLinkedToR1: r1.linkedManualTestCaseCount,
          r1SeedTestsPresent: r1ManualTests.length,
          r1SeedTestsExpected: r1TitleSet.size,
          manualTestsInProject: testCases.length
        }
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
