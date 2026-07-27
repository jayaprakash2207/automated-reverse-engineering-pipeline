# Data Flow Map — HRMS

## Entry points

All data flow originates from **Oracle Forms 12c client modules**, launched from `HRMS_MENU`, which calls `PKG_SECURITY.has_permission(p_emp_id, p_module, p_action)` in each form's `WHEN-NEW-FORM-INSTANCE` trigger before rendering. There is no web/API tier — Forms talks directly to the DB via the WebLogic Forms listener.

## Flow 1 — Employee lifecycle

```
HRMS_EMPLOYEE.xml (Forms)
  → WHEN-VALIDATE-ITEM (client-side: 90-day hire-date-in-future rule, per deep-scan of forms XML)
  → PKG_EMPLOYEE.create_employee / update_employee / transfer_employee / promote_employee / terminate_employee / rehire_employee
      → TRG_EMP_BEFORE_INSERT / TRG_EMP_BEFORE_UPDATE (DB-level, duplicate validation: 180-day rule, email uniqueness, reactivation block)
      → EMPLOYEE_HISTORY insert attempt (BROKEN — see erd.md)
      → PKG_AUDIT.log_action('SALARY_RECORDS'|'DEPARTMENTS', ...) via TRG_SALARY_AUDIT / TRG_DEPARTMENT_AUDIT
  → PKG_NOTIFICATION (presumed, unscanned body) → NOTIFICATION_QUEUE insert → outbound email via UTL_MAIL/SMTP (SYSTEM_PARAMETERS: SMTP_HOST, FROM_ADDRESS)
```

## Flow 2 — Payroll run

```
HRMS_PAYROLL.xml (Forms, PAY_PERIOD block defaults WHERE STATUS='OPEN')
  → BTN_CALCULATE (requires PAYROLL_RUNS.STATUS='PENDING')
      → PKG_PAYROLL.create_payroll_run / calculate_payroll (unscanned body)
          reads: EMPLOYEE_PAY_ELEMENTS, PAY_ELEMENTS, SALARY_RECORDS, TAX_BRACKETS, EMPLOYEE_TAX_INFO
          writes: PAYROLL_DETAILS (one row per employee × pay element)
          aggregates back into: PAYROLL_RUNS (TOTAL_GROSS/TOTAL_DEDUCTIONS/TOTAL_NET/TOTAL_EMPLOYER_COST/EMPLOYEE_COUNT/ERROR_COUNT)
  → BTN_APPROVE (permission-gated) → PAYROLL_RUNS.STATUS='APPROVED'
  → VW_PAYROLL_LATEST reads MAX(RUN_ID) WHERE STATUS='APPROVED' — see data-quality-report.md for the single-global-run assumption risk
  → downstream: PKG_INTEGRATION presumed GL feed (SYSTEM_PARAMETERS.GL_FEED_STATUS)
```

## Flow 3 — Leave request

```
HRMS_LEAVE.xml (Forms, LEAVE_REQUEST block)
  → employee submits → PKG_LEAVE.submit_leave_request (unscanned body)
      writes: LEAVE_REQUESTS (STATUS='PENDING')
      reads/validates against: LEAVE_BALANCES.AVAILABLE (generated column), LEAVE_TYPES (MIN_TENURE_DAYS, REQUIRES_APPROVAL, REQUIRES_DOCUMENT)
  → approver action (via VW_PENDING_APPROVALS, UNION of LEAVE_REQUESTS + PERFORMANCE_REVIEWS)
      → LEAVE_REQUESTS.STATUS updated → TRG_LEAVE_REQUEST_AUDIT (AFTER UPDATE OF STATUS)
          → PKG_AUDIT.log_action(..., 'STATUS_CHANGE', ...) — see data-quality-report.md, this write is expected to fail CHK_AUDIT_ACTION
  → approved leave eventually reflected in LEAVE_BALANCES.USED (mechanism unscanned — presumably PKG_LEAVE, on approval or on TAKEN transition)
  → accrual (monthly/biweekly per LEAVE_TYPES.ACCRUAL_FREQUENCY) logged to LEAVE_ACCRUAL_LOG, presumably a scheduled batch job (RUN_ID column suggests a job/run identifier, FK target unconfirmed)
```

## Flow 4 — Performance review

```
HRMS_PERFORMANCE.xml (Forms, REVIEW_CYCLE block defaults WHERE STATUS IN ('OPEN','DRAFT'))
  → PERFORMANCE_REVIEWS created per (CYCLE_ID, EMP_ID, REVIEWER_EMP_ID)
  → self-assessment / manager-assessment CLOB fields populated via Forms text items
  → PERFORMANCE_GOALS linked 1-to-many to a review (GOAL_CATEGORY poplist in Forms only offers 3 of 5 DB-valid values — see hidden-business-rules.json)
  → STATUS progression NOT_STARTED → SELF_REVIEW → MANAGER_REVIEW → MEETING_SCHEDULED → COMPLETED → ACKNOWLEDGED
  → surfaces in VW_PENDING_APPROVALS while STATUS='MANAGER_REVIEW'
```

## Flow 5 — Audit trail (cross-cutting)

```
Any DML on SALARY_RECORDS / LEAVE_REQUESTS(STATUS) / DEPARTMENTS
  → respective AFTER trigger
  → PKG_AUDIT.log_action(table_name, record_id, action, user[, old_json, new_json])
  → AUDIT_LOG insert (ACTION_TYPE constrained to INSERT/UPDATE/DELETE only — see WARNING above for the STATUS_CHANGE mismatch)
  → PKG_AUDIT.purge_old_records(p_days_to_keep DEFAULT 365) — retention job (see hidden-business-rules.json)
```

## Flow 6 — Authentication / session

```
HRMS_LOGIN.xml → PKG_SECURITY.authenticate(username, password, ip_address)
  → password checked via PKG_SECURITY.hash_password (documented as MD5 — see pii-inventory.json / access-control-matrix.md)
  → on success: USER_SESSIONS insert, PKG_EMPLOYEE.set_session_context(user, emp_id) populates g_current_user/g_current_emp_id/g_current_dept_id
  → every subsequent form's WHEN-NEW-FORM-INSTANCE calls PKG_SECURITY.has_permission(emp_id, module, action)
  → logout / session timeout → PKG_SECURITY.logout / is_session_valid → USER_SESSIONS.LOGOUT_TIME, SESSION_STATUS
```

## Batch/background jobs (inferred, not directly scanned)

- Leave accrual posting (LEAVE_ACCRUAL_LOG population) — frequency implied by LEAVE_TYPES.ACCRUAL_FREQUENCY (MONTHLY/BIWEEKLY), mechanism unscanned.
- Payroll run calculation — triggered manually via Forms button, not a cron-style batch based on scanned evidence.
- Audit purge (PKG_AUDIT.purge_old_records) — no scheduler (DBMS_SCHEDULER job) found in scanned files; may be manually invoked or scheduled outside this repo. UNKNOWN.
