# Operations Guide

## 1. CI Pipeline Overview

- typecheck
- lint
- unit tests
- integration tests
- report publication (Allure HTML + JUnit XML)
- extended mutation suite
- migration checks
- security/basic quality checks

## 2. CI Gate Policies

- max 1 automatic rerun for failed tests
- fail build on any remaining test failure
- runtime budgets:
  - unit tests: up to 30 minutes
  - integration tests: up to 3 hours

## 3. Migration Gates

- blocking:
  - fresh DB migration path
  - upgrade path from previous migration state
- non-blocking (initial):
  - rollback rehearsal

## 4. Security and Quality Gates (Phased)

- non-blocking initially:
  - dependency audit
  - static security checks
  - secret-pattern scan
- promote to blocking after stabilization milestones.

## 5. Release Readiness Checklist

- all CI gates green
- contract tests passing
- required docs updated
- migration checks passing
- KPI/reporting sanity checks complete

## 6. Incident and Recovery Notes

- import failure handling with deterministic `fixHint`
- snapshot consistency checks
- restore procedures for tombstoned history entries