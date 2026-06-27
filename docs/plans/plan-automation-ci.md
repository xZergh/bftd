# Plan automation — CI follow-up (GitHub Actions)

Local **Run automated tests** on the Plans tab uses `launchPlanAutomation` → `scripts/run-plan-automation.ts`, which spawns Playwright and posts results via `submitTestResult` (including manual rollup).

## Planned: GitHub Actions integration

When core plan execution is stable locally, add CI using one of:

1. **Repository dispatch / workflow_dispatch** — TCMS calls GitHub API with `{ runId, specPaths, projectId }`; workflow checks out repo, runs `npx tsx scripts/run-plan-automation.ts --run-id $RUN_ID`, uploads artifacts.
2. **Inbound webhook** — `POST /api/hooks/plan-automation` (authenticated) with the same payload; GitHub Action polls or receives callback.
3. **Outbound webhook from TCMS** — after `createTestRun`, POST to configured `TCMS_CI_WEBHOOK_URL` with flattened automated `externalId` list and `runId`.

### Contract (draft)

```json
{
  "runId": "uuid",
  "projectId": "uuid",
  "testPlanId": "uuid",
  "specPaths": ["e2e/fe-projects-create.spec.ts"],
  "callbackUrl": "https://tcms.example/graphql"
}
```

Runner submits results with existing GraphQL `submitTestResult`; rollup rules:

- automated **passed** → linked manual **passed**
- automated **failed** → linked manual **failed**
- automated **skipped** → manual stays **not_run**

### Env vars (future)

| Variable | Purpose |
|----------|---------|
| `TCMS_CI_WEBHOOK_URL` | Trigger remote workflow |
| `TCMS_CI_GITHUB_TOKEN` | `workflow_dispatch` auth |
| `TCMS_GRAPHQL_URL` | Result submission from CI job |

Until CI is wired, use **Run automated tests** on a dev machine with API + web running and `DB_PATH` pointing at the TCMS database.
