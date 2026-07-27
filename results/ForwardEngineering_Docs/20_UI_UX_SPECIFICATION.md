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