# Local manual testing (TCMS API + web)

This guide explains how to run the **backend API** and **web UI** on your machine for **manual exploratory testing**. Automated E2E uses the same ports by default; free **4000** and **5173** before starting.

## Prerequisites

- **Node.js** **24.x** (see root `[package.json](../package.json)` `engines`).
- **npm** (workspaces-enabled npm 7+).

## Install

From the repository root:

```bash
npm install
```

This installs the root package and workspace packages (including `apps/web`).

## Environment variables


| Variable  | Default              | Purpose                                              |
| --------- | -------------------- | ---------------------------------------------------- |
| `PORT`    | `4000`               | API HTTP port (`[src/server.ts](../src/server.ts)`). |
| `DB_PATH` | `./data/tcms.sqlite` | SQLite file used by the API.                         |


The web app uses **Vite dev server** on **127.0.0.1:5173** and **proxies** `/graphql` (and `/health` if you call it) to the API (see `[apps/web/vite.config.ts](../apps/web/vite.config.ts)`). Override proxy target with `**VITE_API_PROXY_TARGET`** if the API listens elsewhere.

## Run (two terminals)

**Terminal 1 — API**

```bash
npm run dev
```

Or explicitly:

```bash
npm run dev:api
```

**Terminal 2 — Web**

```bash
npm run dev:web
```

## Open

- **Web UI:** [http://127.0.0.1:5173/](http://127.0.0.1:5173/)
- **GraphQL Explorer (browser):** [http://127.0.0.1:5173/graphql](http://127.0.0.1:5173/graphql) — same URL as the GraphQL endpoint; open in a browser for the interactive UI (`[docs/GRAPHQL_EXPLORER.md](GRAPHQL_EXPLORER.md)`).

Direct API (no Vite): [http://127.0.0.1:4000/graphql](http://127.0.0.1:4000/graphql) (Explorer in browser or `POST` JSON), [http://127.0.0.1:4000/health](http://127.0.0.1:4000/health).

## Demo sample data (optional)

From the repository root, with the API **stopped** (or using a dedicated `DB_PATH` so you do not clobber a running server’s DB), seed a project `**DEMO-QA`** with several requirements, manual and automated tests, links, and a sample run:

```bash
npm run seed:demo
```

The script is **idempotent**: if a project with key `DEMO-QA` already exists, it prints a message and exits without changing data. Set `DB_PATH` to target a specific SQLite file (same variable as the API).

## Clean slate (new local DB)

Stop the API, then either:

- Delete the SQLite file at your `DB_PATH`, or  
- Start with a different path, e.g. PowerShell:

```powershell
$env:DB_PATH="./data/manual-clean.sqlite"; npm run dev
```

**Warning:** deleting or replacing `DB_PATH` **destroys local data** for that file.

## What to exercise (product)

Follow `[docs/USER_GUIDE.md](USER_GUIDE.md)` for domain workflows (requirements, tests, runs, KPI). Use the **GraphQL Explorer** (`[docs/GRAPHQL_EXPLORER.md](GRAPHQL_EXPLORER.md)`) or the web UI **Check API** control to confirm the API responds.

## Troubleshooting


| Symptom                     | Things to check                                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `EADDRINUSE` on 4000 / 5173 | Another process uses the port; stop it or change `PORT` / Vite port in config.                                     |
| Web UI cannot reach API     | Ensure API is running; for dev, keep **proxy** and API on `127.0.0.1:4000` unless you set `VITE_API_PROXY_TARGET`. |
| CORS errors in the browser  | Prefer **same-origin** via Vite proxy; adding CORS to the API is optional for non-proxied setups.                  |


## Automated E2E (optional)

From repo root:

```bash
npm run ci:e2e:web
```

Uses isolated `DB_PATH=./data/e2e-playwright.sqlite` and starts both servers automatically. Requires Playwright browsers (`npm run e2e:install -w tcms-web` once per machine/CI image).