=== DOCUMENT: 11_API_CONTRACT_SPECIFICATION.md ===

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

=== DOCUMENT: 12_TECHNOLOGY_BLUEPRINT.md ===

# Technology Blueprint
## Forward Engineering Document 12

### 1. Purpose and Constraint

This blueprint defines the **shape** of a modern technology stack capable of replacing the source system, without naming a specific target stack, per the instruction that this document be technology-neutral where the target stack is unresolved. No target stack was supplied in Part 1 or Part 2 inputs; `16_GENERATION_MANIFEST.json.target_stack` is intentionally left empty. This document instead specifies **capability requirements** each layer of the new stack must satisfy, derived from what the EKG confirms about the current system's shape and defects.

### 2. Source System Shape (as confirmed by EKG)

- **Persistence**: A single relational schema, `SCHEMA-001`, 30 tables, accessed via PL/SQL packages (`PKG-SECURITY`, `PKG-EMPLOYEE`, `PKG-AUDIT`, and 7–8 more of unconfirmed name per `DISC-003`/OQ-002). `ASMP-001` (MEDIUM confidence) identifies this as Oracle PL/SQL + Oracle Forms based on package/trigger naming and Oracle-specific error codes (`ORA-00904`, `ORA-02290`).
- **Business logic placement**: Embedded in database triggers (`TRG_EMP_BEFORE_UPDATE`, `TRG_EMP_INSTEAD_OF_DELETE`) and stored procedures, not in an application/service tier. This is itself an architectural finding: business logic and data access are not separated (see `14_NFR_SPECIFICATION.md` §3, maintainability).
- **CI/CD maturity**: 0 of 14 capabilities present (confirmed absent, not merely unscanned). Any target blueprint must assume **greenfield CI/CD**, not a migration of existing pipelines.
- **13 application modules**, of which 6 have zero component-registry entries (`OQ-012`) — meaning roughly half the confirmed module count is architecturally opaque to this synthesis.

### 3. Layered Capability Requirements

#### 3.1 Data Layer
- Must support the full 30-table relational structure with strict referential integrity — the current system's defects (`TD-11`, `TD-12`) stem from **implicit** trigger-based integrity enforcement failing silently/loudly rather than from the relational model itself being wrong. Target stack requirement: whatever RDBMS is chosen, **application-tier-owned migrations** (versioned, reviewable) must replace database-trigger side effects for history-tracking (`EMPLOYEE_HISTORY`).
- Must support column-level encryption for sensitive fields (SSN) with **externalized key management** (KMS/secrets manager), replacing the hard-coded AES-256 key defect in `PKG-SECURITY`. This is a non-negotiable capability requirement regardless of stack choice.
- Must not assume `USER_CREDENTIALS` exists — it must be designed fresh (`ASMP-004`).

