# Use Case Specification

Only use cases with direct cross-layer evidence are specified in full below. All others are listed as stubs pending the full BA report.

## UC-01: Employee Login
- **Actor:** Employee
- **Precondition:** Employee has a valid, active EMPLOYEES record with an email address.
- **Main flow:** Employee submits email + any password → `PKG_SECURITY.authenticate()` looks up the employee by email only → session issued.
- **Defect (CRITICAL):** No password is ever verified against any stored credential, because no credential table exists. This use case as implemented does not perform authentication — it performs email-based session issuance.
- **Confidence:** HIGH (DA summary, direct code evidence)

## UC-02: Employee Lifecycle Change (Transfer / Promote / Terminate / Rehire)
- **Actor:** HR Administrator
- **Precondition:** Target employee exists in EMPLOYEES.
- **Main flow:** HR admin invokes `PKG_EMPLOYEE.transfer_employee` (or `promote_employee` / `terminate_employee` / `rehire_employee`) → procedure updates EMPLOYEES → `TRG_EMP_BEFORE_UPDATE` fires → attempts insert into EMPLOYEE_HISTORY.
- **Defect (CRITICAL):** The trigger's insert has a column-shape mismatch and violates CHECK constraints, raising `ORA-00904`/`ORA-02290` on every invocation. **This use case fails every time it is executed**, for all four lifecycle actions.
- **Confidence:** HIGH (DA + TA, cross-confirmed from two independent code paths)

## UC-03: Submit Leave Request
- **Actor:** Employee
- **Main flow:** Employee submits a leave request (system supports submission and self-cancellation).
- **Confidence:** MEDIUM (existence confirmed by BA as part of describing the gap in UC-04; no further detail on the submission flow itself was provided)

## UC-04: Approve/Reject Leave Request
- **Actor:** Manager
- **Status:** **DOES NOT EXIST.** No working screen was found anywhere in the scanned system for a manager to approve or reject a leave request.
- **Confidence:** HIGH (BA summary, headlined finding)
- **Business impact:** The Leave Request value stream cannot complete its intended lifecycle without this use case. Flagged as a mandatory addition for any forward-engineered rebuild.

## UC-05 through UC-0N (Pay Period, Payroll Run, Review Cycle, Individual Review use cases)
- **Status:** Not detailed in the material provided to this synthesis. Stubbed pending full BA report (OQ-010).