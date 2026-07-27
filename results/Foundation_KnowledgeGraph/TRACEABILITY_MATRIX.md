# Traceability Matrix

**Caveat:** Only two capability/process threads have enough cross-layer evidence in the provided summaries to populate every column. All other rows have one or more `MISSING`/`UNKNOWN` cells — these are left blank rather than filled with a guess, per the anti-hallucination rule.

| Capability | Process | Entity | Service/Package | API | Database Table | Confidence |
|---|---|---|---|---|---|---|
| Employee Authentication | Login | Employee | `PKG_SECURITY.authenticate()` | UNKNOWN (no API layer named) | EMPLOYEES (no USER_CREDENTIALS exists) | HIGH — but flagged CRITICAL DEFECT: no password check performed |
| Employee Lifecycle Change (transfer/promote/terminate/rehire) | Employee Lifecycle value stream | Employee | `PKG_EMPLOYEE.transfer_employee` / `promote_employee` / `terminate_employee` / `rehire_employee` | UNKNOWN | EMPLOYEES, EMPLOYEE_HISTORY | HIGH — but flagged CRITICAL DEFECT: all four calls trip broken `TRG_EMP_BEFORE_UPDATE`, non-functional as shipped |
| Action Audit Logging | (cross-cutting) | Audit Log (entity name UNKNOWN — no table named) | `PKG_AUDIT.log_action` | UNKNOWN | UNKNOWN (table not named in summary) | MEDIUM — defect confirmed (swallows errors) but underlying table not identified in available evidence |
| Leave Request Submission | Leave Request value stream | Leave Request (entity name UNKNOWN — no table named) | UNKNOWN | UNKNOWN | UNKNOWN | LOW — capability confirmed to exist (submission + self-cancellation only) but no service/table evidence provided |
| Leave Request Approval (manager-side) | Leave Request value stream | Leave Request | **NONE FOUND** | **NONE FOUND** | UNKNOWN | HIGH (confidence in the *gap itself*) — BA confirms no working manager approve/reject screen exists anywhere in the scanned system |
| Pay Period Processing | Pay Period value stream | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | LOW — value stream name only, no lower-layer evidence provided |
| Payroll Run Execution | Payroll Run value stream | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | LOW — value stream name only |
| Review Cycle Management | Review Cycle value stream | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | LOW — value stream name only |
| Individual Review | Individual Review value stream | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | LOW — value stream name only |

## Why so many UNKNOWN cells
The four layer hand-offs given to this agent were **executive summaries**, not the full artifact sets (the full BA/DA/TA/AA documents, the 30-table DDL, the 13-module component registry, and `dependency-graph.json` were referenced but not included in this prompt). A complete traceability matrix requires ingesting those source files directly. This is recorded as **OQ-003 through OQ-006 and OQ-010** in the Enterprise Knowledge Graph.