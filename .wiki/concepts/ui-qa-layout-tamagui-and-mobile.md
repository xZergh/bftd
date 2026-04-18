---
title: "QA UI layout, Tamagui, and future native mobile"
type: "concept"
status: "active"
source_paths:
  - "apps/web/src/tamagui.config.ts"
  - "apps/web/src/layout/AppShell.tsx"
  - "apps/web/vite.config.ts"
  - "apps/web/index.html"
updated_at: "2026-04-19"
---

## Goals

- **Dense, scannable** project/requirement/test/run views for QA engineers: stable tables, clear status copy, predictable navigation (`[[features-apps-web-src-app-tsx]]`).
- **Deep links** preserved via React Router; shell keeps project context via the project picker.

## Tamagui on web

- **Config:** [`apps/web/src/tamagui.config.ts`](apps/web/src/tamagui.config.ts) uses `createTamagui` with the preset from `@tamagui/config` (tokens, themes, media).
- **Bundler:** [`apps/web/vite.config.ts`](apps/web/vite.config.ts) wires `@tamagui/vite-plugin` (extraction disabled for simpler CI) and aliases `react-native` → `react-native-web`.
- **Runtime:** [`apps/web/index.html`](apps/web/index.html) defines a minimal `globalThis.process.env` before modules load so dependencies that expect Node’s `process` do not throw in the browser.

Prefer **Tamagui stacks and text** inside the shell; keep **semantic HTML** (`main`, skip link anchor) as **siblings** of Tamagui `YStack` where needed so React Native Web is not given invalid View children.

## Native mobile later (Expo / RN)

Tamagui is **not** a second codebase for RN: the **same token/theme model** and many primitives can target Expo when added. Shared **GraphQL operations and types** should live in a workspace package when a mobile app is introduced. See also `[[flows-seed-demo-qa-project]]` for repeatable demo data during design reviews.

## Related

- `[[features-apps-web-ui-testing]]`
- `[[features-apps-web-shell-polish]]`
