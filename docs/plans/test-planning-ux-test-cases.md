# Test planning UX — manual test cases

**Purpose:** Manual test cases for validating the planning workflow. Create in TCMS via **Test Cases → Create** (link each row to the requirement key), or use the structured steps below.

**Linked requirements:** `TCMS-PLAN-R1` … `TCMS-PLAN-R10`  
**Release / sprint:** MVP / MVP-2  
**Epic (suggested):** `EPIC-PLAN`

---

## Test case matrix

| Key | Title | Requirement | Automation hint |
|-----|-------|-------------|-----------------|
| `TCMS-PLAN-TC-01` | Create plan from Test Cases selection | TCMS-PLAN-R1 | not_automated |
| `TCMS-PLAN-TC-02` | Manual add auto-includes linked automation | TCMS-PLAN-R2 | not_automated |
| `TCMS-PLAN-TC-03` | Filter plans list | TCMS-PLAN-R3 | not_automated |
| `TCMS-PLAN-TC-04` | Bulk add cases to plan via catalog | TCMS-PLAN-R4, TCMS-PLAN-R10 | not_automated |
| `TCMS-PLAN-TC-05` | Edit plan metadata in right panel | TCMS-PLAN-R5 | not_automated |
| `TCMS-PLAN-TC-06` | Quick view case from plan catalog | TCMS-PLAN-R6 | not_automated |
| `TCMS-PLAN-TC-07` | Automation icon without spec in Plans | TCMS-PLAN-R7 | not_automated |
| `TCMS-PLAN-TC-08` | Create run with execute automation off | TCMS-PLAN-R8 | not_automated |
| `TCMS-PLAN-TC-09` | Create run with execute automation on | TCMS-PLAN-R8 | automation_required |
| `TCMS-PLAN-TC-10` | Run report section visible | TCMS-PLAN-R9 | not_automated |

---

## TCMS-PLAN-TC-01 — Create plan from Test Cases selection

**Preconditions:** Project has at least three manual test cases.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open Test Cases tab | Manual list visible |
| 2 | Click **Create plan** | Selection mode; checkboxes on manual rows |
| 3 | Select two manual cases; set plan name in right panel | Selection count updates |
| 4 | Click **Create plan** | Navigates to Plans; new plan selected with two manual members |
| 5 | Open Plans catalog | Linked automated cases present if traceability links exist |

---

## TCMS-PLAN-TC-02 — Manual add auto-includes linked automation

**Preconditions:** Manual case M1 linked to automated case A1.

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open Plans; select empty plan | Catalog visible |
| 2 | Check **In plan** for M1 | M1 and A1 both in plan (A1 may be hidden when type filter = manual) |
| 3 | Set type filter **Automated** | A1 listed as in plan |
| 4 | Uncheck M1 from manual filter | M1 and A1 removed from plan |

---

## TCMS-PLAN-TC-03 — Filter plans list

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open Plans with multiple plans | Scrollable plan table |
| 2 | Enter search substring of one plan name | Only matching rows |
| 3 | Set release filter | Rows match release label |
| 4 | Clear filters | Full list returns |

---

## TCMS-PLAN-TC-04 — Bulk add cases to plan via catalog

| Step | Action | Expected |
|------|--------|----------|
| 1 | Select plan; set membership **Not in plan** | Catalog shows candidates |
| 2 | Click **Select all matching (N)** | Selection bar shows N selected |
| 3 | Click **Add selected to plan** | All N added; bar clears |
| 4 | Change search filter | Prior selections outside filter still counted until cleared |

---

## TCMS-PLAN-TC-05 — Edit plan metadata in right panel

| Step | Action | Expected |
|------|--------|----------|
| 1 | Select a plan | Right panel shows name, description, labels only |
| 2 | Change description; wait for autosave | Saved indicator |
| 3 | Click **Create run** | Runs create panel opens with plan pre-selected |

---

## TCMS-PLAN-TC-06 — Quick view case from plan catalog

| Step | Action | Expected |
|------|--------|----------|
| 1 | In plan catalog, click **View** on a row | Modal with key, title, automation badge |
| 2 | Click Close or backdrop | Modal dismisses; plan selection unchanged |

---

## TCMS-PLAN-TC-07 — Automation icon without spec in Plans

| Step | Action | Expected |
|------|--------|----------|
| 1 | View manual row with linked automation | Auto column shows coverage icon |
| 2 | Confirm no spec path / externalId in Plans UI | Spec detail only under Automation tab |

---

## TCMS-PLAN-TC-08 — Create run with execute automation off (default)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Runs → Create run; pick plan with automation | Execute checkbox enabled, unchecked |
| 2 | Create run | Run detail opens; no background Playwright spawn |
| 3 | Results | Manual and automated rows `not_run` until submitted |

---

## TCMS-PLAN-TC-09 — Create run with execute automation on

| Step | Action | Expected |
|------|--------|----------|
| 1 | Create run with plan + **Execute automated tests** checked | Run created; runner spawned |
| 2 | Wait for automation | Automated results submitted; manual rollup applied |
| 3 | Skipped automated | Linked manual stays `not_run` |

---

## TCMS-PLAN-TC-10 — Run report section visible

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open any run detail | **Test report** section below aggregate |
| 2 | No attachment yet | Placeholder “No report attached yet.” |

---

## Seed script mapping (optional)

To load requirements JSON: paste `test-planning-ux-import.json` requirements array on Imports.  
Manual cases above are intended for dogfooding in the TCMS project after requirements import.
