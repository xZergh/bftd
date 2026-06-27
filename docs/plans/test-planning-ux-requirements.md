# Test planning UX — requirements

**Purpose:** Human-readable requirements for the Plans / Test Cases planning workflow. Import into TCMS via **Imports** using the JSON appendix in [`test-planning-ux-import.json`](test-planning-ux-import.json), or transcribe manually.

**Epic:** `EPIC-PLAN` (Test planning)  
**Release / sprint defaults:** MVP / MVP-2

---

## Requirements matrix

| Key | Title | Type | Priority | Status | Description |
|-----|-------|------|----------|--------|-------------|
| `TCMS-PLAN-R1` | Create test plan from Test Cases selection | functional | high | ready | QA selects manual test cases on the Test Cases tab and creates a plan from the selection; plan metadata is edited in the inspector. |
| `TCMS-PLAN-R2` | Auto-include linked automation in plans | functional | high | ready | When a manual test case is added to a plan, linked automated tests are added automatically; unlinking manual removes paired automation from the plan. |
| `TCMS-PLAN-R3` | Plans list with filters | functional | medium | ready | Plans tab shows a scrollable plan table with search and release/sprint filters. |
| `TCMS-PLAN-R4` | Plan case catalog for membership editing | functional | high | ready | Selecting a plan shows a dense, filterable catalog of all test cases with in-plan toggles and bulk add/remove. |
| `TCMS-PLAN-R5` | Plan metadata panel | functional | medium | ready | Plan name, description, release, and sprint are edited in a dedicated right panel; test cases are not listed there. |
| `TCMS-PLAN-R6` | Quick view test case from plan catalog | functional | medium | ready | QA can open a dismissible read-only popup for a test case from the plan catalog without leaving Plans. |
| `TCMS-PLAN-R7` | Automation visibility without spec detail | non_functional | medium | ready | Manual rows show automation coverage icon only; spec paths and Playwright detail stay in the Automation area. |
| `TCMS-PLAN-R8` | Execute automation from Runs | functional | high | ready | Creating a run may optionally execute automated tests (off by default); execution is not initiated from Plans. |
| `TCMS-PLAN-R9` | Embedded run report section | functional | medium | ready | Run detail includes a dedicated report section for an embedded HTML report attachment (Allure-style). |
| `TCMS-PLAN-R10` | Bulk selection across filters | functional | high | ready | Selection for bulk plan edits persists across filter changes; “select all matching” operates on the filtered set. |

---

## Notes

- **Sub-plans:** deferred; no UI in this slice.
- **Rollup on run:** automated `passed`/`failed` rolls up to linked manual cases; `skipped` leaves manual `not_run` (existing Runs behavior).
- **CI / webhooks:** see [`plan-automation-ci.md`](plan-automation-ci.md).

---

## JSON import (requirements only)

Paste into **Imports → Requirements** or use `importRequirements`:

```json
{
  "requirements": [
    {
      "externalKey": "TCMS-PLAN-R1",
      "title": "Create test plan from Test Cases selection",
      "description": "QA selects manual test cases on the Test Cases tab and creates a plan from the selection; plan metadata is edited in the inspector.",
      "requirementType": "functional",
      "priority": "high",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans", "test-cases"]
    },
    {
      "externalKey": "TCMS-PLAN-R2",
      "title": "Auto-include linked automation in plans",
      "description": "Adding a manual case to a plan adds linked automated tests; unlinking manual removes paired automation from the plan.",
      "requirementType": "functional",
      "priority": "high",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans", "automation"]
    },
    {
      "externalKey": "TCMS-PLAN-R3",
      "title": "Plans list with filters",
      "description": "Scrollable plan table with name search and release/sprint filters.",
      "requirementType": "functional",
      "priority": "medium",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans"]
    },
    {
      "externalKey": "TCMS-PLAN-R4",
      "title": "Plan case catalog for membership editing",
      "description": "Dense filterable catalog with in-plan toggles, bulk add/remove, and full-project case list.",
      "requirementType": "functional",
      "priority": "high",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans"]
    },
    {
      "externalKey": "TCMS-PLAN-R5",
      "title": "Plan metadata panel",
      "description": "Right panel for plan fields only; cases managed on the left.",
      "requirementType": "functional",
      "priority": "medium",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans"]
    },
    {
      "externalKey": "TCMS-PLAN-R6",
      "title": "Quick view test case from plan catalog",
      "description": "Dismissible read-only popup for case summary from Plans catalog.",
      "requirementType": "functional",
      "priority": "medium",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans"]
    },
    {
      "externalKey": "TCMS-PLAN-R7",
      "title": "Automation visibility without spec detail",
      "description": "Coverage icon on manual rows; automation specs remain under Automation tab.",
      "requirementType": "non_functional",
      "priority": "medium",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans", "ux"]
    },
    {
      "externalKey": "TCMS-PLAN-R8",
      "title": "Execute automation from Runs",
      "description": "Optional execute-automated on run create; default off. Not on Plans tab.",
      "requirementType": "functional",
      "priority": "high",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["runs", "automation"]
    },
    {
      "externalKey": "TCMS-PLAN-R9",
      "title": "Embedded run report section",
      "description": "Run detail report panel for embedded HTML (Allure-style attachment).",
      "requirementType": "functional",
      "priority": "medium",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["runs", "reporting"]
    },
    {
      "externalKey": "TCMS-PLAN-R10",
      "title": "Bulk selection across filters",
      "description": "Selection persists across filters; select-all-matching uses current filter set.",
      "requirementType": "functional",
      "priority": "high",
      "status": "ready",
      "releaseLabel": "MVP",
      "sprintLabel": "MVP-2",
      "tags": ["plans", "bulk"]
    }
  ]
}
```
