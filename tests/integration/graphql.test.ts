import { describe, expect, it } from "vitest";
import request from "supertest";
import { mkdtempSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createApp } from "../../src/app";

describe("GraphQL integration", () => {
  it("creates project and returns summary", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tcms-int-"));
    const { server } = createApp(join(dir, "db.sqlite"));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const agent = request(server);

    const createProjectMutation = {
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id name } error { code message fixHint } }
      }`,
      variables: { input: { name: "App A" } }
    };
    const pRes = await agent.post("/graphql").send(createProjectMutation);
    const projectId = pRes.body.data.createProject.project.id as string;
    expect(projectId).toBeTruthy();

    const summaryQuery = {
      query: `query($projectId: ID!) {
        projectSummary(projectId: $projectId) { totalRequirements totalManualCases totalAutomatedCases }
      }`,
      variables: { projectId }
    };
    const sRes = await agent.post("/graphql").send(summaryQuery);
    expect(sRes.body.data.projectSummary).toEqual({
      totalRequirements: 0,
      totalManualCases: 0,
      totalAutomatedCases: 0
    });

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("returns deterministic fixHint for invalid manual testcase creation", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tcms-int-"));
    const { server } = createApp(join(dir, "db.sqlite"));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const agent = request(server);

    const pRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "App B" } }
    });
    const projectId = pRes.body.data.createProject.project.id;

    const res = await agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) {
          testCase { id }
          error { code message fixHint }
        }
      }`,
      variables: {
        input: { projectId, title: "Manual bad", requirementIds: [] }
      }
    });

    expect(res.body.data.createManualTestCase.testCase).toBeNull();
    expect(res.body.data.createManualTestCase.error.code).toBe("REQUIREMENT_PARENT_REQUIRED");
    expect(res.body.data.createManualTestCase.error.fixHint).toContain("requirement id");

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("captures run traceability snapshot and serves snapshot-backed report", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tcms-int-"));
    const { server } = createApp(join(dir, "db.sqlite"));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const agent = request(server);

    const projectRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "App C" } }
    });
    const projectId = projectRes.body.data.createProject.project.id as string;

    const reqRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } error { code message fixHint } }
      }`,
      variables: { input: { projectId, externalKey: "APP-1", title: "Req1" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    const manualRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } error { code } }
      }`,
      variables: { input: { projectId, title: "Manual 1", requirementIds: [requirementId] } }
    });
    const manualId = manualRes.body.data.createManualTestCase.testCase.id as string;

    const autoRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) {
        createAutomatedTestCase(input: $input) { testCase { id } error { code } }
      }`,
      variables: { input: { projectId, title: "Auto 1", manualTestCaseIds: [manualId] } }
    });
    const autoId = autoRes.body.data.createAutomatedTestCase.testCase.id as string;
    expect(autoId).toBeTruthy();

    const runRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) {
        createTestRun(input: $input) { run { id projectId name } error { code message fixHint } }
      }`,
      variables: { input: { projectId, name: "Run 1" } }
    });
    const runId = runRes.body.data.createTestRun.run.id as string;

    const reportBefore = await agent.post("/graphql").send({
      query: `query($runId: ID!) {
        runTraceabilityReport(runId: $runId) {
          runId
          edges { requirementId manualTestCaseId automatedTestCaseId }
        }
      }`,
      variables: { runId }
    });
    expect(reportBefore.body.data.runTraceabilityReport.edges.length).toBe(1);

    const resultRes = await agent.post("/graphql").send({
      query: `mutation($input: SubmitTestResultInput!) {
        submitTestResult(input: $input) {
          result { runId testCaseId status durationMs }
          error { code message fixHint }
        }
      }`,
      variables: {
        input: { runId, testCaseId: autoId, status: "passed", durationMs: 1234 }
      }
    });
    expect(resultRes.body.data.submitTestResult.result.status).toBe("passed");
    expect(resultRes.body.data.submitTestResult.result.durationMs).toBe(1234);

    await agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) {
        createAutomatedTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Auto 2", manualTestCaseIds: [manualId] } }
    });

    const reportAfter = await agent.post("/graphql").send({
      query: `query($runId: ID!) {
        runTraceabilityReport(runId: $runId) {
          runId
          edges { requirementId manualTestCaseId automatedTestCaseId }
        }
      }`,
      variables: { runId }
    });
    expect(reportAfter.body.data.runTraceabilityReport.edges.length).toBe(1);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("imports Agile requirements with idempotent upsert", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tcms-int-"));
    const { server } = createApp(join(dir, "db.sqlite"));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const agent = request(server);

    const pRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "Import App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const payload = {
      query: `mutation($input: ImportRequirementsInput!) {
        importRequirements(input: $input) {
          createdCount
          updatedCount
          skippedCount
          errors { code message fixHint }
          warnings { index message }
        }
      }`,
      variables: {
        input: {
          projectId,
          requirements: [
            { externalKey: "APP-10", title: "Req 10", description: "A" },
            { externalKey: "APP-11", title: "Req 11" }
          ]
        }
      }
    };

    const first = await agent.post("/graphql").send(payload);
    expect(first.body.data.importRequirements.createdCount).toBe(2);
    expect(first.body.data.importRequirements.updatedCount).toBe(0);
    expect(first.body.data.importRequirements.warnings.length).toBe(1);

    const second = await agent.post("/graphql").send(payload);
    expect(second.body.data.importRequirements.createdCount).toBe(0);
    expect(second.body.data.importRequirements.updatedCount).toBe(2);
    expect(second.body.data.importRequirements.skippedCount).toBe(0);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("imports TRR automated tests with identity fallback and deterministic errors", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tcms-int-"));
    const { server } = createApp(join(dir, "db.sqlite"));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const agent = request(server);

    const pRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "TRR App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const reqRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } }
      }`,
      variables: { input: { projectId, externalKey: "REQ-1", title: "Req 1" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    const manualRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Manual for TRR", requirementIds: [requirementId] } }
    });
    const manualId = manualRes.body.data.createManualTestCase.testCase.id as string;

    const mutation = `mutation($input: ImportAutomatedFromTrrInput!) {
      importAutomatedFromTrr(input: $input) {
        createdCount
        updatedCount
        skippedCount
        errors { code message fixHint }
      }
    }`;

    const invalid = await agent.post("/graphql").send({
      query: mutation,
      variables: {
        input: {
          projectId,
          automatedTests: [{ title: "Missing identity", linkedManualCaseIds: [manualId], steps: [] }]
        }
      }
    });
    expect(invalid.body.data.importAutomatedFromTrr.skippedCount).toBe(1);
    expect(invalid.body.data.importAutomatedFromTrr.errors[0].code).toBe("TRR_IMPORT_INVALID");

    const first = await agent.post("/graphql").send({
      query: mutation,
      variables: {
        input: {
          projectId,
          automatedTests: [
            {
              externalId: "AUTO-EXT-1",
              title: "Imported Auto",
              linkedManualCaseIds: [manualId],
              steps: [{ order: 1, name: "Open page", expectedResult: "Loaded" }]
            }
          ]
        }
      }
    });
    expect(first.body.data.importAutomatedFromTrr.createdCount).toBe(1);

    const second = await agent.post("/graphql").send({
      query: mutation,
      variables: {
        input: {
          projectId,
          automatedTests: [
            {
              externalId: "AUTO-EXT-1",
              title: "Imported Auto v2",
              linkedManualCaseIds: [manualId],
              steps: [{ order: 1, name: "Open page v2", expectedResult: "Loaded v2" }]
            }
          ]
        }
      }
    });
    expect(second.body.data.importAutomatedFromTrr.createdCount).toBe(0);
    expect(second.body.data.importAutomatedFromTrr.updatedCount).toBe(1);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("returns formula-driven KPI dashboard with metadata alignment", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tcms-int-"));
    const { server } = createApp(join(dir, "db.sqlite"));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const agent = request(server);

    const pRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "KPI App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const req1 = await agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } }
      }`,
      variables: { input: { projectId, externalKey: "R-1", title: "Req 1" } }
    });
    const req2 = await agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id } }
      }`,
      variables: { input: { projectId, externalKey: "R-2", title: "Req 2" } }
    });
    const reqId1 = req1.body.data.createRequirement.requirement.id as string;
    const reqId2 = req2.body.data.createRequirement.requirement.id as string;

    const m1 = await agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Manual 1", requirementIds: [reqId1] } }
    });
    const m2 = await agent.post("/graphql").send({
      query: `mutation($input: CreateManualTestCaseInput!) {
        createManualTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Manual 2", requirementIds: [reqId2] } }
    });
    const manual1 = m1.body.data.createManualTestCase.testCase.id as string;
    const manual2 = m2.body.data.createManualTestCase.testCase.id as string;

    const auto = await agent.post("/graphql").send({
      query: `mutation($input: CreateAutomatedTestCaseInput!) {
        createAutomatedTestCase(input: $input) { testCase { id } }
      }`,
      variables: { input: { projectId, title: "Auto KPI", manualTestCaseIds: [manual1] } }
    });
    const autoId = auto.body.data.createAutomatedTestCase.testCase.id as string;

    const run = await agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) {
        createTestRun(input: $input) { run { id } }
      }`,
      variables: { input: { projectId, name: "KPI Run" } }
    });
    const runId = run.body.data.createTestRun.run.id as string;
    await agent.post("/graphql").send({
      query: `mutation($input: SubmitTestResultInput!) {
        submitTestResult(input: $input) { result { id } }
      }`,
      variables: { input: { runId, testCaseId: autoId, status: "passed", durationMs: 50 } }
    });

    const dash = await agent.post("/graphql").send({
      query: `query($input: KpiDashboardInput!) {
        kpiDashboard(input: $input) {
          projectId
          coverageFormulaInfo { formulaId label }
          current {
            totalRequirements
            totalManualCases
            totalTestRuns
            coverage { formulaId valuePct numerator denominator }
          }
          perRun { runId passRatePct totalTests }
          dailyTrend { date totalTestRuns coverage { formulaId valuePct } }
        }
      }`,
      variables: { input: { projectId } }
    });

    expect(dash.body.data.kpiDashboard.projectId).toBe(projectId);
    const formulas = dash.body.data.kpiDashboard.coverageFormulaInfo.map((f: { formulaId: string }) => f.formulaId);
    expect(formulas).toContain("requirement_coverage");
    expect(formulas).toContain("testcase_coverage");
    expect(formulas).toContain("automation_coverage_manual");
    expect(formulas).toContain("automation_coverage_requirement");

    const currentCoverage = dash.body.data.kpiDashboard.current.coverage;
    expect(currentCoverage.length).toBe(4);
    for (const c of currentCoverage) {
      expect(formulas).toContain(c.formulaId);
    }
    expect(dash.body.data.kpiDashboard.current.totalRequirements).toBe(2);
    expect(dash.body.data.kpiDashboard.current.totalManualCases).toBe(2);
    expect(dash.body.data.kpiDashboard.current.totalTestRuns).toBe(1);
    expect(dash.body.data.kpiDashboard.perRun.length).toBeGreaterThanOrEqual(1);

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });

  it("supports Penpot requirement link upsert/query/import idempotency", async () => {
    const dir = mkdtempSync(join(tmpdir(), "tcms-int-"));
    const { server } = createApp(join(dir, "db.sqlite"));
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const agent = request(server);

    const pRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) {
        createProject(input: $input) { project { id } }
      }`,
      variables: { input: { name: "Penpot App" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const reqRes = await agent.post("/graphql").send({
      query: `mutation($input: CreateRequirementInput!) {
        createRequirement(input: $input) { requirement { id externalKey } }
      }`,
      variables: { input: { projectId, externalKey: "PEN-1", title: "Pen Req" } }
    });
    const requirementId = reqRes.body.data.createRequirement.requirement.id as string;

    const upsertQuery = `mutation($input: RequirementDesignLinkInput!) {
      upsertRequirementDesignLink(input: $input) {
        link { id requirementId provider shareUrl title }
        error { code message fixHint }
      }
    }`;
    const linkInput = {
      projectId,
      requirementId,
      provider: "penpot",
      designProjectId: "penpot-proj-1",
      designFileId: "file-1",
      designPageId: "page-1",
      designNodeId: "node-1",
      shareUrl: "https://design.example/penpot/file-1?page=page-1&node=node-1",
      title: "Login screen"
    };

    const first = await agent.post("/graphql").send({
      query: upsertQuery,
      variables: { input: linkInput }
    });
    expect(first.body.data.upsertRequirementDesignLink.error).toBeNull();
    const firstId = first.body.data.upsertRequirementDesignLink.link.id as string;

    const second = await agent.post("/graphql").send({
      query: upsertQuery,
      variables: { input: { ...linkInput, title: "Login screen v2" } }
    });
    expect(second.body.data.upsertRequirementDesignLink.error).toBeNull();
    expect(second.body.data.upsertRequirementDesignLink.link.id).toBe(firstId);
    expect(second.body.data.upsertRequirementDesignLink.link.title).toBe("Login screen v2");

    const qRes = await agent.post("/graphql").send({
      query: `query($input: RequirementDesignLinksQueryInput!) {
        requirementDesignLinks(input: $input) { id requirementId provider shareUrl title }
      }`,
      variables: { input: { projectId, requirementId } }
    });
    expect(qRes.body.data.requirementDesignLinks.length).toBe(1);

    const importRes = await agent.post("/graphql").send({
      query: `mutation($input: ImportRequirementDesignLinksInput!) {
        importRequirementDesignLinks(input: $input) {
          createdCount
          updatedCount
          skippedCount
          errors { code message fixHint }
        }
      }`,
      variables: {
        input: {
          projectId,
          provider: "penpot",
          links: [
            {
              requirementKey: "PEN-1",
              designProjectId: "penpot-proj-1",
              designFileId: "file-1",
              designPageId: "page-1",
              designNodeId: "node-1",
              shareUrl: "https://design.example/penpot/file-1?page=page-1&node=node-1",
              title: "Login screen import"
            }
          ]
        }
      }
    });
    expect(importRes.body.data.importRequirementDesignLinks.createdCount).toBe(0);
    expect(importRes.body.data.importRequirementDesignLinks.updatedCount).toBe(1);
    expect(importRes.body.data.importRequirementDesignLinks.skippedCount).toBe(0);

    const invalidProvider = await agent.post("/graphql").send({
      query: upsertQuery,
      variables: {
        input: {
          ...linkInput,
          provider: "figma-free"
        }
      }
    });
    expect(invalidProvider.body.data.upsertRequirementDesignLink.error.code).toBe("VALIDATION_ERROR");

    await new Promise<void>((resolve, reject) =>
      server.close((err) => (err ? reject(err) : resolve()))
    );
  });
});
