# Data Quality Report — HRMS

`db_connection: CODE-ONLY` (see schema-catalogue.json). All findings below are static/code-level — no live row-level DQ scan was possible. Where seed data was read directly, that is noted as "seed-confirmed" (higher confidence than pure inference).

## 🔴 Confirmed defects — seed data would fail against actual DDL (seed-confirmed, not inferred)

| Table | Seed script column used | Actual DDL column | Result if run |
|---|---|---|---|
| LOCATIONS | `PHONE` | `PHONE_NUMBER` | ORA-00904: invalid identifier |
| JOB_GRADES | `GRADE_LEVEL` (used), `GRADE_CODE` (omitted, NOT NULL no default) | no `GRADE_LEVEL` column exists; `GRADE_CODE` required | ORA-00904 and/or ORA-01400 (cannot insert NULL) |
| SYSTEM_PARAMETERS | `DESCRIPTION` | `PARAM_DESCRIPTION` | ORA-00904: invalid identifier |

**Implication**: `data/seed/01_reference_data.sql` cannot execute successfully against `schema/tables/01_core_tables.sql` + `04_performance_tables.sql` as shipped. Either the seed script predates a schema rename, or the DDL was refactored without updating seed data. This is the single clearest "docs/code drift" signal in the repo — treat schema DDL as authoritative (higher evidence tier) and flag the seed scripts as stale.

By contrast, `JOB_TITLES`, `LEAVE_TYPES`, `PAY_ELEMENTS`, and `HOLIDAYS` seed inserts match their DDL column names exactly — the drift is isolated to 3 of 7 seeded tables, not systemic.

## 🔴 Confirmed defect — trigger writes reject their own inserts

`TRG_EMP_BEFORE_UPDATE` inserts into `EMPLOYEE_HISTORY` with a column list and `CHANGE_TYPE` values that don't exist / aren't permitted in the actual `EMPLOYEE_HISTORY` DDL (see erd.md for full column mapping). **Any UPDATE to EMPLOYEES that changes EMPLOYMENT_STATUS, DEPT_ID, or JOB_ID will raise an unhandled database error inside the trigger**, meaning the base UPDATE itself would roll back. This is a launch-blocking defect if the DDL in this repo reflects the real production schema — Forms would appear to "not save" transfers/promotions/status changes with a cryptic ORA error.

## 🟠 Likely defect — audit action value violates check constraint

`TRG_LEAVE_REQUEST_AUDIT` calls `PKG_AUDIT.log_action(..., 'STATUS_CHANGE', ...)`. `PKG_AUDIT.log_action`'s spec shows a single procedure (not overloaded) whose 3rd parameter `p_action` has no default and is presumably written straight into `AUDIT_LOG.ACTION_TYPE`, which is constrained by `CHK_AUDIT_ACTION` to `('INSERT','UPDATE','DELETE')` only. If `PKG_AUDIT.log_action`'s body (not read in this pass) does not translate/remap the action string before the INSERT, every leave-status change will raise ORA-02290. Marked ⚠️ LOW CONFIDENCE (0.75) pending PKG_AUDIT.pkb body review by DA Agent 2 — the body could contain a CASE/translation step that resolves this.

## 🟡 Business-rule drift between DB trigger and Forms client validation

`TRG_EMP_BEFORE_INSERT` enforces "hire date cannot be more than **180** days in the future" at the DB level, while the deep-scan of `HRMS_EMPLOYEE.xml`'s `WHEN-VALIDATE-ITEM` trigger enforces a **90-day** threshold client-side. A hire date 91–180 days out is silently rejected by the Forms UI before ever reaching the DB, but any other insert path (batch load, another application, direct SQL) is bound only by the looser 180-day rule. Confidence 0.8 (Forms-side rule taken from prior deep-scan narrative, not independently re-read in this pass — flagged for Agent 2 to re-verify against the raw XML).

## 🟡 Redundant/contradicted uniqueness enforcement

