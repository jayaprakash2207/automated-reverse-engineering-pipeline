# Data Flow Diagram

## Confirmed flows (HIGH confidence)

```mermaid
flowchart LR
  Employee((Employee/User)) -->|email + any password| Auth[PKG_SECURITY.authenticate]
  Auth -->|lookup by email ONLY - no password check| EMPLOYEES[(EMPLOYEES)]
  Auth -->|issues session regardless of password| Session[Valid Session]

  HRAdmin((HR Administrator)) -->|transfer/promote/terminate/rehire| LifecycleOps[PKG_EMPLOYEE procedures]
  LifecycleOps --> EMPLOYEES
  EMPLOYEES -->|fires on UPDATE| Trigger[TRG_EMP_BEFORE_UPDATE]
  Trigger -->|INSERT - column-shape mismatch + CHECK violation| EMPLOYEE_HISTORY[(EMPLOYEE_HISTORY)]
  Trigger -.->|fails: ORA-00904 / ORA-02290| Failure[["Transaction fails"]]

  EmployeeUser((Employee)) -->|submit leave request| LeaveSubmit[Leave Submission - MEDIUM confidence]
  LeaveSubmit -->|log attempt| AuditPkg[PKG_AUDIT.log_action]
  AuditPkg -.->|constraint violation swallowed internally| SilentFail[["No audit entry written, workflow still succeeds"]]

  Manager((Manager)) -.->|NO PATH EXISTS| LeaveApproval[["Leave Approval/Rejection - CONFIRMED MISSING"]]
```

## What is missing
Data flows for Pay Period, Payroll Run, Review Cycle, and Individual Review value streams were not evidenced in the material provided — no source/target tables or packages were named for these. See OQ-003/OQ-010.