#### 3.2 Service / Application Layer
- Must externalize the business rules currently embedded in packages and triggers into named, independently testable, versioned rule modules — one rule module per `BR-*` once content is available (`OQ-003`). This directly targets `DISC-001`/`DISC-002` (rule drift) by making rule content a single reviewable artifact instead of scattered logic in multiple packages.
- Must provide a real authentication/authorization service (see `13_SECURITY_ARCHITECTURE.md`) — this is the single highest-priority capability gap, since the current system has **none** (`PKG-SECURITY.authenticate` bypass).
- Must expose the API contracts defined in `11_API_CONTRACT_SPECIFICATION.md` via whatever protocol the eventual stack decision selects (REST assumed as baseline; GraphQL/gRPC are compatible alternatives — contract *shape*, not transport, is what's fixed here).

#### 3.3 Presentation Layer
- Current system's presentation technology is unconfirmed beyond the phrase "Application/Forms Libraries" (`ASMP-001` basis), consistent with Oracle Forms. Target blueprint requires: a browser-based, decoupled frontend (see `19_FRONTEND_ARCHITECTURE.md`) — Oracle Forms cannot be ported 1:1 to any modern stack and must be redesigned, not migrated screen-by-screen. The one confirmed missing screen (manager leave-approval, `PP-leave-approval-gap`) must be **net-new** UI, not a port.

#### 3.4 Cross-Cutting
- Observability/audit: must not silently swallow errors (`DISC-006`, `PKG-AUDIT` defect). Target requirement: structured, queryable audit log with guaranteed write semantics (fail the parent transaction if the audit write fails, or use an outbox/transactional-log pattern if eventual consistency is architecturally preferred — this decision is deferred to the eventual stack choice, but "swallow and continue" is explicitly disallowed).
- CI/CD: must stand up all 14 missing capabilities from zero (see `18_DEPLOYMENT_ARCHITECTURE.md`) — source repo confirmed 0/14, so there is no partial pipeline to extend.

### 4. Decision Log — What This Document Does NOT Decide

To remain technology-neutral, the following are explicitly deferred to a stakeholder-driven stack-selection exercise, not decided here:
- RDBMS vendor (stay on Oracle vs. migrate) — depends on licensing/ops constraints not present in the EKG.
- Application-tier language/framework.
- Frontend framework (see `19_FRONTEND_ARCHITECTURE.md` for shape-level guidance only).
- Deployment target (container orchestration platform, PaaS, serverless) — see `18_DEPLOYMENT_ARCHITECTURE.md` for capability requirements independent of vendor.
- Sync vs. async messaging for payroll-run processing (`VS-04`) — cannot be decided without the missing payroll rule content (`OQ-003`, §4 gap in `11_API_CONTRACT_SPECIFICATION.md`).

### 5. Blueprint Risk Register

| Risk | Source | Impact if ignored |
|---|---|---|
| Building auth service without resolving OQ-001 | `PKG-SECURITY` | May over- or under-invest in security hardening relative to actual production exposure |
| Porting trigger logic as literal triggers | `TD-11`, `TD-12` | Reproduces the exact defect being remediated |
| Assuming 30-table schema is complete | `ASMP-002` (LOW confidence) | Target schema may omit tables/relationships never disclosed to this synthesis |
| Building payroll/review-cycle services without BR content | `OQ-003`, §4/§5 gaps | High rework risk; these domains are effectively unspecified today |

=== DOCUMENT: 13_SECURITY_ARCHITECTURE.md ===

# Security Architecture
## Forward Engineering Document 13 — including RBAC Model and Modernization Plan

### 1. Executive Summary

The source system, as characterized by the EKG, has **two confirmed CRITICAL security defects** and **zero confirmed identity/access model**:

1. `PKG-SECURITY.authenticate()` performs no password check whatsoever — it looks up an employee by email and unconditionally issues a valid session (HIGH confidence, `PKG-SECURITY`).
2. The AES-256 key used to encrypt SSNs is a hard-coded literal string inside `PKG_SECURITY.pkb`, committed to version control (HIGH confidence, `PKG-SECURITY`).
3. No `USER_CREDENTIALS` or password table exists anywhere in the 30-table schema (`ASMP-004`, HIGH confidence) — meaning defect #1 is not a bug in an otherwise-complete credential system, it is the **absence of a credential system**.

`OQ-001` (Data layer's top Gate-G1 open question) asks whether this reflects an intentionally-flawed training repo or a real production exposure. **This document proceeds on the conservative assumption that it is production-relevant** until stakeholders confirm `ASMP-005`, because SSNs (real PII) are confirmed to be in scope for encryption — a training-only system would have little reason to encrypt SSNs at all. This assumption should be revisited the moment OQ-001 is answered.

### 2. Identity and Credential Model (New Build Required)

No credential table exists to migrate — this is greenfield design, not remediation.

- **New table**: credential store holding, per employee: a salted, adaptively-hashed password (e.g., a modern password-hashing KDF — algorithm choice deferred to stack selection, but MUST NOT be reversible encryption), MFA enrollment state, failed-attempt counters, lockout timestamps.
- **Key management**: SSN encryption key MUST move to an externalized secret manager / KMS with rotation support. The literal-string-in-source-control defect is remediated by (a) removing the key from any versioned file, (b) rotating the key (the old key must be treated as compromised, since it has been in version control), (c) re-encrypting all existing SSN data under the new key as a one-time migration task.
- **Session issuance**: must occur only after credential verification succeeds. The current unconditional-issuance behavior must be treated as a hard regression to prevent, not a behavior to preserve compatibility with.

### 3. RBAC Model

The EKG does not provide an explicit role/permission table (no `TBL-ROLES` or equivalent named in any summary; part of the `MISSING` 28-of-30 tables, `OQ-006`). The RBAC model below is therefore derived from **confirmed functional roles implied by the value streams and packages**, not from a source-confirmed roles table. Treat this as a MEDIUM-confidence starting model to validate against the real schema once available.

| Role | Derived from | Key permissions |
|---|---|---|
| Employee (self-service) | `VS-01`, `VS-02` (submission/cancellation confirmed functional) | Read own profile, own history; create/cancel own leave requests |
| Manager | `PP-leave-approval-gap` (the missing screen implies a Manager role must exist to use it) | All Employee permissions for reports; approve/reject leave requests (`§3.3`/`§3.4` of API spec) |
| HR Administrator | `PKG-EMPLOYEE` (transfer/promote/terminate/rehire imply an HR-admin actor) | Full employee lifecycle mutation; view audit entries |
| Payroll Administrator | `VS-03`, `VS-04` | Payroll run execution — permission detail blocked on `OQ-003`/§4 gap |
| System/Audit Reviewer | `PKG-AUDIT` remediation (§7 of API spec) | Read-only access to full audit trail across all entities |

**Modernization requirement**: Authorization checks must be enforced at the service layer (see `12_TECHNOLOGY_BLUEPRINT.md` §3.2), not solely in UI screen visibility, since the source system's Oracle-Forms-style presentation (per `ASMP-001`) likely conflated screen access with authorization — a pattern this architecture explicitly rejects.

### 4. Threat Model Highlights

| Threat | Source-system status | Target requirement |
|---|---|---|
| Credential stuffing / brute force | N/A — no password exists to guess | Rate-limit and lock out `POST /auth/login` |
| Session hijacking via unconditional issuance | Confirmed present (defect #1) | Sessions issued only post-verification; short-lived access tokens + refresh rotation |
| PII (SSN) exposure via compromised key | Confirmed present (defect #2) | KMS-managed key, rotation, re-encryption, access logging on every decrypt |
| Silent audit-trail gaps | Confirmed present (`DISC-006`, `PKG-AUDIT` swallows errors) | Fail-closed audit writes (see API spec §3.3) |
| Business-layer blindness to security defects | `XLINK-004`, `OQ-011` — BA summary makes no mention of these defects at all | Security findings must be added as first-class business risk/capability-gap entries, not treated as Data-layer-only concerns |

### 5. Modernization Plan (Phased)

**Phase 0 — Containment (pre-development)**
- Rotate the exposed AES-256 key immediately regardless of the OQ-001 answer; a key known to be in version control is compromised by definition, independent of whether the system is "training" or "production."
- Restrict/monitor access to the current `authenticate()` path if the source system is still live anywhere.

**Phase 1 — Credential Foundation**
- Stand up the new credential store and password-hashing service.
- Implement `POST /auth/login`, `/logout`, `/refresh` per API spec §6.

**Phase 2 — RBAC Enforcement**
- Implement the role model in §3 at the service layer for all endpoints in `11_API_CONTRACT_SPECIFICATION.md`.
- Close `PP-leave-approval-gap` behind the Manager role specifically — this pain point and this security phase are the same delivery, not two separate workstreams (see `XLINK-003`).

**Phase 3 — Audit Hardening**
- Replace swallow-on-error audit logging with fail-closed semantics.

**Phase 4 — Encryption & Secrets Lifecycle**
- Full KMS integration, key rotation policy, re-encryption of historical SSN data.

**Gate**: None of Phase 1–4 should begin against production data until `OQ-001` is answered by stakeholders, since the answer affects data-handling obligations (e.g., breach notification if this has been production and PII-exposed).

### 6. Traceability Table

| Defect/Node | Document Section |
|---|---|
| `PKG-SECURITY` auth bypass | §2, §5 Phase 1 |
| `PKG-SECURITY` hard-coded key | §2, §5 Phase 0/4 |
| `ASMP-004` (no credential table) | §2 |
| `PP-leave-approval-gap` | §3, §5 Phase 2 |
| `DISC-006` (audit swallow) | §4, §5 Phase 3 |
| `XLINK-004`/`OQ-011` | §4 |

=== DOCUMENT: 14_NFR_SPECIFICATION.md ===

# Non-Functional Requirements Specification
## Forward Engineering Document 14

### 1. Grounding and Gap Disclosure

The EKG confirms the **existence** of 3 technology-layer NFRs (`NFR-01..NFR-03`) but their content is `MISSING` (`OQ-005`). This document therefore cannot restate the source system's original NFRs verbatim. Instead, it derives a working NFR set from **defects and quality signals that are directly evidenced** in the EKG, and flags each derived NFR's confidence level. Where `NFR-01..03` content becomes available, reconcile against this document rather than discarding it — the derived NFRs below are evidence-based even without the original numbered text.

### 2. Reliability

- **NFR-R1 (derived, HIGH confidence)**: Routine HR transactions (department/job changes) MUST NOT produce unhandled database errors. Source system baseline: `TRG_EMP_BEFORE_UPDATE` raises unhandled `ORA-00904`/`ORA-02290` on every department or job change (`TD-11`, `TD-12`) — described in the EKG as "a guaranteed, reproducible failure on routine HR transactions." Target: 0 unhandled-exception rate on the transfer/promote/terminate/rehire endpoints (API spec §2.4, §2.7), verified by an automated regression test that specifically replays these four operations.
- **NFR-R2 (derived, HIGH confidence)**: Audit-trail writes must not fail silently. Baseline: `PKG_AUDIT.log_action` swallows errors (`DISC-006`). Target: 100% of state-changing operations either produce a verifiable audit entry or fail the parent transaction (see Security Architecture §4, Phase 3).

### 3. Security

Fully specified in `13_SECURITY_ARCHITECTURE.md`. Summary NFRs:
- **NFR-S1**: All authentication attempts MUST verify a credential (baseline: 0% verification today — confirmed bypass).
- **NFR-S2**: No cryptographic key material may exist in source control (baseline: violated today, hard-coded AES-256 key).
- **NFR-S3**: SSN and other PII fields must be encrypted at rest with externally managed keys, and every decrypt operation logged.

### 4. Maintainability

- **NFR-M1 (derived, HIGH confidence)**: Business rule content must be centrally documented and single-sourced. Baseline: at least 2 of 32 business rules are known to have **unresolved value drift across sources** (`DISC-001` hire-date 90 vs 180 days, `DISC-002` leave-balance formula divergence) — and this is only the 2 of 32 rules whose content was even available to this synthesis; the true drift rate across all 32 is unknown (`OQ-003`). Target: every `BR-*` rule implemented as exactly one callable service/function referenced by all consumers (see Technology Blueprint §3.2, API spec §2.3 `HireDatePolicy` and §3.1 `LeaveBalanceService` patterns).
- **NFR-M2 (derived, HIGH confidence)**: Architecture documentation must match the deployable artifact. Baseline: component/dependency diagrams draw edges not present in the underlying `dependency-graph.json` (`DISC-004`); the same document's own sections disagree on package count, 10 vs. 11 (`DISC-003`); the required `architecture-output/final/` file tree was never produced, everything was consolidated into one root file instead (`DISC-008`). Target: a CI gate (see `18_DEPLOYMENT_ARCHITECTURE.md`) that fails the build if diagram-derived edges/counts don't match a machine-generated dependency graph.
- **NFR-M3 (derived, MEDIUM confidence)**: Coupling metrics must state their methodology. Baseline: `EMPLOYEES` afferent-coupling count of 5 blends 4 real edges with 1 relationship the source prose itself calls "indirect" (`DISC-005`). Target: any coupling metric published in target-system documentation must separate direct and indirect edges in its reported count.

### 5. Observability

- **NFR-O1 (derived, HIGH confidence)**: CI/CD and pipeline observability must be built from zero. Baseline: 0 of 14 CI/CD maturity capabilities present, confirmed absent rather than merely unscanned. Target: see `18_DEPLOYMENT_ARCHITECTURE.md` for the specific 14-capability checklist to close.

### 6. Data Integrity / Completeness

- **NFR-D1 (derived, MEDIUM confidence)**: No orphaned schema objects. Baseline: `SEQ_EMP_NUMBER` is a possible orphaned sequence, unresolved (`OQ-008`). Target: automated schema-lint step in CI that flags sequences/objects with zero referencing call sites.
- **NFR-D2 (derived, LOW confidence — scope unconfirmed)**: Full schema coverage. Baseline: only 2 of 30 tables were named explicitly to this synthesis (`OQ-006`); NFRs for the remaining 28 tables cannot be stated. Flag as an open NFR-authoring task once the full DDL is available.

### 7. Usability / Functional Completeness

- **NFR-U1 (derived, HIGH confidence, directly tied to the single highest-severity pain point)**: Every value-stream state that can be entered must have a corresponding UI path to exit it. Baseline violation: leave requests can be submitted and self-cancelled, but **no screen exists anywhere in the system for a manager to approve or reject one** (`PP-leave-approval-gap`) — described as a HIGH-severity pain point. Target: see UI/UX Specification (`20_UI_UX_SPECIFICATION.md`) manager-inbox requirement; treat this as an acceptance-blocking NFR, not a nice-to-have.

### 8. NFRs Explicitly Not Derivable

The following NFR categories (performance/throughput targets, availability/uptime SLAs, scalability targets, data-retention/compliance windows) have **no evidence in the EKG** and are not fabricated here. `NFR-01..NFR-03`'s actual content (`OQ-005`) may cover exactly these; until recovered, treat performance/availability/compliance NFRs as **undefined**, not as "inherit industry defaults" — an architect must obtain them from stakeholders before committing to SLAs in `18_DEPLOYMENT_ARCHITECTURE.md`.

### 9. Traceability Table

| NFR | EKG Node(s) |
|---|---|
| NFR-R1 | `TD-11`, `TD-12`, `XLINK-002` |
| NFR-R2 | `DISC-006`, `PKG-AUDIT` |
| NFR-S1..S3 | `PKG-SECURITY`, `ASMP-004`, `OQ-001` |
| NFR-M1 | `DISC-001`, `DISC-002` |
| NFR-M2 | `DISC-004`, `DISC-003`, `DISC-008` |
| NFR-M3 | `DISC-005` |
| NFR-O1 | CI/CD maturity finding (Technology layer) |
| NFR-D1 | `OQ-008` |
| NFR-D2 | `OQ-006` |
| NFR-U1 | `PP-leave-approval-gap`, `XLINK-003` |

=== DOCUMENT: 15_FORWARD_ENGINEERING_SPECIFICATION.md ===

# Forward Engineering Specification
## Forward Engineering Document 15 — Generation Rules and Validation Gates

### 1. Purpose

This document is the operating manual for anyone (human or code-generation agent) turning Documents 11–14 and 16–20 into running code. It states the **rules that govern generation** and the **gates that must pass** before generated artifacts are considered acceptable, given the EKG's confirmed defects and confirmed gaps.

### 2. Generation Principles

1. **Cite before you code.** Every generated module must be traceable to an EKG node ID in a header comment or commit message (e.g., `// implements VS-02, remediates PP-leave-approval-gap`). If no node ID exists for a requested feature, stop and flag it — do not silently invent scope.
2. **Do not port defects.** `TD-11`, `TD-12`, the `PKG-SECURITY` auth bypass, the hard-coded encryption key, and the `PKG-AUDIT` swallow-error pattern are **confirmed defects**, not confirmed requirements. A generation pass that reproduces any of these behaviors "for compatibility" has failed, full stop — there is no compatibility value in reproducing a guaranteed crash or a security bypass.
3. **Single source of truth per rule.** Where the EKG shows rule drift (`DISC-001`, `DISC-002`), generate exactly one implementation and route every caller through it (see API spec §2.3, §3.1). Never generate two code paths encoding two different thresholds/formulas "to be safe" — that is the drift bug, replicated in code.
4. **MISSING ≠ empty.** Where content is `MISSING` in the EKG (e.g., `BR-01..32` full text, 28 of 30 tables, `AP-01..21`, `TD-13..32` besides TD-11/12), do not generate placeholder business logic that looks complete. Generate an explicit stub that fails loudly (e.g., `NotImplementedError("blocked on OQ-003")`) so gaps remain visible in code review and in test failures, rather than being silently paved over with guessed behavior.
5. **New functionality must be labeled.** Anything closing a confirmed gap (leave approval, `PP-leave-approval-gap`; the credential store, `ASMP-004`) is `[NEW]`, not a port — reviewers should not expect source-system parity for these paths, and should specifically scrutinize them since there is no existing behavior to diff against.

### 3. Rule: No Implicit Trigger-Equivalent Side Effects

Directly targeting `TD-11`/`TD-12`/`XLINK-002`: any side effect that the source system implemented as a database trigger (history writes, cascading status changes) must be re-implemented as an **explicit, named, independently callable and independently testable** function in the service layer — never as a database trigger, and never as an implicit side effect buried inside an ORM hook that isn't independently unit-testable. Rationale: the entire class of TD-11/TD-12 defects existed because a side effect was invisible to the caller until it crashed in production. Regenerating it invisibly, even in new tech, reproduces the risk class even if the specific bug doesn't recur.

### 4. Rule: Policy Objects for Drifted Business Rules

Where `DISC-001`/`DISC-002`-style drift is known or suspected, generate a single **Policy object** (e.g., `HireDatePolicy`, `LeaveBalanceService`) with:
- One canonical implementation
- A version/changelog field
- Unit tests asserting the *current agreed* threshold/formula (to be filled in once business stakeholders resolve `DISC-001`/`DISC-002` — do not guess 90 vs 180 or pick a formula unilaterally; escalate to `OQ-003` resolution first)

### 5. Validation Gates

Generated artifacts must pass these gates before merge. Each gate ties to a specific EKG-confirmed risk.

- **VG-01 (Schema completeness gate)**: Fails if any generated table/entity references a column not present in a re-verified source DDL. Purpose: prevent the 28-of-30 unknown-table gap (`OQ-006`) from being silently papered over with invented columns.
- **VG-02 (Defect non-reproduction gate)**: Automated test suite must include a regression test for each of `TD-11`, `TD-12`, the auth bypass, and the hard-coded key, asserting the *old* behavior does **not** occur. Fails the build if it does.
- **VG-03 (Rule single-sourcing gate)**: Static analysis check that no business threshold/formula literal (e.g., a bare `90`, `180`, or an inline leave-balance formula) appears outside a designated Policy object. Targets `DISC-001`/`DISC-002` recurrence.
- **VG-04 (Audit fail-closed gate)**: Integration test asserting that a forced audit-write failure aborts the parent transaction (targets `DISC-006`). Manual sign-off required before shipping, per the deliberate-behavior-change note in API spec §3.3.
- **VG-05 (Diagram/graph consistency gate)**: CI step regenerates dependency graphs from actual code and diffs against any checked-in architecture diagrams; fails on mismatch (targets `DISC-004`, `DISC-003`, `DISC-005`).
- **VG-06 (Gap-closure completeness gate)**: `PP-leave-approval-gap` closure (manager approve/reject) must have end-to-end test coverage and a UI screen before this gate passes — this is the single highest-severity confirmed pain point and is treated as release-blocking, not optional polish.
- **VG-07 (Open-question escalation gate)**: Before generating payroll (`VS-03`/`VS-04`) or review-cycle (`VS-05`/`VS-06`) business logic beyond the contract-shape stubs in API spec §4–5, this gate requires a signed-off resolution of `OQ-003` (business rule content). Fails by default; only a human stakeholder can unblock it.

### 6. Generation Sequencing

Recommended order, respecting dependency direction in the EKG's cross-links:
1. Credential/RBAC foundation (Security Architecture) — nothing else should be exposed over a network without this.
2. Employee Lifecycle core (`VS-01`) with VG-01/VG-02 enforced — this is the canonical cross-layer node (`XLINK-001`) everything else depends on.
3. Leave Request + manager-approval gap closure (`VS-02`) — second priority given `PP-leave-approval-gap`'s severity.
4. Audit hardening (cross-cutting, VG-04).
5. Payroll/Review-cycle domains — held behind VG-07 pending `OQ-003`.

### 7. What This Document Does Not Cover

Concrete code generation templates, scaffolding commands, and stack-specific tooling are out of scope until `12_TECHNOLOGY_BLUEPRINT.md`'s deferred stack decisions (§4 of that document) are made by stakeholders.

=== DOCUMENT: 16_GENERATION_MANIFEST.json ===

```json
{
  "manifest_version": "1.0",
  "generated_by": "Foundation Synthesis Agent",
  "part": "2 of 2",
  "source_documents": [
    "11_API_CONTRACT_SPECIFICATION.md",
    "12_TECHNOLOGY_BLUEPRINT.md",
    "13_SECURITY_ARCHITECTURE.md",
    "14_NFR_SPECIFICATION.md",
    "15_FORWARD_ENGINEERING_SPECIFICATION.md"
  ],
  "target_stack": {
    "database": "",
    "backend_language": "",
    "backend_framework": "",
    "frontend_framework": "",
    "deployment_target": "",
    "ci_cd_platform": "",
    "secrets_management": "",
    "message_broker": ""
  },
  "domains": [
    {
      "id": "VS-01",
      "name": "Employee Lifecycle",
      "priority": 1,
      "generation_status": "SPECIFIED_PARTIAL",
      "blocking_open_questions": ["OQ-006"],
      "endpoints": ["GET /employees", "GET /employees/{id}", "POST /employees", "PATCH /employees/{id}", "GET /employees/{id}/history", "POST /employees/{id}/terminate", "POST /employees/{id}/rehire"],
      "known_defects_to_not_reproduce": ["TD-11", "TD-12"]
    },
    {
      "id": "VS-02",
      "name": "Leave Request",
      "priority": 2,
      "generation_status": "SPECIFIED_PARTIAL",
      "blocking_open_questions": ["DISC-002"],
      "endpoints": ["POST /leave-requests", "POST /leave-requests/{id}/cancel", "POST /leave-requests/{id}/approve", "POST /leave-requests/{id}/reject", "GET /leave-requests"],
      "gap_closures": ["PP-leave-approval-gap"]
    },
    {
      "id": "VS-03",
      "name": "Pay Period",
      "priority": 5,
      "generation_status": "STUB_ONLY",
      "blocking_open_questions": ["OQ-003", "OQ-006"],
      "endpoints": ["GET /pay-periods", "GET /pay-periods/{id}"]
    },
    {
      "id": "VS-04",
      "name": "Payroll Run",
      "priority": 5,
      "generation_status": "STUB_ONLY",
      "blocking_open_questions": ["OQ-003", "OQ-006"],
      "endpoints": ["POST /payroll-runs", "GET /payroll-runs/{id}"]
    },
    {
      "id": "VS-05",
      "name": "Review Cycle",
      "priority": 5,
      "generation_status": "STUB_ONLY",
      "blocking_open_questions": ["OQ-003", "OQ-010"],
      "endpoints": ["GET /review-cycles"]
    },
    {
      "id": "VS-06",
      "name": "Individual Review",
      "priority": 5,
      "generation_status": "STUB_ONLY",
      "blocking_open_questions": ["OQ-003", "OQ-010"],
      "endpoints": ["POST /review-cycles/{id}/individual-reviews", "GET /individual-reviews/{id}"]
    },
    {
      "id": "AUTH",
      "name": "Authentication and Credential Management",
      "priority": 0,
      "generation_status": "SPECIFIED_NEW_BUILD",
      "blocking_open_questions": ["OQ-001"],
      "endpoints": ["POST /auth/login", "POST /auth/logout", "POST /auth/refresh"],
      "known_defects_to_not_reproduce": ["PKG-SECURITY-auth-bypass", "PKG-SECURITY-hardcoded-key"]
    }
  ],
  "validation_gates": ["VG-01", "VG-02", "VG-03", "VG-04", "VG-05", "VG-06", "VG-07"],
  "blocking_open_questions_index": [
    "OQ-001", "OQ-002", "OQ-003", "OQ-004", "OQ-005", "OQ-006", "OQ-007", "OQ-008", "OQ-009", "OQ-010", "OQ-011", "OQ-012"
  ],
  "generation_readiness_summary": {
    "ready_domains": ["AUTH-foundation-shape", "VS-01-partial", "VS-02-partial"],
    "blocked_domains": ["VS-03", "VS-04", "VS-05", "VS-06"],
    "overall_status": "PARTIAL - see 17_FORWARD_ENGINEERING_READINESS_REPORT.md"
  }
}
```

=== DOCUMENT: 17_FORWARD_ENGINEERING_READINESS_REPORT.md ===

# Forward Engineering Readiness Report
## Forward Engineering Document 17 — Scored Readiness Assessment

### 1. Method

Each dimension is scored 0–5 (0 = no evidence, 5 = fully specified and verified) based strictly on what the EKG substantiates. Scores below reflect **information completeness**, not code quality — a 5 means "we have enough to build correctly," not "the source system is good."

### 2. Scorecard

| Dimension | Score /5 | Basis |
|---|---|---|
| Business rule coverage | 1 | Only 2 of 32 business rules have known content (`BR-hire-date-drift`, `BR-leave-balance-formula`); both are known specifically *because they are broken/drifted*, not because rule content generally was provided. 30 of 32 rules: `MISSING` (`OQ-003`). |
| Data schema coverage | 1 | 2 of 30 tables named explicitly (`TBL-EMPLOYEES`, `TBL-EMPLOYEE_HISTORY`), plus one confirmed-absent table (`USER_CREDENTIALS`). 28 of 30: `MISSING` (`OQ-006`). |
| Application/component coverage | 2 | Module count (13) and defect count within named packages are HIGH confidence, but 6 of 13 modules have zero component-registry entries (`OQ-012`) and package count itself is disputed 10 vs. 11 (`DISC-003`). |
| Technology/architecture pattern coverage | 0 | `AP-01..21` count confirmed, zero content provided (`OQ-005`). |
| NFR coverage | 1 | `NFR-01..03` count confirmed, zero original content; Document 14 derives a working substitute set from defect evidence only. |
| Technical debt coverage | 1 | 32 items counted with severity breakdown (HIGH confidence), but only 2 of 32 have descriptive content (`TD-11`, `TD-12`). |
| Pain point / opportunity coverage | 1 | 1 of 13 pain points detailed (the leave-approval gap, which is also the most severe one identified); 12 of 13 and all 7 automation opportunities `MISSING` (`OQ-010`). |
| Security posture clarity | 4 | Both critical defects (auth bypass, hard-coded key) are described with HIGH confidence and enough detail to design a remediation (Document 13). Deduct 1 point because the production-vs-training classification (`OQ-001`) remains unresolved, which affects urgency/compliance framing. |
| Cross-layer consistency | 2 | Several disputed metrics/diagrams are explicitly identified (`DISC-003`, `DISC-004`, `DISC-005`, `DISC-008`) rather than silently reconciled — this is good process hygiene, but it means the Application layer's own outputs are internally inconsistent and not yet resolved. |
| CI/CD & deployment baseline | 1 | Confirmed 0/14 capabilities present — a clear, if minimal, baseline. Score reflects that this is a clean "start from zero" signal, not a partial pipeline needing partial migration. |

**Overall Forward-Engineering Readiness: 1.4 / 5 (weighted toward the rule/schema/pattern dimensions, which carry the most implementation risk if wrong).**

### 3. Interpretation

This is **not** a verdict that the synthesis failed — it is a verdict that **Part 2 was asked to run on four hand-off summary paragraphs instead of the full underlying documents** (per the `critical_caveat` in the EKG metadata). The scorecard should be read as: "here is exactly how much of the real system we can safely build from today, and here is what would change the score."

### 4. What Would Move Each Score to a Passing Level (≥3)

| Dimension | Unblocking action |
|---|---|
| Business rule coverage | Re-ingest full BR-01..32 text (`OQ-003`) |
| Data schema coverage | Re-ingest full 30-table DDL (`OQ-006`) |
| Application coverage | Re-ingest component registry + dependency-graph.json in full; resolve `DISC-003`, `OQ-012` |
| Architecture pattern coverage | Re-ingest AP-01..21 full text (`OQ-005`) |
| NFR coverage | Re-ingest NFR-01..03 full text (`OQ-005`) |
| Technical debt coverage | Re-ingest TD-01..32 full text (`OQ-004`) |
| Pain point coverage | Re-ingest full pain-point and automation-opportunity lists (`OQ-010`) |
| Security posture | Resolve `OQ-001` with stakeholders |
| Cross-layer consistency | Re-run Application layer's own validation against `database.json`/`dependency-graph.json` to settle `DISC-003`/`DISC-004`/`DISC-005` |
| CI/CD baseline | No unblocking needed — 0/14 is already a fully-known baseline; proceed directly to Document 18 |

### 5. Gate Recommendation

Consistent with the Data layer's own Gate G1 recommendation (`NOT READY`, 5 open questions, only 1 named), this synthesis recommends: **DO NOT proceed to full-scale code generation for `VS-03`, `VS-04`, `VS-05`, `VS-06`, or the remaining 30 business rules until the unblocking actions in §4 are complete.** Proceeding is safe today, and recommended, **only** for:
- Authentication/credential foundation (Document 13) — the defects here are already fully enough characterized to fix regardless of missing context elsewhere.
- `VS-01` Employee Lifecycle core, gated by VG-01/VG-02 (Document 15) — schema gaps must be closed for the *specific* fields used, even if the full 30-table picture isn't ready.
- `VS-02` Leave Request + the manager-approval gap closure — again gated by the specific fields needed, and justified by this being the single highest-severity confirmed pain point in the entire EKG.

### 6. Confidence Note

This report's own scores inherit the confidence levels of the EKG nodes they're built on. Where the EKG marked something HIGH confidence but with `MISSING` content (e.g., technical debt count), this report scores the *content* dimension low even though the *count* is trustworthy — readiness for code generation depends on content, not counts.

=== DOCUMENT: 18_DEPLOYMENT_ARCHITECTURE.md ===

# Deployment Architecture
## Forward Engineering Document 18

### 1. Baseline

The EKG confirms 0 of 14 CI/CD maturity capabilities present in the source system — "confirmed absent, not just unscanned." This is treated as a clean-slate finding: there is no existing pipeline to extend, migrate, or reconcile with. This document specifies the 14-capability target set generically (technology-neutral, consistent with `12_TECHNOLOGY_BLUEPRINT.md` §4 deferring platform choice) and a phased plan to reach it.

### 2. The 14 Target Capabilities

The specific 14 capabilities scanned for were not enumerated in the EKG (content beyond the "0 of 14" count is `MISSING`). Absent that list, this document specifies the **standard capability set** any senior architect would scan for, so that Document 18 remains actionable despite the gap. This substitute list should be reconciled against the original 14 once recovered:

1. Source control branching/PR policy
2. Automated build on commit
3. Automated unit test execution in CI
4. Automated integration test execution in CI
5. Static code analysis / linting gate
6. Security/dependency scanning (SAST/SCA)
7. Secrets scanning (directly relevant — the hard-coded key defect, `PKG-SECURITY`, would have been caught by this)
8. Automated schema migration tooling (versioned, reviewable — replacing the current implicit trigger-based side effects, `TD-11`/`TD-12`)
9. Environment promotion pipeline (dev → staging → prod)
10. Automated deployment (no manual artifact copying)
11. Rollback capability
12. Infrastructure-as-code for environment provisioning
13. Centralized logging/monitoring
14. Alerting tied to defined SLOs

### 3. Environment Topology (capability-level, stack-neutral)

- **Dev**: full stack, seeded with synthetic data only. Given the confirmed presence of real-shaped PII fields (SSN encryption in `PKG-SECURITY`), synthetic/masked data is mandatory in any non-production environment — this is a direct consequence of `OQ-001` being unresolved; treat all non-prod data as if it *might* be production-derived PII until proven otherwise.
- **Staging**: production-topology mirror for pre-release validation, including the VG-01..VG-07 validation gates from Document 15 running as CI steps.
- **Production**: gated by Phase 0–4 of the Security Architecture modernization plan (Document 13) — specifically, Phase 0 (key rotation) must complete **before** any production cutover, regardless of overall migration timeline.

### 4. CI/CD Pipeline Stages (mapped to Document 15's validation gates)

```
commit → build → unit tests → VG-02 (defect non-reproduction) → VG-03 (rule single-sourcing)
       → VG-05 (diagram/graph consistency) → integration tests → VG-04 (audit fail-closed)
       → VG-01 (schema completeness) → package/artifact → deploy to staging
       → smoke tests incl. VG-06 (leave-approval gap closure e2e) → manual gate for prod → deploy to prod
```

`VG-07` (open-question escalation) is a pipeline **blocker**, not a stage — it prevents the payroll/review-cycle domains from entering the pipeline at all until `OQ-003` is resolved (see Document 17 §5).

### 5. Rollback and Data Safety

Given the source system's confirmed history of silent/loud data-write failures (`TD-11`, `TD-12`, `DISC-006`), any deployment architecture for this system must treat **migration reversibility** as a first-class deployment concern: every schema migration tied to employee-history or audit-log tables must ship with a tested down-migration before it is allowed past the staging gate.

### 6. Explicitly Deferred

Specific cloud provider, container orchestrator, IaC tool, and observability vendor selection are deferred to the stack decision in `12_TECHNOLOGY_BLUEPRINT.md` §4. This document specifies capability and gate requirements that any concrete platform choice must satisfy.

=== DOCUMENT: 19_FRONTEND_ARCHITECTURE.md ===

# Frontend Architecture
## Forward Engineering Document 19

### 1. Grounding and Constraint

The source presentation layer is referenced in the EKG only indirectly, via `ASMP-001` (MEDIUM confidence: "Application/Forms Libraries" layer label plus PL/SQL package naming suggests an Oracle Forms-based UI). No source screen inventory, navigation map, or UI component list was provided to this synthesis. This document therefore specifies **frontend architecture shape and principles**, not a screen-by-screen port — a 1:1 port from Oracle Forms to any modern web frontend is not architecturally meaningful even if the source screens were fully known, since Forms' client-server, PL/SQL-bound interaction model has no direct modern equivalent.

### 2. Architectural Principles

1. **Decoupled from the data tier.** Unlike the source system (where, per `ASMP-001` and the trigger-based logic findings, business logic and presentation are entangled with the database), the target frontend must talk only to the API contracts in Document 11 — never directly to the database, and never assume triggers will enforce business rules on its behalf (per Document 15 §3, side effects must be explicit and service-owned).
2. **Component boundaries follow value streams, not source screens.** Since no source screen inventory exists, organize the frontend by the 6 confirmed value streams (`VS-01..VS-06`) as top-level route/module boundaries: Employee Lifecycle, Leave Request, Pay Period, Payroll Run, Review Cycle, Individual Review.
3. **Role-aware rendering, not role-aware trust.** Per Security Architecture §3, the RBAC model must be enforced server-side; the frontend may hide UI affordances by role for usability, but must never treat client-side role checks as an authorization boundary (directly guards against reproducing the source system's apparent conflation of screen access with authorization).

### 3. Module Breakdown

| Module | Value Stream | Confirmed functional scope in source | Net-new scope required |
|---|---|---|---|
| Employee Directory & Profile | VS-01 | Basic hire/profile edit | History view (§2.5 of API spec), transfer/promote/terminate/rehire flows with explicit success/failure feedback (replacing the silent ORA-crash behavior) |
| Leave Management | VS-02 | Submit, self-cancel | **Manager inbox (approve/reject)** — entirely new; see §4 below, this is the single most important net-new module in the whole system per `PP-leave-approval-gap` |
| Pay Period / Payroll Run | VS-03, VS-04 | Unconfirmed — content `MISSING` | Full module design deferred; build only the contract-shape screens (list/detail) until `OQ-003` resolved |
| Review Cycle / Individual Review | VS-05, VS-06 | Unconfirmed — content `MISSING` | Same deferral as above |
| Auth / Session | N/A (cross-cutting) | Confirmed broken (unconditional session issuance) | Full login/logout/refresh flow, net-new (Security Architecture §2) |
| Audit Trail Viewer | Cross-cutting | Not confirmed to exist as a UI in source | New read-only module for Audit/System Reviewer role |

### 4. Priority Module Deep-Dive: Manager Leave-Approval Inbox

This is called out separately because it is the highest-confidence, highest-severity gap in the entire EKG (`PP-leave-approval-gap`, HIGH severity, HIGH confidence, headline finding of the Business layer analysis). Requirements:
- List view of pending leave requests scoped to the authenticated manager's reports (manager-relationship data model itself is `MISSING`, `OQ-006` — must be resolved before this can be built, flagged as a blocking dependency here even though the UI shape is otherwise fully specified).
- Approve/reject actions calling API spec §3.3/§3.4, with mandatory reason capture on reject.
- Visible, real-time reflection of the audit entry created by the approval (surfacing `audit_entry_id` from the API response) — this makes the fail-closed audit behavior (VG-04) visible to the end user, not just enforced silently in the backend.

### 5. State Management and Data-Fetching Principles

- Treat every field sourced from a Policy object (hire-date threshold, leave-balance formula — Document 15 §4) as **server-computed, not client-computed** — the frontend must never re-implement the 90-vs-180-day check or either leave-balance formula locally, even for optimistic UI, given the confirmed drift (`DISC-001`, `DISC-002`). Optimistic UI for these fields is explicitly disallowed until the drift is resolved and a single formula is confirmed.
- `meta.source_confidence` fields returned by the API (per Document 11 §1) should be surfaced in an internal/admin view (not necessarily to end users) so that during the transition period, low-confidence screens (payroll, review cycle) are visibly marked as provisional to internal testers.

### 6. Explicitly Deferred

Specific framework (React/Vue/Svelte/etc.), state library, and build tooling choice are deferred to `12_TECHNOLOGY_BLUEPRINT.md` §4's stack decision. This document specifies module boundaries and principles that hold regardless of that choice.

=== DOCUMENT: 20_UI_UX_SPECIFICATION.md ===

# UI/UX Specification
## Forward Engineering Document 20

### 1. Scope and Grounding

No source wireframes, screen inventory, or design system were provided to this synthesis (frontend technology is only inferred at `ASMP-001` MEDIUM confidence). This document specifies **UX requirements derived from confirmed business and defect evidence** in the EKG — principally the one pain point (of 13) whose content is known, and the two security defects whose remediation has direct UI implications. It does not invent a full design system; it specifies the interaction requirements a design system must satisfy.

### 2. Priority UX Requirement: Manager Leave-Approval Flow

Directly addressing `PP-leave-approval-gap` (HIGH severity, HIGH confidence — the single most concretely evidenced pain point in the entire EKG, cross-linked at `XLINK-003` to the audit-trail defect in the same functional area):

- **Entry point**: A persistent, always-visible "Pending Approvals" indicator for any user with the Manager role, showing a live count. This is a deliberate UX overcorrection relative to the source system, which had *no* entry point at all for this task — the absence of any indicator today (not merely a hard-to-find one) justifies making the new one maximally prominent.
- **List screen**: One row per pending leave request — employee name, leave type, dates, days requested, current balance impact (from the resolved `LeaveBalanceService`, Document 15 §4 — never render either legacy conflicting formula here).
- **Action**: Inline approve/reject from the list (no forced navigation to a detail screen for the common case), with reject requiring a reason (free text, minimum length TBD by stakeholder — not specified in EKG).
- **Feedback**: Immediate confirmation showing the audit entry was recorded (surfacing `audit_entry_id`, per Frontend Architecture §4) — this is the UX-level enforcement of NFR-R2/VG-04 (audit must not fail silently): if the backend audit write fails, the UI must show a clear error and the leave request must visibly remain in "Pending," never silently flip to "Approved" with no trace, which is effectively what the source system's swallow-error audit pattern allowed to happen operationally.

### 3. Priority UX Requirement: Transparent Failure States for Employee Lifecycle Actions

Directly addressing `TD-11`/`TD-12`: in the source system, department/job changes raise unhandled database errors on every call. The UX requirement is not merely "don't crash" (that's a backend NFR, Document 14 §2) but a specific **user-facing contract**:
- Every transfer/promote/terminate/rehire action must show one of exactly three states: success (with the resulting history entry visible), validation failure (specific field-level message), or system failure (generic retry message with a trace ID) — never a raw error code or blank/frozen screen, which is the practical user experience of an unhandled `ORA-00904`/`ORA-02290` today.

### 4. Authentication UX

Given the source system's confirmed lack of any real authentication (unconditional session issuance, `PKG-SECURITY`), the target login UX must include, as net-new requirements:
- A visible failure state for wrong credentials (401) — there is no source-system precedent for this state to preserve compatibility with; design it fresh against standard login-UX conventions.
- Account lockout messaging after repeated failures (ties to the credential-store lockout counters specified in Security Architecture §2).
- No UX pattern here may assume "if the email exists, log the user in" is ever correct — that is precisely the defect being removed, and design review should explicitly check that no proposed screen reintroduces it (e.g., a "log in with just your work email" convenience flow would silently resurrect the vulnerability).

### 5. Provisional/Low-Confidence Screen Marking

For Payroll Run, Pay Period, Review Cycle, and Individual Review modules (Document 19 §3), where underlying business rule content is `MISSING` (`OQ-003`): render these screens, during the transition period, with a visible internal-only "provisional — pending business rule confirmation" banner in non-production environments. This prevents stakeholders from mistaking contract-shape stub screens (Document 11 §4–5) for validated functionality during early reviews.

### 6. Accessibility and General UX Baseline

No accessibility requirements were present in any layer summary provided to this synthesis. In the absence of source evidence either way, this document defers to standard baseline practice (WCAG 2.1 AA) as the default assumption rather than leaving accessibility unspecified — flagged here as an **assumption, not an EKG-sourced requirement**, consistent with the anti-hallucination rule: this is stated explicitly as a default choice made by this document, not attributed to any source-system evidence.

### 7. Explicitly Out of Scope

Visual design system (color, typography, spacing tokens), specific component library, and the full screen inventory for the 6 of 13 application modules with zero component-registry entries (`OQ-012`) are out of scope until that gap is resolved. Do not extrapolate visual design from the two named tables or three named packages — there is no evidentiary basis for doing so.
