import { describe, expect, it } from "vitest";
import { createTestAgent } from "../helpers/test-app";

describe("GraphQL integration - KPI edge cases (E6)", () => {
  it("rejects invalid KPI date range on dashboard and recalculate", async () => {
    const t = await createTestAgent("tcms-kpi-edge-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "KPI Edge" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const dashBad = await t.agent.post("/graphql").send({
      query: `query($input: KpiDashboardInput!) { kpiDashboard(input: $input) { projectId } }`,
      variables: { input: { projectId, fromDate: "2026-04-10", toDate: "2026-04-01" } }
    });
    expect(dashBad.body.errors?.length).toBeGreaterThan(0);
    expect(dashBad.body.errors[0].message).toMatch(/fromDate|toDate|range|before/i);

    const recBad = await t.agent.post("/graphql").send({
      query: `mutation($input: RecalculateKpiInput!) {
        recalculateKpiSnapshots(input: $input) { projectId }
      }`,
      variables: { input: { projectId, fromDate: "2026-12-31", toDate: "2026-01-01" } }
    });
    expect(recBad.body.errors?.length).toBeGreaterThan(0);
    expect(recBad.body.errors[0].message).toMatch(/fromDate|toDate|range|before/i);

    await t.close();
  });

  it("run aggregate has zero total and pass rate with no results; daily trend dates are sorted", async () => {
    const t = await createTestAgent("tcms-kpi-edge-2-");
    const pRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateProjectInput!) { createProject(input: $input) { project { id } } }`,
      variables: { input: { name: "KPI Edge 2" } }
    });
    const projectId = pRes.body.data.createProject.project.id as string;

    const runRes = await t.agent.post("/graphql").send({
      query: `mutation($input: CreateTestRunInput!) { createTestRun(input: $input) { run { id } } }`,
      variables: { input: { projectId, name: "Empty run" } }
    });
    const runId = runRes.body.data.createTestRun.run.id as string;

    const agg = await t.agent.post("/graphql").send({
      query: `query($input: RunAggregateInput!) {
        runAggregate(input: $input) { total passRatePct durationMs }
      }`,
      variables: { input: { runId } }
    });
    expect(agg.body.data.runAggregate.total).toBe(0);
    expect(agg.body.data.runAggregate.passRatePct).toBe(0);
    expect(agg.body.data.runAggregate.durationMs).toBe(0);

    const dash = await t.agent.post("/graphql").send({
      query: `query($input: KpiDashboardInput!) {
        kpiDashboard(input: $input) {
          dailyTrend { date }
          current { coverage { formulaId valuePct denominator numerator } }
        }
      }`,
      variables: { input: { projectId } }
    });
    const trend = dash.body.data.kpiDashboard.dailyTrend as Array<{ date: string }>;
    for (let i = 1; i < trend.length; i += 1) {
      expect(trend[i].date >= trend[i - 1].date).toBe(true);
    }
    const cov = dash.body.data.kpiDashboard.current.coverage as Array<{ denominator: number; valuePct: number }>;
    for (const c of cov) {
      if (c.denominator === 0) {
        expect(c.valuePct).toBe(0);
      }
    }

    await t.close();
  });
});
