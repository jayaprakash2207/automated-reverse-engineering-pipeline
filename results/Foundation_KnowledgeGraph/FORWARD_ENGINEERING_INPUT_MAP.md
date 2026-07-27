# Forward Engineering Input Map

This map classifies everything needed for AI-assisted code regeneration into **KNOWN**, **INFERRED**, and **MISSING**, so that Part 2 (and any future regeneration effort) knows exactly what it can build on versus what must be re-derived from source or clarified with stakeholders.

## KNOWN (direct evidence, HIGH confidence)
- The system has a 30-table Oracle schema.
- `EMPLOYEES` and `EMPLOYEE_HISTORY` tables exist.
- `USER_CREDENTIALS` (or any password table) does **not** exist.
- `PKG_SECURITY.authenticate()` performs email lookup only — no password verification, no credential table to check against.
- SSN encryption uses AES-256 with a hard-coded key literal inside `PKG_SECURITY.pkb`.
- `PKG_EMPLOYEE` contains `transfer_employee`, `promote_employee`, `terminate_employee`, `rehire_employee` — all four break on `TRG_EMP_BEFORE_UPDATE`.
- `TRG_EMP_BEFORE_UPDATE` inserts into `EMPLOYEE_HISTORY` with a column-shape mismatch and disallowed CHECK values, producing `ORA-00904`/`ORA-02290` on every department or job change.
- `PKG_AUDIT.log_action` swallows internal errors — leave workflows complete but silently produce no audit entry.
- There is no manager-facing leave approve/reject screen anywhere in the scanned system.
- CI/CD: 0 of 14 maturity capabilities present.
- 6 value streams: Employee Lifecycle, Leave Request, Pay Period, Payroll Run, Review Cycle, Individual Review.
- Counts: 32 business rules, 13 pain points, 7 automation opportunities, 6 defect-log items, 12 validation-queue items, 21 architecture patterns, 3 NFRs, 32 technical-debt items (7/10/12/3 by severity), 13 application modules (6 missing component-registry entries).

## INFERRED (pattern-based, MEDIUM/LOW confidence)
- Platform is Oracle Forms + PL/SQL (MEDIUM — from naming conventions and TA's "Application/Forms Libraries" label, not a direct platform statement).
- Employee, Leave Request, Pay Period, Payroll Run, and Review are likely distinct bounded contexts (LOW — inferred from value-stream names only, not confirmed as bounded contexts by any layer).
- Possible orphaned `SEQ_EMP_NUMBER` (MEDIUM — explicitly flagged as unresolved by TA).
- True PKG_* package count is 10 or 11, unresolved (DISC-003).

## MISSING (must be re-sourced before regeneration can proceed)
- Full text of BR-01 through BR-32 (only BR-hire-date-drift and BR-leave-balance-formula are known).
- Full text of TD-01 through TD-10 and TD-13 through TD-32 (only TD-11/TD-12 known).
- Full text of AP-01 through AP-21 and NFR-01 through NFR-03.
- Names/columns of the remaining 28 of 30 tables.
- Names of the remaining 10 (or 11) PKG_* packages beyond PKG_SECURITY, PKG_EMPLOYEE, PKG_AUDIT.
- Names of all 13 application modules and why 6 have no component-registry entries.
- Contents of `dependency-graph.json`, `component-view.mmd`, `dependency-view.mmd`.
- Full BA outputs: Business Capability Map, Process Flows, Stakeholder Matrix (only their existence, not content, is known).
- Remaining 4 of DA's 5 Gate G1 open questions.
- Any API/integration layer (existence not confirmed either way).
- Any front-end/UI technology (existence not confirmed either way, beyond "Forms Libraries" label).

## Regeneration risk flag
Before any forward-engineered rebuild proceeds, stakeholders must resolve **OQ-001** (is the auth bypass/hard-coded key an intentional training-repo artifact or a real production gap?). If this is a real system, the authentication mechanism and the leave-approval gap are launch-blocking, not backlog items.