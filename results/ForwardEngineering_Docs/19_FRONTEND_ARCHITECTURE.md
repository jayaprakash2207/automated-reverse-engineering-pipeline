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