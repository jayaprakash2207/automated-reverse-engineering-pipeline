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