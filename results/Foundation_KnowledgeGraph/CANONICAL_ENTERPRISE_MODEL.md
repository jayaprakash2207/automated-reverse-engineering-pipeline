# Canonical Enterprise Model

**Scope note:** This model is built strictly from the four layer hand-off summaries provided to this agent (BA_Deep_Analyst.md, DA_Data_Reviewer.md, TA_Deep_Analysis.md, AA_Quality_Review.md — all summary-level, not the full underlying reports). Rows marked `MISSING` require the full source document before they can be completed. No cell in this table contains an invented value.

| Node ID | Name | Type | Owner Layer(s) | Confidence | Evidence Source |
|---|---|---|---|---|---|
| DOM-001 | HR & Payroll Management | Domain | Business | MEDIUM | Inferred from 6 named value streams |
| VS-01 | Employee Lifecycle | Value Stream | Business | HIGH | BA summary |
| VS-02 | Leave Request | Value Stream | Business | HIGH | BA summary |
| VS-03 | Pay Period | Value Stream | Business | HIGH | BA summary |
| VS-04 | Payroll Run | Value Stream | Business | HIGH | BA summary |
| VS-05 | Review Cycle | Value Stream | Business | HIGH | BA summary |
| VS-06 | Individual Review | Value Stream | Business | HIGH | BA summary |
| BR-SET | Business Rules (32 total) | Rule Set | Business | HIGH (count) / LOW (content) | BA summary |
| TBL-EMPLOYEES | EMPLOYEES | Table / Aggregate Root (canonical: "Employee") | Data, Application, Technology | HIGH | DA, AA, TA summaries |
| TBL-EMPLOYEE_HISTORY | EMPLOYEE_HISTORY | Table | Data, Technology | HIGH | DA, TA summaries |
| TBL-USER_CREDENTIALS | USER_CREDENTIALS (ABSENT) | Table (confirmed non-existent) | Data | HIGH | DA summary |
| PKG-SECURITY | PKG_SECURITY | PL/SQL Package / Service | Data | HIGH | DA summary |
| PKG-EMPLOYEE | PKG_EMPLOYEE | PL/SQL Package / Service | Data | HIGH | DA summary |
| PKG-AUDIT | PKG_AUDIT | PL/SQL Package / Service | Data | HIGH | DA summary |
| TRG-BEFORE-UPDATE | TRG_EMP_BEFORE_UPDATE | Trigger | Technology, Application | HIGH | TA, AA summaries |
| TRG-INSTEAD-OF-DELETE | TRG_EMP_INSTEAD_OF_DELETE | Trigger | Application | MEDIUM | AA summary (dependency edge disputed) |
| SEQ-EMP-NUMBER | SEQ_EMP_NUMBER | Sequence (possible orphan) | Technology | MEDIUM | TA summary |
| MOD-SET | Application Modules (13 total) | Module Set | Application | HIGH (count) | AA summary |
| AP-SET | Architecture Patterns (21 total) | Pattern Set | Technology | HIGH (count) / MISSING (content) | TA summary |
| NFR-SET | NFRs (3 total) | NFR Set | Technology | HIGH (count) / MISSING (content) | TA summary |
| TD-SET | Technical Debt (32 total) | Debt Set | Technology | HIGH (count/breakdown) | TA summary |
| CICD-001 | CI/CD Maturity | Capability Assessment | Technology | HIGH | TA summary: 0 of 14 present |

## Notes on canonical merges
- **Employee** is the single most cross-referenced canonical node: it appears as the `EMPLOYEES` table (Data), the `EMPLOYEES` component with afferent coupling 5 (Application), the `Employee Lifecycle` value stream (Business), and the target of `TRG_EMP_BEFORE_UPDATE` / `TRG_EMP_INSTEAD_OF_DELETE` (Technology/Application). All four layer views of "Employee" are merged into one node per Rule 2 — they are not duplicated.
- **EMPLOYEE_HISTORY defect** is a second major merge: Data layer's "escalated" finding and Technology's TD-11/TD-12 are the *same underlying defect* (structurally broken trigger write), confirmed independently from two different code paths. Treated as one canonical defect (DISC-007).
- No Order, Payment, or Customer-style commerce entities were mentioned anywhere in the four summaries — this is an internal HR/Payroll system, not a customer-facing commerce system. Any such assumption would be a hallucination; none is made here.