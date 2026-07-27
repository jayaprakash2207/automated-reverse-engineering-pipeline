# API Contract Specification
## HR & Payroll Management Platform — Forward Engineering Document 11

### 0. Status and Grounding

This specification is derived entirely from the Enterprise Knowledge Graph (EKG) produced in Part 1. It is **technology-neutral**: no target language, framework, or wire format (REST/JSON is assumed only as a lingua franca for contract expression, per the instruction to produce "REST contracts") is mandated beyond what the source system's structure implies. Where the underlying business rule content, table columns, or package signatures were not available to the synthesis agent (marked `MISSING` in the EKG), this document defines the **contract shape** required and flags the **payload/validation detail as an open item** rather than inventing values.

Every endpoint below is traceable to a value stream (`VS-01..VS-06`), a table (`TBL-*`), a package (`PKG-*`), or a defect (`TD-*`, `DISC-*`) in the EKG. Endpoints for functionality that the EKG confirms does **not exist** in the source system (e.g., leave approval) are marked `[NEW — GAP CLOSURE]`; endpoints that replace a confirmed-broken source behavior are marked `[REMEDIATED]`.

### 1. Conventions

- Base path: `/api/v1`
- Auth: Bearer token (see `13_SECURITY_ARCHITECTURE.md`) on every endpoint except `POST /auth/login`.
- All mutating endpoints require an `Idempotency-Key` header where the source system's absence of transactional guarantees (TD-11, TD-12, PKG-AUDIT swallow-error behavior) makes retries dangerous.
- Standard error envelope:
```json
{
  "error": {
    "code": "STRING_ENUM",
    "message": "human readable",
    "details": [ { "field": "string", "issue": "string" } ],
    "trace_id": "uuid"
  }
}
```
- Standard list envelope: `{ "data": [...], "page": { "cursor": "string|null", "limit": int, "total": int|null } }`. `total` is `null` where the source schema (28 of 30 tables `MISSING`, OQ-006) cannot yet confirm cheap counting is safe at scale.
- Every response includes a `meta.source_confidence` field of `HIGH|MEDIUM|LOW` inherited from the EKG node(s) backing the endpoint, so downstream consumers know which endpoints are built on fully-verified vs. partially-reconstructed rules. This field is a **transitional scaffold** — remove it once OQ-003/OQ-004/OQ-006 are resolved and all endpoints reach HIGH.

### 2. Domain: Employee Lifecycle (VS-01)

Backing nodes: `TBL-EMPLOYEES`, `TBL-EMPLOYEE_HISTORY`, `PKG-EMPLOYEE`, `TRG-BEFORE-UPDATE`, `TD-11`, `TD-12`, `XLINK-001`, `XLINK-002`.

#### 2.1 `GET /employees`
List employees with filter/paging.
- Query params: `department`, `job_role`, `status` (enum: `ACTIVE|TERMINATED|ON_LEAVE` — exact status vocabulary is `MISSING`; the three above are the minimum implied by `PKG-EMPLOYEE` procedures `terminate_employee`/`rehire_employee`), `hired_after`, `hired_before`, `cursor`, `limit`.
- 200 → list envelope of Employee resources (see §2.6 for schema).
- `meta.source_confidence`: MEDIUM (table existence HIGH; column set unconfirmed, OQ-006).

#### 2.2 `GET /employees/{employeeId}`
- 200 → single Employee resource.
- 404 if not found.

#### 2.3 `POST /employees` — Hire
Backing: `PKG-EMPLOYEE` (implicit hire path; the only lifecycle sub-flow the EKG says is functional as-shipped — "employee lifecycle beyond hire/basic-profile-edit is non-functional as shipped").
- Body: `{ first_name, last_name, email, hire_date, department, job_role, ...fields TBD pending OQ-006 }`
- **Business rule dependency**: hire-date related threshold (`BR-hire-date-drift`, `DISC-001`) is used somewhere in downstream eligibility calculations (leave accrual is the leading candidate per `VS-02`/`BR-leave-balance-formula`, unconfirmed). This endpoint MUST NOT hard-code 90 or 180 days internally; it must call a single `HireDatePolicy` service (see `15_FORWARD_ENGINEERING_SPECIFICATION.md` §4) so that once DISC-001 is resolved by the business, the fix is made in one place.
- 201 → created Employee resource.
- 409 if email already exists (email is the sole authentication lookup key per `PKG-SECURITY` defect — see §6 — so uniqueness here is a **security-load-bearing constraint**, not just a data-quality one).

