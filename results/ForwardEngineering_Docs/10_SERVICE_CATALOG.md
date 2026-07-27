# Service Catalog

| Service | Type | Owner Package | Function | Status | Confidence |
|---|---|---|---|---|---|
| Authenticate | PL/SQL procedure | PKG_SECURITY | `authenticate()` — looks up employee by email, issues session | **BROKEN (security-critical)** — no password verification occurs | HIGH |
| Encrypt/Decrypt SSN | PL/SQL (implied) | PKG_SECURITY | AES-256 encryption of SSN field | **BROKEN (security-critical)** — encryption key is a hard-coded literal in version control | HIGH |
| Transfer Employee | PL/SQL procedure | PKG_EMPLOYEE | `transfer_employee()` | **BROKEN** — fails via TRG_EMP_BEFORE_UPDATE on every call | HIGH |
| Promote Employee | PL/SQL procedure | PKG_EMPLOYEE | `promote_employee()` | **BROKEN** — same trigger defect | HIGH |
| Terminate Employee | PL/SQL procedure | PKG_EMPLOYEE | `terminate_employee()` | **BROKEN** — same trigger defect | HIGH |
| Rehire Employee | PL/SQL procedure | PKG_EMPLOYEE | `rehire_employee()` | **BROKEN** — same trigger defect | HIGH |
| Log Action (Audit) | PL/SQL procedure | PKG_AUDIT | `log_action()` | **DEGRADED** — internally swallows constraint-violation errors; functions but silently loses some audit entries | HIGH |
| Submit Leave Request | Unknown implementation | Unknown package | Employee-initiated leave submission | **PARTIALLY WORKING** — submission and self-cancellation only | MEDIUM |
| Approve/Reject Leave Request | — | — | Manager-side leave decision | **DOES NOT EXIST** | HIGH (confidence in the gap) |
| (remaining 7–8 PKG_* packages, exact count disputed 10 vs 11) | Unknown | Unknown | Unknown | Unknown | Existence: HIGH; identity/function: MISSING (DISC-003, OQ-002) |

## Service health summary
Of the services with enough evidence to assess, **0 of 4 confirmed Employee-lifecycle write operations function correctly**, the sole confirmed authentication service **provides no actual authentication**, and the one confirmed cross-cutting audit service **silently loses data under constraint violations**. No service catalog entry currently confirmed to be fully healthy exists in the material available to this synthesis, aside from initial hire / basic profile edit (implied functional by exclusion in DA's summary, but not directly evidenced as working — MEDIUM confidence at best).

---

**End of Part 1.** All 15 required documents above were generated strictly from the evidence contained in the four provided layer summaries. 9 open questions beyond what any single layer raised were identified during cross-layer synthesis (notably OQ-011, the absence of any business-layer visibility into the authentication bypass). Part 2 should not proceed with confidence-building activities (e.g., generating detailed 11–20 forward-engineering documents with fabricated specifics) until the `MISSING` items in `FORWARD_ENGINEERING_INPUT_MAP.md` — especially the full BR/TD/AP/NFR text and the complete 30-table DDL — are sourced from the original layer reports rather than their summaries.