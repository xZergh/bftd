# Run linked automation — local setup

## Ports (default)

| Stack | API | Web | Database |
|-------|-----|-----|----------|
| **Main TCMS** (your work) | `4010` | `5180` | `data/tcms.sqlite` |
| **Automation sandbox** (Playwright only) | `4012` | `5182` | `data/plan-automation.sqlite` |

These avoid the common `4000` / `5173` defaults if you already run other apps there.

## Preconditions

1. **Seed the sandbox DB** (once, or when you want a clean slate):
   ```bash
   npm run seed:plan-automation-db
   ```
   This resets `plan-automation.sqlite` and seeds TCMS project + R1 manual/automation links. **Do not** point Playwright at `tcms.sqlite`.

2. **Start both stacks** (four terminals from repo root):
   ```bash
   npm run dev:api          # main API → tcms.sqlite :4010
   npm run dev:web          # main UI :5180
   npm run dev:automation-api   # sandbox API → plan-automation.sqlite :4012
   npm run dev:automation-web   # sandbox UI :5182
   ```

3. Open the **main** UI at [http://127.0.0.1:5180](http://127.0.0.1:5180), create/open a run, select manual cases, click **Run linked automation**.

Playwright runs against `http://127.0.0.1:5182` (sandbox). Results and reports are written back to your run in `tcms.sqlite` via the main API’s `DB_PATH`.

## Env overrides

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `4010` (main) / `4012` (automation) | API port |
| `DB_PATH` | profile sqlite file | API database |
| `VITE_API_PROXY_TARGET` | matching API URL | Web → API proxy |
| `TCMS_AUTOMATION_WEB_URL` | `http://127.0.0.1:5182` | Playwright `baseURL` for linked automation |
| `TCMS_RUN_CTRF_REPORT` | (set by runner) | Playwright CTRF JSON output path when executing linked automation |

Reports are stored in [CTRF](https://ctrf.io) format (`data/run-reports/<runId>/ctrf.json`) so any framework with a CTRF reporter (Playwright, Jest, pytest, etc.) can plug in via a future adapter.
