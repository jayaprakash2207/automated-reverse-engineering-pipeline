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