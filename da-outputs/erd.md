# ERD — HRMS (Oracle 19c, schema HRMS)

`db_connection: CODE-ONLY` — see schema-catalogue.json for the exact reason. All relationships below are drawn from `schema/tables/*.sql` DDL (confidence 0.9 — DDL is the closest thing this repo has to a migration file; no live DB to confirm cardinality/orphans).

## Core HR

```
LOCATIONS ──────────────────┐
                             │ (soft ref, no FK)
DEPARTMENTS ◄──────┐         │
   │  ▲             │(soft ref, no FK: PARENT_DEPT_ID self)
   │  └─────────────┘(soft ref, no FK: MANAGER_EMP_ID → EMPLOYEES)
   │
   ▼ FK (DEPT_ID)
EMPLOYEES ──FK(JOB_ID)──► JOB_TITLES ──FK(GRADE_ID)──► JOB_GRADES
   │  ▲
   │  └── FK (MANAGER_EMP_ID, self)
   │
   ├──FK(LOCATION_CODE)──► LOCATIONS
   ├──FK──► EMPLOYEE_HISTORY (EMP_ID)      [BROKEN — see WARNING 1]
   ├──FK──► EMPLOYEE_DEPENDENTS (EMP_ID)
   └──FK──► EMERGENCY_CONTACTS (EMP_ID)
```

## Payroll

```
EMPLOYEES ──FK──► SALARY_RECORDS
          ──FK──► EMPLOYEE_TAX_INFO
          ──FK──► EMPLOYEE_BANK_ACCOUNTS
          ──FK──► EMPLOYEE_PAY_ELEMENTS ──FK──► PAY_ELEMENTS
          ──FK──► PAYROLL_DETAILS ◄──FK── PAYROLL_RUNS ──FK──► PAY_PERIODS
                        │
                        └──FK──► PAY_ELEMENTS

TAX_BRACKETS  (standalone reference table — no FK in or out)
```

## Leave Management

```
EMPLOYEES ──FK──► LEAVE_BALANCES ──FK──► LEAVE_TYPES
          ──FK──► LEAVE_REQUESTS ──FK──► LEAVE_TYPES
          ──FK(APPROVER_EMP_ID, self)──► LEAVE_REQUESTS
          ──FK──► LEAVE_ACCRUAL_LOG ──FK──► LEAVE_TYPES
                        │
                        └── soft ref (no FK): RUN_ID → presumably PAYROLL_RUNS or a batch job id

HOLIDAYS  ── soft ref (no FK): LOCATION_CODE → LOCATIONS
```

## Performance & Cross-Cutting

```
REVIEW_CYCLES ──FK──► PERFORMANCE_REVIEWS ──FK──► PERFORMANCE_GOALS
EMPLOYEES ──FK──► PERFORMANCE_REVIEWS (EMP_ID and REVIEWER_EMP_ID, both self-ref to EMPLOYEES)
EMPLOYEES ──FK──► USER_SESSIONS

AUDIT_LOG            — no FK anywhere (generic TABLE_NAME/RECORD_ID polymorphic reference)
SYSTEM_PARAMETERS    — standalone
NOTIFICATION_QUEUE   ── soft ref (no FK): RECIPIENT_EMP_ID → EMPLOYEES
LOOKUP_VALUES        ── soft ref (no FK): PARENT_LOOKUP_ID → LOOKUP_VALUES (self)
```

---

## ⚠️ WARNING — Soft References (no FK constraint declared, relationship is conceptual only)

| From | Column | Conceptually references | Risk |
|---|---|---|---|
| DEPARTMENTS | PARENT_DEPT_ID | DEPARTMENTS.DEPT_ID (self) | Orphaned parent IDs possible; hierarchy queries (VW_ORG_HIERARCHY-style) can silently break |
| DEPARTMENTS | MANAGER_EMP_ID | EMPLOYEES.EMP_ID | Dangling manager reference if employee record is later deleted (deletes are blocked by TRG_EMP_INSTEAD_OF_DELETE, so risk is low in practice, but nothing at DB level prevents inconsistency) |
| DEPARTMENTS | LOCATION_CODE | LOCATIONS.LOCATION_CODE | Invalid location code possible |
| HOLIDAYS | LOCATION_CODE | LOCATIONS.LOCATION_CODE | Invalid location code possible |
| LEAVE_ACCRUAL_LOG | RUN_ID | Unclear — likely PAYROLL_RUNS.RUN_ID or a separate batch-run concept | Ambiguous target, unscanned package bodies may clarify; flagged UNKNOWN |
| NOTIFICATION_QUEUE | RECIPIENT_EMP_ID | EMPLOYEES.EMP_ID | Notifications can reference a deleted/nonexistent employee |
| LOOKUP_VALUES | PARENT_LOOKUP_ID | LOOKUP_VALUES.LOOKUP_ID (self) | Orphaned hierarchy entries possible |
| AUDIT_LOG | TABLE_NAME + RECORD_ID | Polymorphic — any table's PK | By design (generic audit log); cannot be an FK |

## ❌ BROKEN Reference (not a missing-FK gap — a genuine cross-file schema mismatch)

`EMPLOYEE_HISTORY` has a declared FK to `EMPLOYEES(EMP_ID)` and the FK itself is fine, but `TRG_EMP_BEFORE_UPDATE` (plsql/triggers/trg_employees.sql) inserts into `EMPLOYEE_HISTORY` using a column set (`HISTORY_ID, CHANGE_DATE, OLD_VALUE, NEW_VALUE, CHANGED_BY, CHANGE_REASON`) that **does not match** the table's actual DDL columns (`HIST_ID, EFFECTIVE_DATE, OLD_DEPT_ID/NEW_DEPT_ID, OLD_JOB_ID/NEW_JOB_ID, OLD_MANAGER_ID/NEW_MANAGER_ID, OLD_SALARY/NEW_SALARY, OLD_LOCATION/NEW_LOCATION, REASON_CODE, COMMENTS, CREATED_BY`), and uses `CHANGE_TYPE` values (`DEPARTMENT_CHANGE`, `JOB_CHANGE`) not permitted by `CHK_CHANGE_TYPE`. **Any UPDATE on EMPLOYEES that changes STATUS, DEPT_ID, or JOB_ID will fail at the database level** (ORA-00904 invalid identifier, and/or ORA-02290 check constraint violated). This is confirmed by direct comparison of the trigger source and the table DDL — not inferred.

## Missing FK vs. Declared FK Inconsistency

`DEPARTMENTS.PARENT_DEPT_ID`, `MANAGER_EMP_ID`, `LOCATION_CODE` have **no FK constraints**, while `EMPLOYEES` — which has the same three conceptual relationships (self-ref manager, dept, location) — **does** declare all of them as FKs. Same relationship shape, inconsistent enforcement across tables.
