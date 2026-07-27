# Business Requirements Document

## 1. Purpose
This BRD documents the business requirements for the HR & Payroll Management system as reconstructed from cross-layer analysis (Business, Data, Application, Technology). Where the source analysis lacked detail, this is stated explicitly rather than filled in.

## 2. Scope
Six confirmed value streams define the system's business scope:
1. Employee Lifecycle
2. Leave Request
3. Pay Period
4. Payroll Run
5. Review Cycle
6. Individual Review

## 3. Business Rules
32 business rules were catalogued by the Business Analysis layer (BR-01–BR-32). Of these, two are known in enough detail to state here:
- **Hire-date threshold rule**: a confirmed drift exists between two sources — one states a 90-day threshold, another states 180 days. **This is an unresolved conflict (DISC-001) and must be reconciled with the business owner before this rule is re-implemented.**
- **Leave-balance formula**: the calculation formula diverges between two sources in the system (DISC-002), also unresolved.

The remaining 30 business rules exist (confirmed by count) but their content was not included in the material provided to this synthesis step and must be pulled from the full BA report before requirements sign-off.

## 4. Known Functional Gaps (Business-Critical)
- **No manager leave-approval capability.** The highest-severity pain point identified: there is no working screen anywhere in the system for a manager to approve or reject a leave request. Only employee submission and employee self-cancellation exist. This is a **hard business requirement gap**, not a UX issue — leave requests cannot complete their intended business process today.
- **Employee lifecycle transactions are broken.** Transfer, promotion, termination, and rehire actions all fail due to a database trigger defect (see Data Model Specification). This means the Employee Lifecycle value stream is non-functional beyond initial hire and basic profile edits.
- **No effective authentication.** Any known employee email allows login as that employee, with any password, because no password is ever checked. This is a business-critical security requirement failure, not merely a technical debt item, and should be escalated to business stakeholders regardless of whether the system is production or training-scoped (see OQ-001).

## 5. Pain Points and Automation Opportunities
13 pain points and 7 automation opportunities were identified by the Business Analysis layer. Only the leave-approval gap above is detailed in the material available to this synthesis; the remaining 12 pain points and 7 opportunities require the full BA report.

## 6. Open Business Questions
- Should the hire-date threshold be 90 or 180 days? (DISC-001)
- Which leave-balance formula is authoritative? (DISC-002)
- Is the authentication bypass acceptable for the system's actual intended use (training vs. production)? (OQ-001)

## 7. Traceability
See `TRACEABILITY_MATRIX.md` for the Capability → Process → Entity → Service → API → Database mapping supporting this BRD. Most rows are incomplete pending full source documents (see `FORWARD_ENGINEERING_INPUT_MAP.md`).