`EMPLOYEES.EMAIL` has **no unique constraint** in the DDL. `TRG_EMP_BEFORE_INSERT` enforces uniqueness only among `ACTIVE_FLAG='Y'` rows via a `SELECT COUNT(*)` check — meaning (a) uniqueness is trigger-enforced, not schema-enforced, and is bypassable by any DML path that doesn't fire BEFORE INSERT row triggers (e.g. `INSERT ... APPEND` direct-path in some contexts, or a future refactor that drops the trigger), and (b) a terminated employee's email can be freely reused by a new hire, which is intentional-looking but undocumented as a policy.

## 🟡 View formula inconsistency

`LEAVE_BALANCES.AVAILABLE` is a `GENERATED ALWAYS` virtual column computed as `OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT - PENDING`. `VW_LEAVE_SUMMARY` independently recomputes `AVAILABLE` as `OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT` — **omitting PENDING**. Whenever an employee has a non-zero PENDING leave request, `VW_LEAVE_SUMMARY.AVAILABLE` will overstate the true available balance shown on `LEAVE_BALANCES.AVAILABLE`. Any report or LOV built on this view will disagree with the table it's sourced from.

## 🟡 Latest-payroll-run assumption

`VW_PAYROLL_LATEST` defines "latest" as `MAX(RUN_ID) WHERE STATUS='APPROVED'` — a single global run. If the company ever runs payroll in parallel for different employee subsets (different frequencies, off-cycle/supplemental runs — both of which `PAYROLL_RUNS.RUN_TYPE` explicitly supports: REGULAR/SUPPLEMENTAL/BONUS/FINAL), this view silently excludes every employee not in the single highest-ID approved run.

## 🟠 FK / delete-rule risk (per skill rule: flag ON DELETE = NO ACTION / no rule)

None of the FK constraints in this schema declare `ON DELETE CASCADE` — Oracle's default is the equivalent of `NO ACTION`. Concretely: attempting to delete a row from `DEPARTMENTS`, `JOB_TITLES`, `LEAVE_TYPES`, `PAY_ELEMENTS`, `PAY_PERIODS`, `PAYROLL_RUNS`, `REVIEW_CYCLES`, or `EMPLOYEES` while any child row exists will raise ORA-02292 (integrity constraint violated - child record found). Combined with `TRG_EMP_INSTEAD_OF_DELETE` unconditionally blocking EMPLOYEES deletes anyway, this is mostly moot for EMPLOYEES specifically, but is a live risk for every other parent table listed (e.g., deleting a JOB_TITLES row referenced by EMPLOYEES or JOB_TITLES referenced by PAYROLL history).

## 🟢 No defects found

`JOB_TITLES`, `LEAVE_TYPES`, `PAY_ELEMENTS`, `HOLIDAYS` seed scripts match DDL exactly. `PKG_AUDIT.log_action`'s parameter design (defaults on p_user/p_old_values/p_new_values) fully explains the earlier "4-arg vs 6-arg call" question raised during initial deep-scan — it is **one procedure with optional parameters**, not an overload, and `TRG_DEPARTMENT_AUDIT`'s shorter call is valid PL/SQL (just doesn't populate old/new JSON for department changes, which is a design choice, not a bug).

## Documentation-vs-code mismatch (repo-level, not row-level, but a genuine DQ signal)

README.md's architecture diagram (42 tables / 15 views / 200+ triggers / 12 packages / 18 forms) sharply overstates what's actually in the repo (30 tables / 6 views / 6 triggers / 11 packages / 6 form XML exports; `PKG_DEPARTMENT` and forms `HRMS_DEPARTMENT`/`HRMS_REPORTS`/`HRMS_ADMIN`/`HRMS_LOV`/`HRMS_TOOLBAR` are named but do not exist in this repo). Per the Evidence Strength Hierarchy, code wins — treat README as aspirational/reference-scale documentation, not a build manifest.
