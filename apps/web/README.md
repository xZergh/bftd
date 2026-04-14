# TCMS Web (`tcms-web`)

React + Vite front end for the TCMS GraphQL API. Dev server proxies API routes to `http://127.0.0.1:4000` by default.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Vite dev server (127.0.0.1:5173). |
| `npm run build` | Production build to `dist/`. |
| `npm run preview` | Preview production build. |
| `npm run e2e` | Playwright tests (starts API + web via config when not reused). |
| `npm run e2e:ci` | Same as `e2e` (use from CI with `CI=true`). |
| `npm run e2e:install` | Download Playwright browser binaries (Chromium). |

## Local manual testing

1. Start the API from the **repo root** (`npm run dev` in [`../..`](../..)).
2. In this package: `npm run dev`.
3. Open [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

Full step-by-step (env, clean DB, troubleshooting): [`docs/LOCAL_MANUAL_TESTING.md`](../../docs/LOCAL_MANUAL_TESTING.md).

## E2E

- Config: [`playwright.config.ts`](playwright.config.ts) — web servers **`tcms-api`** (depends) and **`tcms-web`**.
- Smoke: [`e2e/fe-e2e-0-smoke.spec.ts`](e2e/fe-e2e-0-smoke.spec.ts).
- App shell (FE-A): [`e2e/fe-a-shell.spec.ts`](e2e/fe-a-shell.spec.ts) — routing, error banners, urql load path.

From repo root: `npm run e2e:web` or `npm run ci:e2e:web`.

## Stack

- React 19, Vite 8, TypeScript 6  
- urql + graphql (`/graphql`)
