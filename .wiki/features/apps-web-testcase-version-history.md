---
title: "Web testcase version history (FE-I)"
type: "feature"
status: "active"
source_paths:
  - "apps/web/src/pages/TestCaseDetailPage.tsx"
  - "apps/web/src/graphql/documents.ts"
  - "apps/web/e2e/fe-i-version-history.spec.ts"
updated_at: "2026-04-09"
---

## Purpose

Expose immutable **test case version** snapshots on the testcase detail screen so users can audit title/steps/tombstone history over time.

## GraphQL

- `TestCaseVersionHistoryQuery` in `apps/web/src/graphql/documents.ts` calls `testCaseVersionHistory` with `testCaseId` and `includeDeleted` aligned with the detail query.

## UI

- `TestCaseDetailPage` fetches history in parallel, sorts by `versionSeq` descending, and renders a table under `data-testid="testcase-version-history"`.
- After manual/automated saves, tombstone, and restore, the page re-executes the history query with `network-only` alongside detail/graph refetches.

## Backend alignment

- Version rows originate from domain testcase mutations (see `[[features-src-domain-services-testcases-ts]]`).

## Related pages

- `[[features-apps-web-src-app-tsx]]`
- `[[features-apps-web-shell-polish]]`
