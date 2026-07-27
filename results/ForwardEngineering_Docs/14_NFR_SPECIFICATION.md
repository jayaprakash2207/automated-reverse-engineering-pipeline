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