#### 2.4 `PATCH /employees/{employeeId}` — Transfer / Promote / Update Profile
Backing: `PKG-EMPLOYEE.transfer_employee`, `PKG-EMPLOYEE.promote_employee`.
- `[REMEDIATED]` — In the source system, every call into `transfer_employee`/`promote_employee` trips the broken `TRG_EMP_BEFORE_UPDATE` trigger (`TD-11`, `TD-12`: column-shape mismatch and disallowed CHECK values on `EMPLOYEE_HISTORY` writes, raising `ORA-00904`/`ORA-02290` on every department or job change). This endpoint's contract assumes the trigger-equivalent history-write logic is re-implemented as an explicit, testable service call (not a database trigger side-effect) — see `15_FORWARD_ENGINEERING_SPECIFICATION.md` §3 for the generation rule that forbids reproducing implicit trigger side-effects as hidden behavior.
- Body: partial update — `{ department?, job_role?, salary_band? }`. Server writes a row to the employee-history equivalent resource (§2.5) as an explicit, atomic side-effect of this call, returned in the response so the caller can verify it happened (closing the silent-failure mode in `TD-11`/`TD-12`).
- 200 → updated Employee resource + `history_entry_id`.
- 422 if the resulting history entry would violate history-status vocabulary constraints (replaces the current ORA-02290 crash with a validated 4xx).

#### 2.5 `GET /employees/{employeeId}/history`
Backing: `TBL-EMPLOYEE_HISTORY`.
- 200 → list of history entries `{ id, employee_id, change_type, old_value, new_value, changed_by, changed_at }`. Exact column set is `MISSING` (OQ-006); this is the minimum shape implied by "transfer/promote/terminate/rehire" as change types.

#### 2.6 Employee Resource Schema (partial — gated on OQ-006)
```json
{
  "id": "string",
  "first_name": "string",
  "last_name": "string",
  "email": "string",
  "hire_date": "date",
  "department": "string",
  "job_role": "string",
  "status": "ACTIVE|TERMINATED|ON_LEAVE",
  "ssn_encrypted": "string (opaque; see 13_SECURITY_ARCHITECTURE.md re: PKG-SECURITY hard-coded key defect)"
}
```
**Open item**: full column list blocked on OQ-006 (28 of 30 tables not provided). Do not extend this schema by guessing; extend it only after the source DDL is re-ingested.

#### 2.7 `POST /employees/{employeeId}/terminate`, `POST /employees/{employeeId}/rehire`
Backing: `PKG-EMPLOYEE.terminate_employee`, `PKG-EMPLOYEE.rehire_employee`. Same `[REMEDIATED]` history-write note as §2.4 applies.

### 3. Domain: Leave Request (VS-02)

Backing nodes: `PP-leave-approval-gap`, `PKG-AUDIT`, `BR-leave-balance-formula`, `XLINK-003`.

#### 3.1 `POST /leave-requests`
- Confirmed functional in the source system (submission exists).
- Body: `{ employee_id, leave_type, start_date, end_date, reason? }`.
- Server computes `balance_check` using the **single canonical** leave-balance formula. `BR-leave-balance-formula` (`DISC-002`) records that the source has **two diverging formulas**; this endpoint must call one `LeaveBalanceService` implementation, not inline either legacy formula, so the eventual business decision on which formula is correct is a one-place fix.
- 201 → `{ id, status: "PENDING", balance_after: number|null }`. `balance_after` is `null` with `meta.source_confidence: LOW` until DISC-002 is resolved.

#### 3.2 `POST /leave-requests/{id}/cancel`
- Confirmed functional (self-cancellation exists per BA summary).
- 200 → `{ id, status: "CANCELLED" }`.

#### 3.3 `POST /leave-requests/{id}/approve` `[NEW — GAP CLOSURE]`
Backing: `PP-leave-approval-gap` — "No working screen anywhere in the scanned system for a manager to approve/reject a leave request." This is the **headline pain point** in the EKG; this endpoint (and §3.4) is new functionality required to close it, not a remediation of existing code.
- Auth: requester must be the employee's manager (manager relationship — table/column `MISSING`, OQ-006; must be resolved before implementation).
- Body: `{ comment? }`.
- Side effect: writes an audit entry via the `PKG-AUDIT`-equivalent service. `DISC-006` notes the source's `log_action` **swallows errors internally**, so leave workflows "succeed silently" with no audit trail. This endpoint's contract requires the audit write to be part of the same transaction as the status change — if the audit write fails, the approval **must fail** (opposite of source behavior), returned as a 500 with `error.code: AUDIT_WRITE_FAILED`. This is a deliberate behavior change; document it prominently for stakeholder sign-off (see `15_FORWARD_ENGINEERING_SPECIFICATION.md` §5, validation gate VG-04).
- 200 → `{ id, status: "APPROVED", audit_entry_id }`.

