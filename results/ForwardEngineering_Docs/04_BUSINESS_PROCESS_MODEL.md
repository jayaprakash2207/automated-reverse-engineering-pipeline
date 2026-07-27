# Business Process Model

## Confidence note
BA's summary confirms "Process Flows" were produced but does not include their content. The process descriptions below are reconstructed only from what can be inferred by combining the value-stream names with the confirmed defects/gaps — marked accordingly.

## Process: Employee Lifecycle Change
1. HR Administrator initiates change (transfer / promotion / termination / rehire). — MEDIUM (inferred actor)
2. System updates EMPLOYEES record. — HIGH (DA)
3. System attempts to log the change to EMPLOYEE_HISTORY via trigger. — HIGH (DA, TA)
4. **Process breaks here**: trigger fails with `ORA-00904`/`ORA-02290`. — HIGH
5. *(Intended but unreachable step)* Notification / downstream payroll or org-chart update. — MISSING, not evidenced

## Process: Leave Request
1. Employee submits leave request. — MEDIUM
2. *(Missing step)* Manager reviews and approves/rejects — **does not exist in the system**. — HIGH (BA)
3. Employee may self-cancel a submitted request. — MEDIUM (BA)
4. System attempts to write an audit log entry via `PKG_AUDIT.log_action` regardless of outcome. — HIGH (DA)
5. **Silent failure**: if a leave-status audit constraint is violated, the error is swallowed internally — the leave workflow still succeeds, but no audit trail is recorded. — HIGH (DA, re-characterized from Agent 1's original, more severe framing)

## Process: Pay Period / Payroll Run / Review Cycle / Individual Review
- Value streams confirmed to exist by name only; no process steps were included in the material available to this synthesis. **MISSING** — see OQ-010.