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