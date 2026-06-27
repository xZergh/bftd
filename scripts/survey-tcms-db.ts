import Database from "better-sqlite3";

const dbPath = process.argv[2] ?? "data/tcms.sqlite";
const db = new Database(dbPath, { readonly: true });

const projects = db.prepare("SELECT id, name, created_at FROM projects ORDER BY created_at").all();
console.log(`=== PROJECTS (${projects.length}) ===`);
for (const p of projects) {
  console.log(JSON.stringify(p));
}

const counts = db
  .prepare(
    `SELECT p.name as project,
      (SELECT COUNT(*) FROM requirements r WHERE r.project_id = p.id) as requirements,
      (SELECT COUNT(*) FROM test_cases tc WHERE tc.project_id = p.id) as test_cases,
      (SELECT COUNT(*) FROM test_runs tr WHERE tr.project_id = p.id) as runs,
      (SELECT COUNT(*) FROM test_plans tp WHERE tp.project_id = p.id) as plans
    FROM projects p ORDER BY p.name`
  )
  .all();
console.log("\n=== COUNTS BY PROJECT ===");
console.table(counts);

const recentRuns = db
  .prepare("SELECT id, name, project_id, created_at FROM test_runs ORDER BY created_at DESC LIMIT 20")
  .all();
console.log("\n=== RECENT RUNS ===");
for (const r of recentRuns) {
  console.log(JSON.stringify(r));
}

const orphanish = db
  .prepare(
    `SELECT tc.id, tc.title, tc.type, tc.external_id, p.name as project
     FROM test_cases tc
     JOIN projects p ON p.id = tc.project_id
     WHERE tc.title GLOB '*[Tt]est*' OR tc.title GLOB '*junk*' OR tc.title GLOB '*tmp*' OR tc.title GLOB '*delete*'
     ORDER BY tc.created_at DESC
     LIMIT 40`
  )
  .all();
console.log("\n=== POSSIBLE JUNK TEST CASES (title heuristic) ===");
for (const r of orphanish) {
  console.log(JSON.stringify(r));
}

const projectId = process.argv[3];

if (projectId) {
  console.log(`\n=== DETAIL FOR PROJECT ${projectId} ===`);
  const reqs = db
    .prepare("SELECT id, title, created_at FROM requirements WHERE project_id = ? ORDER BY created_at")
    .all(projectId);
  console.log(`Requirements (${reqs.length}):`);
  for (const r of reqs) console.log(JSON.stringify(r));

  const cases = db
    .prepare("SELECT id, title, type, external_id, created_at FROM test_cases WHERE project_id = ? ORDER BY created_at")
    .all(projectId);
  console.log(`\nTest cases (${cases.length}):`);
  for (const c of cases) console.log(JSON.stringify(c));

  const plans = db
    .prepare("SELECT id, name, created_at FROM test_plans WHERE project_id = ? ORDER BY created_at")
    .all(projectId);
  console.log(`\nPlans (${plans.length}):`);
  for (const p of plans) console.log(JSON.stringify(p));

  const runs = db
    .prepare("SELECT id, name, created_at FROM test_runs WHERE project_id = ? ORDER BY created_at DESC")
    .all(projectId);
  console.log(`\nRuns (${runs.length}):`);
  for (const r of runs) console.log(JSON.stringify(r));
}

db.close();
