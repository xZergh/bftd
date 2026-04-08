# Developer Guide

## 1. Architecture Overview

### 1.1 System Modules

- projects
- requirements (includes Penpot link operations)
- testCases
- traceability
- testRuns
- reqImports
- trrImports
- versioning
- kpi
- reporting

### 1.2 Core Data Flow

- Requirement and testcase lifecycle
- Import pipelines
- Run snapshot capture
- KPI snapshot generation

## 2. Local Development Setup

### 2.1 Prerequisites

- Node.js version: TODO
- Package manager: TODO

### 2.2 Install

```bash
# TODO
```

### 2.3 Environment Variables

- `TODO_VAR_1`:
- `TODO_VAR_2`:

### 2.4 Database and Migrations

```bash
# TODO: migrate command
```

### 2.5 Start the Service

```bash
# TODO: run dev command
```

## 3. Testing

### 3.1 Unit Tests

```bash
# TODO
```

### 3.2 API Integration Tests

```bash
# TODO
```

### 3.3 Mutation Tests (Extended)

```bash
# TODO
```

## 4. Coding and PR Rules

- Keep deterministic error contract (`code`, `message`, `fixHint`, optional `context`).
- Do not use names/titles as entity identity.
- Update docs in the same PR when contracts change.

## 5. GraphQL Schema Change Policy

- Prototype phase: approved breaking changes allowed with required workflow.
- Post API lock: additive-only changes.

## 6. Troubleshooting

### 6.1 Import Failures

- Check identity fields and fix hints.

### 6.2 KPI Mismatch

- Verify formula metadata and snapshot generation timestamps.

### 6.3 Migration Issues

- Validate fresh and upgrade-path migration checks.