#### 3.4 `POST /leave-requests/{id}/reject` `[NEW — GAP CLOSURE]`
Same shape as §3.3 with `status: "REJECTED"` and a required `reason` field.

#### 3.5 `GET /leave-requests?manager_id={id}&status=PENDING` `[NEW — GAP CLOSURE]`
The manager inbox view backing the approve/reject screen. No equivalent exists in the source system.

### 4. Domain: Pay Period / Payroll Run (VS-03, VS-04)

Backing nodes: `VS-03`, `VS-04`. Content of the underlying rules/packages for this domain is `MISSING` from the EKG (no `PKG-PAYROLL` or equivalent was named in any layer summary). **This is a material gap.**

- `GET /pay-periods`, `GET /pay-periods/{id}`, `POST /payroll-runs`, `GET /payroll-runs/{id}` are stubbed here as **required contract slots** because the value streams are confirmed to exist (BA summary, HIGH confidence), but no package, table, or rule detail backs them.
- `meta.source_confidence: LOW` on all payroll endpoints.
- **Do not implement business logic for this domain from this document.** Treat §4 as a placeholder contract shape only, pending a full re-ingestion of BR-01..32 (OQ-003) and the remaining 28 tables (OQ-006), at least one of which almost certainly defines payroll calculation.

### 5. Domain: Review Cycle / Individual Review (VS-05, VS-06)

Same situation as §4: value streams confirmed to exist, zero rule/table/package content provided.
- `GET /review-cycles`, `POST /review-cycles/{id}/individual-reviews`, `GET /individual-reviews/{id}` — contract slots only, `meta.source_confidence: LOW`.

### 6. Domain: Authentication `[REMEDIATED — CRITICAL]`

Backing: `PKG-SECURITY`, `TBL-USER_CREDENTIALS-ABSENT`, `ASMP-004`, `XLINK-004`, `OQ-001`, `OQ-011`.

#### 6.1 `POST /auth/login`
- **Source system behavior (confirmed CRITICAL defect)**: `PKG_SECURITY.authenticate()` never checks a password — it looks up the employee by email and issues a valid session unconditionally. No `USER_CREDENTIALS` table exists anywhere in the 30-table schema (`ASMP-004`, HIGH confidence).
- **This contract mandates a full credential model does not yet exist and must be designed, not ported.** Body: `{ email, password }`. Server validates against a new credential store (schema TBD, but MUST be added — see `13_SECURITY_ARCHITECTURE.md` §2).
- 200 → `{ access_token, refresh_token, expires_in }`.
- 401 on any failure — **the source system has no 401 path today**; this is new, mandatory behavior, not an enhancement.
- This endpoint cannot be forward-engineered as a like-for-like port. Flag to stakeholders per `OQ-001`: is this repo a training/demo artifact (per `ASMP-005`) where the bypass is intentional, or does real employee PII (SSNs, per the encryption-key defect) flow through this system in production? The answer changes the urgency but **not the contract** — the contract in this document assumes production-grade auth regardless, per the security architecture's default-secure stance.

#### 6.2 `POST /auth/logout`, `POST /auth/refresh`
Standard token lifecycle; no source-system equivalent existed (sessions were unconditionally issued), so these are `[NEW]`.

### 7. Cross-Cutting: Audit Trail

Backing: `PKG-AUDIT`.

#### 7.1 `GET /audit-entries?entity_type=&entity_id=`
Exposes the remediated audit log (errors no longer swallowed, per §3.3 contract change) for compliance review.

### 8. Endpoints Explicitly Not Specified

Per the EKG's `MISSING` markers, this document does **not** invent contracts for:
- Payroll calculation detail (needs BR-01..32 full text, OQ-003)
- Any of the remaining 12 pain points / 7 automation opportunities (OQ-010) that may imply additional endpoints
- The 6 of 13 modules with zero component-registry entries (OQ-012) — unknown what capability they represent, so no endpoint can be safely inferred for them

Implementers must re-run this synthesis once those documents are available rather than extrapolating endpoint shapes from naming alone.