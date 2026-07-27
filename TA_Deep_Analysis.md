# Agent 2 — Technology Architecture Deep Analysis (Final)

Synthesis of Batch 1 (Security / Application / Data-Triggers) and Batch 2 (Data-Schema DDL) chunk analyses. Pair input: `TA_Stack_Scout.md`.

## Agent 2 - Analysis Summary
- Layers analysed:                        3 - Security, Application (Forms Libraries), Data (DB Triggers + Schema DDL/Views/Sequences)
- Chunks processed:                       4 (Security; Application; Data-Triggers; Data-Schema)
- Technologies assessed:                  17
- Architecture patterns catalogued:       21 (AP-01 through AP-21)
- NFR entries recorded:                   3 (NFR-01 through NFR-03)
- Technical debt items identified:        32 (TD-01 through TD-32) - Critical: 7, High: 10, Medium: 12, Low: 3
- CI/CD pipeline files directly read:     0 - Agent 1 confirmed CI/CD and IaC absent from the codebase; no pipeline files exist to read
- CI/CD capabilities confirmed present:   0 of 14
- Agent 1 LOW CONFIDENCE items resolved:  2 of 31 (EMPLOYEE_HISTORY column-shape mismatch → RESOLVED/CONFIRMED Critical defect; 90-vs-180-day hire-date conflict → RESOLVED/CONFIRMED cross-layer inconsistency)
- Discrepancies with Agent 1:             1 (PKG_EMPLOYEE.generate_emp_number reportedly bypasses SEQ_EMP_NUMBER entirely — sequence may be orphaned; unconfirmed without package body)

---

## OUTPUT 1 - Technology Stack Assessment

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| Oracle Forms 12c — HRMS_LOGIN | 12c | Active - core path | Sole authentication entry point; opens HRMS_MENU on success | Supported | Confirmed |
| PKG_SECURITY | UNKNOWN — package body never scanned (Batch 1 or 2) | Active - core path (called, internals unverifiable) | `authenticate()` returns session_id; `is_session_valid()` gates session-checked actions | UNKNOWN | Confirmed reference; LOW - unverifiable |
| Oracle Forms `:GLOBAL` session variables | N/A | Active - core path | De facto session state (`session_id`, `current_user`, `current_emp_id`) set at login, read everywhere | N/A | New — not itemised in Agent 1 OUTPUT 1 |
| HRMS_COMMON_LIB.pll | N/A (Forms library) | Active - core path | Thin wrappers over Forms built-ins (COMMIT_FORM, CLEAR_FORM, ENTER_QUERY/EXECUTE_QUERY, navigation, EXIT_FORM); attached to all HRMS forms | N/A | Confirmed |
| HRMS_VALIDATION_LIB.pll | N/A (Forms library) | Active - core path | Client-side validation: email, phone, SSN, date-not-future, salary range | N/A | Confirmed |
| PKG_COMMON | UNKNOWN — unscanned | Active - core path (called, unverifiable) | `log_error(module, location, message, user)` called from `handle_error` | UNKNOWN | Confirmed reference; LOW - unverifiable |
| PKG_VALIDATION | UNKNOWN — unscanned | Declared-only — referenced only in a code comment, no call site found in either batch | Documented server-side counterpart to client validation, using REGEXP_LIKE | UNKNOWN | LOW - no call-site evidence in either batch |
| Table `JOB_GRADES` | N/A | Active - direct query | Queried by `validate_salary_range`: `SELECT MIN_SALARY, MAX_SALARY FROM JOB_GRADES WHERE GRADE_ID=:p_grade_id` | N/A | New — file-level detail not itemised by Agent 1 |
| Oracle DB 19c row-level triggers | 19c | Active - core path | 5+ triggers enforce validation, audit, and soft-delete rules at the DB layer, independent of Forms | Supported | Confirmed |
| PKG_AUDIT | UNKNOWN — unscanned | Active - core path (called with two different arities) | `log_action(table, id, action, user, [old_json, new_json])` — 6-arg from salary/leave audit triggers, 4-arg from department audit trigger | UNKNOWN | Confirmed reference; LOW - signature unverifiable |
| Table `EMPLOYEE_HISTORY` | N/A | Active - written to, but write is malformed | `TRG_EMP_BEFORE_UPDATE` inserts a column list that does not match the table's actual DDL | N/A | **DISCREPANCY** — corroborated cross-batch (TD-11) |
| Oracle DB 19c core DDL (30 tables) | 19c | Active - core path | Full relational schema: org structure, payroll, leave, performance, cross-cutting audit/session/lookup | Supported | Confirmed |
| Oracle `GENERATED ALWAYS AS ... VIRTUAL` columns | 19c feature | Active - core path | `LEAVE_BALANCES.AVAILABLE` derives balance from 5 stored columns | N/A | New — not itemised at this granularity by Agent 1 |
| Oracle `CONNECT BY` hierarchical queries | 19c feature | Active - core path, single usage | `VW_ORG_HIERARCHY` builds org chart; self-documented performance ceiling | N/A | New — view-level detail not previously itemised |
| Oracle sequences (27 total) | 19c feature | Active - core path (26 of 27 confirmed used); 1 orphaned candidate | Surrogate key generation for every table except EMPLOYEES (populated by Forms trigger only) | N/A | Confirmed |
| PKG_EMPLOYEE.generate_emp_number | UNKNOWN — unscanned | Active - core path | Per DDL comment, reportedly uses `MAX(EMP_NUMBER)+1` rather than `SEQ_EMP_NUMBER.NEXTVAL` — documented concurrency defect | UNKNOWN | DISCREPANCY candidate — SEQ_EMP_NUMBER potentially orphaned |
| USER_SESSIONS table | N/A | Active - core path | Backing store for PKG_SECURITY session lifecycle (EMP_ID/USERNAME/LOGIN_TIME/LOGOUT_TIME/SESSION_STATUS) | N/A | New evidence supporting AP-01; PKG_SECURITY internals still unverified |
| NOTIFICATION_QUEUE table | N/A | Declared-only — no dispatcher package scanned in either batch | Queue-table pattern for EMAIL/IN_APP/SMS notifications with STATUS/RETRY_COUNT/PRIORITY | N/A | New — not previously itemised |

---

## OUTPUT 2 - Architecture Pattern Catalog

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-01 | Session Token Validation Gate | Security | HRMS_COMMON_LIB.check_session → PKG_SECURITY.is_session_valid | Session ID in `:GLOBAL.session_id` (VARCHAR2, `TO_NUMBER`-converted in `get_session_id`); on null/invalid → `MESSAGE(...)` + `RAISE FORM_TRIGGER_FAILURE` | LOW - actual caller coverage across forms not evidenced | LOW - `is_session_valid` internals unverifiable | HRMS_COMMON_LIB.pll.sql |
| AP-02 | Masked Password Input | Security | HRMS_LOGIN.PASSWORD item | `Char(100)`, `ConcealData="Yes"` | Single login field | HIGH | HRMS_LOGIN.xml |
| AP-03 | Generic/Uniform Authentication Error Response | Security | HRMS_LOGIN.BTN_LOGIN `EXCEPTION WHEN OTHERS` | Single catch-all → `'Invalid username or password.'`, clears/refocuses PASSWORD | One entry point | HIGH | HRMS_LOGIN.xml |
| AP-04 | Email-as-Username Resolution (Active-Only) | Security / Data Access | HRMS_LOGIN.BTN_LOGIN | `SELECT EMP_ID ... WHERE UPPER(EMAIL)=UPPER(:LOGIN.USERNAME) AND EMPLOYMENT_STATUS='ACTIVE' AND ROWNUM=1` | Single implementation | HIGH | HRMS_LOGIN.xml |
| AP-05 | Toolbar Command Delegation to Forms Built-ins | Communication | HRMS_COMMON_LIB (10 toolbar functions) | save→COMMIT_FORM, clear→CLEAR_FORM(ASK_COMMIT), query→mode-conditional ENTER_QUERY/EXECUTE_QUERY, exit→EXIT_FORM(ASK_COMMIT) | Uniform across all 10 functions | HIGH | HRMS_COMMON_LIB.pll.sql |
| AP-06 | Dual-Layer (Client + Server) Field Validation | Data Access | HRMS_VALIDATION_LIB ↔ PKG_VALIDATION | Client: hand-rolled INSTR/TRANSLATE logic. Server (per comment): REGEXP_LIKE-based, independent implementation | Partial / inconsistent by design | LOW - server side never directly observed | HRMS_VALIDATION_LIB.pll.sql |
| AP-07 | Naming-Convention-Coupled LOV Refresh | Data Access | HRMS_COMMON_LIB.refresh_lov | Derives `'RG_' \|\| UPPER(REPLACE(p_lov_name,'LOV_',''))`; silent no-op if FIND_GROUP fails | Applies to convention-following LOVs only | HIGH | HRMS_COMMON_LIB.pll.sql |
| AP-08 | Row-Level Audit Trigger → Central Audit Package | Observability | TRG_SALARY_AUDIT, TRG_LEAVE_REQUEST_AUDIT, TRG_DEPARTMENT_AUDIT → PKG_AUDIT.log_action | AFTER INSERT/UPDATE/DELETE (SALARY_RECORDS, DEPARTMENTS) or AFTER UPDATE OF STATUS (LEAVE_REQUESTS) | Partial - granularity inconsistent across the 3 triggers | HIGH | plsql/triggers/trg_audit.sql |
| AP-09 | Manual JSON String Construction for Audit Payloads | Data Access | TRG_SALARY_AUDIT, TRG_LEAVE_REQUEST_AUDIT | Hand-built `'{"key":' \|\| val \|\| '}'` strings, no JSON_OBJECT() or escaping | Both audit triggers | HIGH | plsql/triggers/trg_audit.sql |
| AP-10 | Column-Specific Conditional Audit Trigger | Observability | TRG_LEAVE_REQUEST_AUDIT | `AFTER UPDATE OF STATUS ON LEAVE_REQUESTS` — fires only when STATUS is part of the update | Single implementation | HIGH | plsql/triggers/trg_audit.sql |
| AP-11 | Hard Block on Physical Delete (Enforced Soft-Delete) | Data Access | TRG_EMP_INSTEAD_OF_DELETE on EMPLOYEES | `BEFORE DELETE ... RAISE_APPLICATION_ERROR(-20504,...)`, unconditional | 100% of DELETE attempts | HIGH | plsql/triggers/trg_employees.sql |
| AP-12 | Field-Level Change History Logging (Status/Dept/Job) | Data Access / Observability | TRG_EMP_BEFORE_UPDATE → EMPLOYEE_HISTORY | 3 change-type branches, each INSERT via SEQ_EMP_HISTORY.NEXTVAL | Applied but non-functional — column list mismatch + illegal CHECK values (TD-11/TD-12) | HIGH | plsql/triggers/trg_employees.sql |
| AP-13 | DB-Level Business Rule Enforcement Duplicating Forms-Level Validation | Data Access | TRG_EMP_BEFORE_INSERT vs HRMS_EMPLOYEE.xml | DB: hire date ≤ SYSDATE+180; Forms: 90-day threshold (per Agent 1) | Coverage gap / inconsistent | HIGH (DB side directly read); Forms side carried from Agent 1 | plsql/triggers/trg_employees.sql |
| AP-14 | Denormalized Reporting View w/ Date-Scoped Effective Salary Join | Data Access | VW_ACTIVE_EMPLOYEES | LEFT JOIN SALARY_RECORDS filtered `ACTIVE_FLAG='Y' AND EFFECTIVE_DATE<=SYSDATE AND (END_DATE IS NULL OR END_DATE>SYSDATE)`; `TENURE_YEARS=TRUNC(MONTHS_BETWEEN(SYSDATE,HIRE_DATE)/12,1)` | This view only | HIGH | schema/views/hrms_views.sql |
| AP-15 | Self-Referencing Hierarchical Query (CONNECT BY) | Data Access | VW_ORG_HIERARCHY | `START WITH MANAGER_EMP_ID IS NULL CONNECT BY PRIOR EMP_ID=MANAGER_EMP_ID`; LEVEL, SYS_CONNECT_BY_PATH, CONNECT_BY_ISLEAF | Single implementation; degrades >500 employees (TD-30) | HIGH | schema/views/hrms_views.sql |
| AP-16 | Compensation Ratio Analytics View | Data Access | VW_EMPLOYEE_COMPENSATION | `GRADE_MIDPOINT=(MIN+MAX)/2`; `COMPA_RATIO=ROUND(BASE_SALARY/GRADE_MIDPOINT*100,1)` | This view only; lacks AP-14's date-scoping (TD-27) | HIGH | schema/views/hrms_views.sql |
| AP-17 | Generated/Virtual Column for Derived Business Balance | Data Access | LEAVE_BALANCES.AVAILABLE | `GENERATED ALWAYS AS (OPENING_BALANCE+ACCRUED-USED+ADJUSTMENT-PENDING) VIRTUAL` | Not mirrored consistently elsewhere (TD-28) | HIGH | schema/tables/03_leave_tables.sql |
| AP-18 | UNION ALL Cross-Domain Approval Queue | Data Access | VW_PENDING_APPROVALS | UNION ALL of LEAVE_REQUESTS(PENDING) + PERFORMANCE_REVIEWS(MANAGER_REVIEW), normalised schema | 2 of the system's approval workflows | HIGH | schema/views/hrms_views.sql |
| AP-19 | DB-Enforced State Machine via STATUS + CHECK Constraint | Data Access | PAYROLL_RUNS | CHK_RUN_STATUS: PENDING, CALCULATING, CALCULATED, APPROVED, PAID, REVERSED, ERROR; default PENDING | Allowed-values enforced; no transition-order trigger found | HIGH (values); LOW - transition legality unenforced | schema/tables/02_payroll_tables.sql |
| AP-20 | "Latest Record" via MAX(Surrogate Key) | Data Access | VW_PAYROLL_LATEST | `RUN_ID = (SELECT MAX(RUN_ID) FROM PAYROLL_RUNS WHERE STATUS='APPROVED')` | Single global "latest," not scoped per period/run-type (TD-29) | HIGH | schema/views/hrms_views.sql |
| AP-21 | Differentiated Sequence Caching Strategy | Scalability | SEQ_AUDIT vs. all other 26 sequences | SEQ_AUDIT: CACHE 100; all others: NOCACHE (vs. Oracle's implicit CACHE 20 default) | Deliberate, consistent split | HIGH | schema/sequences/hrms_sequences.sql |

### Pattern Coverage Gaps

| Gap | Affected Integration / Component | Severity | Recommendation |
|---|---|---|---|
| No account-lockout / rate-limiting pattern on authentication despite a documented brute-force risk | HRMS_LOGIN / PKG_SECURITY (AP-01) | High | Implement failed-attempt counting + lockout in `PKG_SECURITY.authenticate` (TD-02) |
| No DB-level enforcement of PAYROLL_RUNS status transition legality — only the allowed-value set is checked, not transition order | PAYROLL_RUNS (AP-19) | Medium | Add a transition-validation trigger/procedure preventing illegal jumps (e.g., PENDING→PAID) |
| No confirmed call site for the documented server-side validation layer | HRMS_VALIDATION_LIB / PKG_VALIDATION (AP-06) | Medium | Confirm PKG_VALIDATION is actually invoked from Forms triggers; if not, validation is client-tier-only and bypassable |
| No resilience patterns (retry / circuit breaker / timeout) anywhere in the scanned codebase | System-wide | Informational | Expected for a monolith with no external integrations per Agent 1's Integration Graph — not treated as a true gap |

### Declared-But-Unused Libraries

| Library | Declared In | No Usage Found In | Risk |
|---|---|---|---|
| PKG_VALIDATION | Comment reference in HRMS_VALIDATION_LIB.pll.sql | No direct call site in Batch 1 or Batch 2 file sets | False security signal — validation may be enforced client-side only, which is bypassable |
| PKG_NOTIFICATION (inferred dispatcher name) | Implied by NOTIFICATION_QUEUE schema (STATUS/RETRY_COUNT/PRIORITY) | No dispatcher package or scheduled job scanned in either batch | Queue table may be write-only with no confirmed consumer — notifications could silently never be sent |

---

## OUTPUT 3 - Component Interaction & Contract Map

| Caller | Target | Protocol | Interaction Type | Coupling Strength | Contract | Timeout Declared? | Error Handling | Notes |
|---|---|---|---|---|---|---|---|---|
| HRMS_LOGIN | PKG_SECURITY.authenticate | PL/SQL direct call | Sync Request-Response | Tight — direct package call, no interface abstraction | Undocumented (no spec scanned) | No - RISK | Generic `WHEN OTHERS` catch-all (AP-03) | Internals unverifiable across both batches |
| HRMS_COMMON_LIB.check_session | PKG_SECURITY.is_session_valid | PL/SQL direct call | Sync Request-Response | Tight | Undocumented | No | RAISE FORM_TRIGGER_FAILURE on invalid | AP-01; caller coverage unconfirmed |
| HRMS_COMMON_LIB.handle_error | PKG_COMMON.log_error | PL/SQL direct call | Sync fire-and-forget (logging) | Tight | Undocumented | No | `WHEN OTHERS THEN NULL` — swallows logging failures (TD-06) | |
| HRMS_VALIDATION_LIB | PKG_VALIDATION | PL/SQL direct call (documented, unconfirmed) | Sync Request-Response (presumed) | Tight (presumed) | Undocumented | No | Unknown | LOW confidence — no call site found (AP-06/TD-07) |
| TRG_SALARY_AUDIT / TRG_LEAVE_REQUEST_AUDIT / TRG_DEPARTMENT_AUDIT | PKG_AUDIT.log_action | PL/SQL call from DB trigger | Sync fire-and-forget (audit write) | Tight — inconsistent arity (TD-16) | Undocumented; inferred backing table AUDIT_LOG | No | Unknown (body unscanned); likely CHECK-constraint violation on STATUS_CHANGE (TD-26) | AP-08/09/10 |
| TRG_EMP_BEFORE_UPDATE | EMPLOYEE_HISTORY (table) | Direct SQL INSERT | Sync Write | Tight — direct table write, column-shape broken | Table DDL (mismatched) | N/A | Unhandled — will raise ORA-00904 / ORA-02290 | AP-12 — CRITICAL, currently broken (TD-11/TD-12) |
| TRG_EMP_INSTEAD_OF_DELETE | EMPLOYEES (table) | Direct SQL block | Sync Write (blocking) | Tight | N/A | N/A | Unconditional `RAISE_APPLICATION_ERROR(-20504)` | AP-11; conflicts with Forms `DELETE_RECORD` (TD-13) |
| VW_PENDING_APPROVALS | LEAVE_REQUESTS, PERFORMANCE_REVIEWS | Direct SQL (UNION ALL view) | Sync Read | Loose — view abstraction over 2 tables | View DDL | N/A | N/A | AP-18; believed to back HRMS_LEAVE.xml Pending Approvals tab |
| VW_ACTIVE_EMPLOYEES / VW_EMPLOYEE_COMPENSATION | EMPLOYEES, SALARY_RECORDS | Direct SQL (view joins) | Sync Read | Tight — shared schema; inconsistent date-scoping between the two views (TD-27) | View DDL | N/A | N/A | AP-14/AP-16 |
| PKG_EMPLOYEE.generate_emp_number | EMPLOYEES / SEQ_EMP_NUMBER | PL/SQL (unscanned) | Sync Write | Tight | Undocumented | N/A | Race condition, handling unconfirmed | TD-23 |

### Coupling Hotspots

| Component | Inbound Dependencies | Outbound Dependencies | Coupling Risk |
|---|---|---|---|
| PKG_SECURITY | HRMS_LOGIN, HRMS_COMMON_LIB (every session-gated form) | USER_SESSIONS (presumed), EMPLOYEES | High — single point of authN/authZ failure; internals fully unverified across both batches |
| PKG_AUDIT | 3 DB triggers with inconsistent call signatures | AUDIT_LOG (presumed) | Medium-High — inconsistent arity plus a likely CHECK-constraint violation on every leave status change (TD-26) |
| EMPLOYEES table | HRMS_LOGIN, HRMS_EMPLOYEE.xml, 3 TRG_EMP_* triggers, VW_ACTIVE_EMPLOYEES, VW_ORG_HIERARCHY, VW_EMPLOYEE_COMPENSATION, EMPLOYEE_HISTORY (attempted) | DEPARTMENTS, JOB_GRADES/JOB_TITLES (FK) | High — central master table; multiple structural defects converge here (TD-04, TD-11/12, TD-13, TD-15, TD-23, TD-31) |
| HRMS_COMMON_LIB | Attached via ATTACH_LIBRARY to all HRMS forms (per Agent 1) | PKG_SECURITY, PKG_COMMON | High — shared library; any defect (TD-05, TD-06, TD-09) propagates system-wide |

### API Contract Inventory

| Boundary | Contract Type | Version | Location | Breaking Change Risk |
|---|---|---|---|---|
| PKG_SECURITY public interface | Undocumented | UNKNOWN | NOT FOUND in scan set | High — callers depend on an unverifiable signature |
| PKG_AUDIT.log_action | Undocumented, inferred dual-arity (4-arg / 6-arg) | UNKNOWN | NOT FOUND in scan set | High — already suspected violated by TRG_LEAVE_REQUEST_AUDIT's STATUS_CHANGE value (TD-26) |
| PKG_VALIDATION public interface | Undocumented, comment-only reference | UNKNOWN | NOT FOUND in scan set | Medium — existence of a real call site is itself unconfirmed |
| EMPLOYEE_HISTORY insert contract (implicit, via TRG_EMP_BEFORE_UPDATE) | Implicit (table DDL is the only contract) | N/A | schema/tables vs. plsql/triggers/trg_employees.sql | Critical — contract is already broken (TD-11/TD-12) |
| Forms-to-DB hire-date business rule | Undocumented, dual-implemented | N/A — 90-day (Forms) vs. 180-day (DB) | HRMS_EMPLOYEE.xml vs. TRG_EMP_BEFORE_INSERT | High — already diverged (TD-14) |

---

## OUTPUT 4 - Data Architecture Assessment

### Data Store Deep Dive

| Store | Access Pattern | ORM / Query Style | Transaction Scope | Consistency Model | Connection Pool Config | Migration State | Agent 1 Match? |
|---|---|---|---|---|---|---|---|
| EMPLOYEES | Direct Forms data block + trigger-mediated writes | Raw SQL / Forms default block | None found — Forms default commit scope only | Strong (single DB), but partially undermined by TD-04/TD-15 | DEFAULT — not declared (config layer absent, per Agent 1) | No migration framework found; DDL is the source of truth | Confirmed |
| EMPLOYEE_HISTORY | Trigger-only write path (TRG_EMP_BEFORE_UPDATE) | Raw SQL INSERT | Implicit (within parent UPDATE transaction) | Broken — writes will fail (TD-11/TD-12) | DEFAULT | No migrations found; trigger and DDL have drifted apart | **DISCREPANCY** — Agent 1 flagged LOW, confirmed HIGH/Critical this pass |
| SALARY_RECORDS | Trigger-audited (TRG_SALARY_AUDIT), joined by 2 views with inconsistent scoping | Raw SQL | Implicit | Eventual/ambiguous — TD-27 means compensation view can double-count or show non-effective salary | DEFAULT | No migrations found | Confirmed |
| LEAVE_REQUESTS / LEAVE_BALANCES | Trigger-audited (STATUS-only); AVAILABLE computed via VIRTUAL column | Raw SQL | Implicit | Ambiguous — VW_LEAVE_SUMMARY re-derives AVAILABLE with a divergent formula (TD-28) | DEFAULT | No migrations found | Confirmed |
| PAYROLL_RUNS / PAYROLL_DETAILS | DB-enforced state machine (CHECK constraint only) | Raw SQL | Implicit | Weak — no transition-order enforcement (AP-19 gap) | DEFAULT | No migrations found | Confirmed |
| AUDIT_LOG | Write-only from PKG_AUDIT (inferred), never directly read in scanned files | Raw SQL (inferred) | Implicit | At risk — CHK_AUDIT_ACTION likely rejects STATUS_CHANGE writes (TD-26) | DEFAULT | No migrations found | New — column shape only confirmed this batch |
| USER_SESSIONS | Backing store for PKG_SECURITY (inferred) | Raw SQL (inferred) | Implicit | Unknown — PKG_SECURITY internals unscanned | DEFAULT | No migrations found | New — schema confirms AP-01's data dependency |
| NOTIFICATION_QUEUE | Write path unconfirmed; no dispatcher scanned | Raw SQL (inferred) | Unknown | Unknown — possible write-only dead-end (Declared-But-Unused, see OUTPUT 2) | DEFAULT | No migrations found | New |

### Data Ownership Map

| Entity / Table | Owning Service | Other Services With Access | Access Type | Coupling Risk |
|---|---|---|---|---|
| EMPLOYEES | HR domain (HRMS_EMPLOYEE.xml / PKG_EMPLOYEE) | HRMS_LOGIN, Payroll views, Performance views, Leave views, EMPLOYEE_HISTORY (attempted) | Read-write (owner), read-only (others) | Tight — central master table read directly by nearly every domain, no service boundary |
| DEPARTMENTS | Org/HR domain | EMPLOYEES (FK), HOLIDAYS (LOCATION_CODE, no FK), VW_ORG_HIERARCHY | Read-write (owner), read-only (others) | Loose-to-Tight mixed — some relationships FK-enforced, others not (TD-25) |
| SALARY_RECORDS | Payroll domain | VW_ACTIVE_EMPLOYEES, VW_EMPLOYEE_COMPENSATION (HR reporting) | Read-write (owner), read-only (HR views) | Tight — two HR-facing views join directly to a payroll-owned table with inconsistent filtering (TD-27) |
| LEAVE_BALANCES / LEAVE_REQUESTS | Leave domain | VW_PENDING_APPROVALS, VW_LEAVE_SUMMARY | Read-write (owner), read-only (others) | Tight — VW_LEAVE_SUMMARY re-implements the owner's own virtual-column formula independently (TD-28) |
| PAYROLL_RUNS | Payroll domain | VW_PAYROLL_LATEST | Read-write (owner), read-only (view) | Tight — reporting view encodes an unscoped business assumption (single global "latest") (TD-29) |
| AUDIT_LOG | Cross-cutting (PKG_AUDIT, inferred) | Written by triggers across Salary/Leave/Department domains | Shared write | ANTIPATTERN — shared write target from 3 unrelated domains with inconsistent call signatures (TD-16) |

### Data Flow & Consistency Notes

- **Audit trail consistency is currently unverified end-to-end.** Three domain triggers (SALARY, LEAVE, DEPARTMENT) all write to a single inferred `AUDIT_LOG` table via `PKG_AUDIT.log_action`, but with inconsistent argument counts (TD-16) and at least one call (`STATUS_CHANGE` from the leave trigger) that appears to violate `AUDIT_LOG.CHK_AUDIT_ACTION`'s allowed-value list (TD-26). Until `PKG_AUDIT`'s body is scanned, it cannot be confirmed whether leave-status audit writes are succeeding, silently failing, or raising unhandled exceptions.
- **The EMPLOYEE_HISTORY change-tracking pipeline is broken end-to-end.** `TRG_EMP_BEFORE_UPDATE` (Batch 1) and the `EMPLOYEE_HISTORY` DDL (Batch 2) were read independently in two different batches and cross-confirm the same defect: a column-shape mismatch (TD-11) and disallowed CHECK values (TD-12). This is not a scan artifact — it is a genuine, reproducible defect that would raise `ORA-00904`/`ORA-02290` on any department or job change.
- **Derived-value consistency has drifted in two places**: `LEAVE_BALANCES.AVAILABLE` (virtual column, includes PENDING) vs. `VW_LEAVE_SUMMARY.AVAILABLE` (manual re-derivation, omits PENDING) — TD-28; and `VW_ACTIVE_EMPLOYEES` (date-scoped salary join) vs. `VW_EMPLOYEE_COMPENSATION` (unscoped salary join) — TD-27. Both represent the same underlying anti-pattern: a derived/computed value re-implemented independently in more than one place rather than sourced from a single definition.
- **The PAYROLL_RUNS state machine (AP-19) has no transition-order enforcement** — only a CHECK constraint on the allowed value set. Combined with `VW_PAYROLL_LATEST`'s unscoped global-MAX assumption (TD-29), the payroll reporting layer is a candidate for silent data omission if the company ever runs parallel or off-cycle payrolls.

---

## OUTPUT 5 - Security Architecture Assessment

### Authentication & Authorisation Implementation

| Mechanism | Declared (Agent 1) | Implemented How | Validation Completeness | Gaps | Severity |
|---|---|---|---|---|---|
| Session-based auth via PKG_SECURITY | Declared per Agent 1 Security Snapshot | HRMS_LOGIN calls `PKG_SECURITY.authenticate`; session ID stored in `:GLOBAL.session_id`; validated via `is_session_valid` on gated actions (AP-01) | Partial — front-door flow confirmed (AP-01–04), but internal enforcement logic (lockout, expiry, hashing) entirely unverifiable — package body never scanned in either batch | No account lockout (TD-02), no MFA/CAPTCHA (TD-03), cleartext password transport (TD-01), `check_session` caller coverage across forms unconfirmed | Critical |
| Email-based login identity resolution | N/A | `ROWNUM=1` arbitrary pick among ACTIVE employees sharing an email (TD-04) | Minimal — no real uniqueness guarantee behind it (no unique constraint on EMAIL, TD-15) | Duplicate active emails silently resolve to an arbitrary account | High |
| Server-side field validation (PKG_VALIDATION) | Declared per Agent 1 | Documented as REGEXP_LIKE-based counterpart to client validation | Unconfirmed — no call site found in either batch | Client-only validation may be the sole enforcement layer if server-side isn't actually wired in | Medium |

### Secrets Posture

| Item | Finding | Severity | Evidence |
|---|---|---|---|
| Password transport (Forms applet) | Cleartext per documented known issue; no TLS/SSL evidence in scanned files | Critical | HRMS_LOGIN.xml (TD-01) |
| DB credentials / WebLogic datasource config | NOT FOUND in scan set | UNKNOWN | Agent 1 Infrastructure Blueprint marked infra/CI-CD absent |
| Hardcoded secrets in application code | None observed in any scanned PL/SQL or Forms file across both batches | — (positive finding) | N/A |

### Attack Surface Summary

| Surface | Exposure | Mitigations Found | Gaps |
|---|---|---|---|
| HRMS_LOGIN (sole entry point) | Single authentication gate for the entire application | Masked password field (AP-02), generic error response (AP-03) | No lockout, no MFA, cleartext transport, arbitrary-account login on duplicate email (TD-01, TD-02, TD-03, TD-04) |
| Session-gated Forms actions | `check_session` gate (AP-01) | Session validity check before sensitive actions | Actual caller coverage across all forms unconfirmed — LOW confidence carried from Batch 1 |
| Direct DB / bulk-load paths bypassing Forms | Any non-Forms insert (batch job, direct SQL, data migration) | Trigger-based business rules only (soft-delete block, hire-date check, email-uniqueness check) | All bypassable if triggers are disabled during bulk load; `EMP_ID` has no DB-level default (TD-24); email uniqueness is not a real constraint (TD-15) |

---

## OUTPUT 6 - NFR Registry

| ID | NFR Name | Value | Category | Source | Confidence |
|---|---|---|---|---|---|
| NFR-01 | `SEQ_AUDIT` sequence cache size | `CACHE 100` | Throughput / Resource Management | schema/sequences/hrms_sequences.sql | HIGH |
| NFR-02 | All non-audit sequences (26 of 27) cache size | `NOCACHE` (effectively cache size 1, vs. Oracle's implicit default of `CACHE 20`) | Resource Management / Throughput | schema/sequences/hrms_sequences.sql | HIGH |
| NFR-03 | `VW_ORG_HIERARCHY` documented safe operating ceiling | ">500 employees" before significant performance degradation | Latency | schema/views/hrms_views.sql | HIGH — directly quoted from source comment |

**Gap note:** No connection-pool, statement-timeout, LOB-fetch-size, session-timeout, or rate-limit NFRs were found anywhere across both batches. This is consistent with Agent 1's confirmed absence of WebLogic/JDBC/infrastructure configuration files from the scanned set — any such limits, if configured, exist entirely outside what either agent could observe. Logged as a gap, not assumed absent.

---

## OUTPUT 7 - Technical Debt & Risk Register

Sorted by severity, descending.

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-01 | Password transmitted in cleartext (Forms applet limitation) | Security Vulnerability | HRMS_LOGIN | Critical | Documented known issue; no transport-layer mitigation evidenced | Enforce SSL/TLS termination at WebLogic for all Forms applet traffic; verify with a network capture, not just config |
| TD-11 | `TRG_EMP_BEFORE_UPDATE`'s INSERT into `EMPLOYEE_HISTORY` uses a column list that does not match the table's actual DDL | Anti-pattern / Configuration Risk | TRG_EMP_BEFORE_UPDATE, EMPLOYEE_HISTORY | Critical | Cross-confirmed from both the trigger side (Batch 1) and the DDL side (Batch 2); would raise ORA-00904 | Rewrite the trigger's insert logic to match EMPLOYEE_HISTORY's real columns, or migrate the DDL to the trigger's intended shape |
| TD-12 | `TRG_EMP_BEFORE_UPDATE` writes `CHANGE_TYPE` values (`DEPARTMENT_CHANGE`, `JOB_CHANGE`) not permitted by `CHK_CHANGE_TYPE` | Anti-pattern / Configuration Risk | TRG_EMP_BEFORE_UPDATE, EMPLOYEE_HISTORY.CHK_CHANGE_TYPE | Critical | Direct comparison of literal values against the constraint's allowed list; closest allowed value is `TRANSFER` | Add the missing values to the check constraint, or change the trigger to emit an allowed value — guaranteed ORA-02290 once TD-11 is fixed |
| TD-20 | `JOB_GRADES` seed script omits NOT NULL `GRADE_CODE` and references a nonexistent `GRADE_LEVEL` column | Configuration Risk / Data Quality | data/seed/01_reference_data.sql, JOB_GRADES | Critical | Direct column-list comparison against DDL | Fix seed script column list to match DDL exactly |
| TD-21 | `LOCATIONS` seed script inserts into nonexistent column `PHONE`; DDL defines `PHONE_NUMBER` | Configuration Risk / Data Quality | data/seed/01_reference_data.sql, LOCATIONS | Critical | Direct column-name comparison; ORA-00904 on execution | Correct seed script to use `PHONE_NUMBER` |
| TD-22 | `SYSTEM_PARAMETERS` seed script inserts into nonexistent column `DESCRIPTION`; DDL defines `PARAM_DESCRIPTION` | Configuration Risk / Data Quality | data/seed/01_reference_data.sql, SYSTEM_PARAMETERS | Critical | Direct column-name comparison; ORA-00904 on execution | Correct seed script to use `PARAM_DESCRIPTION` |
| TD-23 | `PKG_EMPLOYEE.generate_emp_number` reportedly uses `MAX(EMP_NUMBER)+1` instead of `SEQ_EMP_NUMBER.NEXTVAL`, per an explicit DDL-file comment describing a race condition | Anti-pattern / Concurrency Defect | PKG_EMPLOYEE (unscanned), EMPLOYEES, SEQ_EMP_NUMBER | Critical | Documented directly in schema/sequences/hrms_sequences.sql | Rewrite `generate_emp_number` to use `SEQ_EMP_NUMBER.NEXTVAL`; confirm via package body scan whether the sequence is orphaned |
| TD-02 | No account lockout after failed login attempts | Security Vulnerability | HRMS_LOGIN / PKG_SECURITY.authenticate | High | Documented known issue; no attempt-counting/lockout logic in BTN_LOGIN, and `authenticate`'s internals are unverifiable | Implement failed-attempt tracking and lockout inside `PKG_SECURITY.authenticate` |
| TD-04 | `ROWNUM=1` silently picks an arbitrary EMP_ID when multiple ACTIVE employees share the same EMAIL | Anti-pattern / Data Quality | HRMS_LOGIN, EMPLOYEES | High | No unique constraint on EMAIL exists; only trigger-enforced for ACTIVE_FLAG='Y' | Add a genuine unique index/constraint on EMPLOYEES.EMAIL, or resolve login by a guaranteed-unique identifier |
| TD-07 | Client-side validation (HRMS_VALIDATION_LIB) and server-side validation (PKG_VALIDATION) are independently implemented with different approaches and no shared logic | Dependency Coupling / Anti-pattern | HRMS_VALIDATION_LIB, PKG_VALIDATION (unscanned) | High | Explicit in-code comment documents this as a known drift source | Consolidate to a single validation source, or add a regression test asserting parity |
| TD-13 | `TRG_EMP_INSTEAD_OF_DELETE` unconditionally blocks all physical deletes, but Forms' `DELETE_RECORD` built-in expects the DELETE to succeed | Operational Risk | TRG_EMP_INSTEAD_OF_DELETE, all Forms calling DELETE_RECORD on EMPLOYEES | High | Documented in-code as a known bug; workaround exists only as a comment | Verify HRMS_EMPLOYEE.xml's delete button actually uses the ACTIVE_FLAG workaround rather than DELETE_RECORD |
| TD-14 | Hire-date validation threshold conflict: Forms layer (90 days, per Agent 1) vs. DB layer (`SYSDATE+180`, directly confirmed) | Anti-pattern (Business Logic Drift) | HRMS_EMPLOYEE.xml, TRG_EMP_BEFORE_INSERT | High | Directly read DB threshold contradicts Agent 1's Forms-layer threshold | Establish a single source of truth for this rule, ideally the DB constraint |
| TD-15 | EMPLOYEES.EMAIL uniqueness is enforced only by a trigger COUNT check scoped to ACTIVE_FLAG='Y', not by a DB unique constraint | Configuration Risk / Anti-pattern | TRG_EMP_BEFORE_INSERT, EMPLOYEES | High | Trigger comment claims a backing unique constraint exists; only UK_EMP_NUMBER is actually present | Add a proper unique index/constraint on EMAIL (partial/functional if reuse-after-termination is intentional) |
| TD-26 | `AUDIT_LOG.CHK_AUDIT_ACTION` permits only INSERT/UPDATE/DELETE, but `TRG_LEAVE_REQUEST_AUDIT` passes `STATUS_CHANGE` as the action argument | Configuration Risk / Anti-pattern | AUDIT_LOG, PKG_AUDIT (unscanned), TRG_LEAVE_REQUEST_AUDIT | High | Column-shape alignment strongly suggests AUDIT_LOG is log_action's backing table | Prioritise obtaining PKG_AUDIT's body — every leave-status audit write may be failing silently or raising unhandled |
| TD-27 | `VW_EMPLOYEE_COMPENSATION`'s join to SALARY_RECORDS omits the date-scoping that VW_ACTIVE_EMPLOYEES applies | Anti-pattern / Data Quality | VW_EMPLOYEE_COMPENSATION, SALARY_RECORDS | High | Direct comparison of the two views' JOIN predicates in the same file | Align this view's join predicate with VW_ACTIVE_EMPLOYEES's date-scoping |
| TD-28 | `VW_LEAVE_SUMMARY.AVAILABLE` re-derives the balance formula, omitting PENDING, diverging from `LEAVE_BALANCES.AVAILABLE`'s virtual-column formula | Anti-pattern / Data Quality | VW_LEAVE_SUMMARY, LEAVE_BALANCES | High | Direct formula comparison, both read this batch | Have the view select the table's virtual column directly instead of re-deriving it |
| TD-30 | `VW_ORG_HIERARCHY`'s CONNECT BY query has a self-documented performance ceiling of ">500 employees" | Scalability Constraint | VW_ORG_HIERARCHY, EMPLOYEES | High | Direct quote from source comment (also NFR-03) | Replace with an incrementally maintained materialized hierarchy, or scope the query, before employee count approaches 500 |
| TD-03 | No CAPTCHA or 2FA support | Security Vulnerability | HRMS_LOGIN | Medium | Documented known issue | Evaluate MFA integration at the `PKG_SECURITY.authenticate` boundary |
| TD-05 | `get_session_id` silently returns NULL on VALUE_ERROR with no logging | Operational Risk | HRMS_COMMON_LIB.get_session_id | Medium | Exception handler swallows the error with no call to log_error | Log the exception before returning NULL |
| TD-06 | `handle_error`'s nested error-logging call is wrapped in `WHEN OTHERS THEN NULL` with no fallback | Operational Risk | HRMS_COMMON_LIB.handle_error | Medium | Total logging failure is silently swallowed | Add a last-resort fallback (e.g., UTL_FILE) |
| TD-08 | `validate_salary_range` comment claims salary-grade data is "cached at form startup," but the code issues a live SELECT on every call | Configuration Risk / Scalability | HRMS_VALIDATION_LIB.validate_salary_range, JOB_GRADES | Medium | Comment vs. code contradiction | Implement the described caching, or correct the comment; confirm no tight-loop usage |
| TD-16 | `PKG_AUDIT.log_action` is called with two different argument counts (6-arg vs. 4-arg) across the 3 audit triggers | Dependency Coupling / Configuration Risk | trg_audit.sql, PKG_AUDIT (unscanned) | Medium | Directly observed arity difference | Confirm PKG_AUDIT supports both call shapes via its (still unscanned) spec |
| TD-17 | Audit JSON payloads built via raw string concatenation rather than JSON_OBJECT() | Configuration Risk | TRG_SALARY_AUDIT, TRG_LEAVE_REQUEST_AUDIT | Medium | Currently safe (numeric/date fields only), but fragile | Replace with JSON_OBJECT() before any free-text field is added |
| TD-18 | TRG_DEPARTMENT_AUDIT captures no before/after values, only that a change occurred | Operational Risk (Compliance Gap) | TRG_DEPARTMENT_AUDIT, DEPARTMENTS | Medium | 4-arg call omits old/new JSON entirely | Extend to capture old/new values consistently with the other audit triggers |
| TD-24 | EMPLOYEES.EMP_ID (NOT NULL, no DEFAULT) is populated only via a Forms PRE-INSERT trigger, not any DB-level mechanism | Operational Risk | EMPLOYEES, SEQ_EMPLOYEE | Medium | No DEFAULT clause; no DB-level BEFORE INSERT trigger found among scanned triggers | Document this constraint explicitly for any future non-Forms integration work |
| TD-25 | Inconsistent FK enforcement: several self-referencing/lookup relationships lack FK constraints while equivalent relationships on EMPLOYEES have them | Configuration Risk | DEPARTMENTS, HOLIDAYS, LOOKUP_VALUES, NOTIFICATION_QUEUE | Medium | Direct constraint-list comparison; DEPARTMENTS's own comment claims a FK that doesn't exist | Add the missing FK constraints, or correct the misleading column comment |
| TD-29 | `VW_PAYROLL_LATEST` assumes a single global "latest" payroll run rather than one per pay period/frequency/run-type | Anti-pattern / Business Logic Risk | VW_PAYROLL_LATEST, PAYROLL_RUNS | Medium | Subquery has no PERIOD_ID/RUN_TYPE scoping | Scope the MAX(RUN_ID) subquery per period/run-type |
| TD-32 | PERFORMANCE_GOALS.GOAL_CATEGORY permits 5 values via CHECK constraint, but the Forms poplist LOV offers only 3 | Configuration Risk (UI/DB mismatch) | PERFORMANCE_GOALS, HRMS_PERFORMANCE.xml | Medium | Direct comparison of allowed-value list vs. described poplist choices | Add the missing poplist entries or confirm this is an intentional soft-launch restriction |
| TD-09 | `refresh_lov`'s LOV→RG naming convention is unenforced and fails silently | Configuration Risk | HRMS_COMMON_LIB.refresh_lov | Low | Silent no-op via ID_NULL(FIND_GROUP()) check | Add explicit logging/error when FIND_GROUP fails to resolve |
| TD-10 | `validate_phone`/`validate_ssn` hard-assume US phone format | Scalability Constraint | HRMS_VALIDATION_LIB | Low | LENGTH NOT IN (10,11) → reject | Acceptable for US-only deployment; flag only if internationalisation is in scope |
| TD-19 | Trigger naming/comment drift: TRG_EMP_INSTEAD_OF_DELETE is BEFORE DELETE but its header comment labels it TRG_EMP_AFTER_DELETE | Configuration Risk (documentation drift) | trg_employees.sql | Low | Direct mismatch between comment label and actual trigger | Correct the header comment |
| TD-31 | EMPLOYEES stores PHOTO_BLOB and NOTES (CLOB) alongside frequently-queried transactional columns | Scalability Constraint | EMPLOYEES | Low | Any SELECT *-style fetch pulls LOB data unnecessarily | Confirm Forms blocks project explicit column lists; consider a separate 1:1 table if overhead is measurable |

---

## OUTPUT 8 - Operational Architecture Assessment

### CI/CD Pipeline Maturity
> No pipeline files exist anywhere in the scanned codebase — Agent 1 explicitly confirmed CI/CD and IaC as **NOT FOUND**, not merely unscanned. Agent 2's own directory scan during this pass found no `.github/workflows/`, `.circleci/`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`, or `Jenkinsfile` to corroborate or contradict. Per the escalation rule for this condition, every capability below is assessed as Absent with Critical gap severity.

| Capability | Present? | Evidence (tool / action name + file + job) | Runs On | Gap Severity |
|---|---|---|---|---|
| Build | Absent | No pipeline files found in expected locations | N/A | Critical |
| Unit Tests | Absent | No matching evidence found | N/A | Critical |
| Integration Tests | Absent | No matching evidence found | N/A | Critical |
| Code Coverage Gate | Absent | No matching evidence found | N/A | High |
| SAST (Static Security) | Absent | No matching evidence found | N/A | Critical |
| Dependency Scan | Absent | No matching evidence found | N/A | High |
| Container / Image Scan | Absent | N/A — no containerisation found by Agent 1 | N/A | - |
| Secret / Credential Scan | Absent | No matching evidence found | N/A | Critical |
| Infrastructure Scan (IaC) | Absent | N/A — no IaC found by Agent 1 | N/A | - |
| Automated Deploy | Absent | No matching evidence found | N/A | Critical |
| Smoke / Health Check Post-Deploy | Absent | No matching evidence found | N/A | High |
| Auto Rollback | Absent | No matching evidence found | N/A | High |
| Manual Approval Gate | Absent | No matching evidence found | N/A | Medium |
| Release / Versioning Automation | Absent | No matching evidence found | N/A | Low |

### Observability Coverage

| Concern | Component | Present? | Tool / Library | Gap? |
|---|---|---|---|---|
| Structured Logging | System-wide (PKG_COMMON.log_error) | Partial | PKG_COMMON (unscanned internals); called inconsistently (TD-06 shows a swallow path) | GAP - format/fields unconfirmed |
| Distributed Tracing | System-wide | Absent | None found | GAP |
| Metrics Export | System-wide | Absent | None found | GAP |
| Correlation ID Propagation | System-wide | Absent | No evidence of correlation ID handling in any scanned Forms/PLSQL file | GAP |
| Health / Readiness Endpoints | System-wide | Absent | N/A — Forms/WebLogic monolith, no infra layer found | GAP |
| Alerting Rules | System-wide | Absent | None found | GAP |

### Deployment Safety

| Practice | Present? | Evidence | Risk If Absent |
|---|---|---|---|
| Graceful Shutdown | No | Not found — infra/app-server config layer absent from scan set | Request/session loss during WebLogic restarts |
| Readiness Probe | No | N/A — no container/orchestration layer found | Not applicable in this deployment model, but no substitute health check evidenced either |
| Liveness Probe | No | N/A — no container/orchestration layer found | Same as above |
| Blue-Green / Canary | No | No pipeline/deploy config found | Full traffic exposure on every deployment |
| Feature Flags | No | No integration evidenced | No decoupled release capability |

### Disaster Recovery Posture

| Item | Declared? | Detail | Source |
|---|---|---|---|
| Database backup configuration | UNKNOWN | No RMAN scripts, backup jobs, or scheduler config scanned in either batch | NOT FOUND |
| Multi-region / multi-AZ config | UNKNOWN | No such config evidenced | NOT FOUND |
| Database replication | UNKNOWN | No Data Guard or replication config scanned | NOT FOUND |
| RTO / RPO declarations | UNKNOWN | No such values found in config or docs | NOT FOUND |

---

## Validation Queue

| Item | Chunk / Layer | Reason for Uncertainty |
|---|---|---|
| PKG_SECURITY internals (authenticate, is_session_valid) | Security (Batch 1) | Package body never scanned in either batch — cannot confirm hashing, lockout, expiry logic |
| AP-01 caller coverage (which forms actually call check_session) | Security (Batch 1) | Not evidenced in scanned file set |
| PKG_COMMON internals (log_error) | Application (Batch 1) | Package body never scanned |
| PKG_VALIDATION — no confirmed call site | Application (Batch 1) | Only referenced via comment; existence of real usage unconfirmed |
| PKG_AUDIT actual signature (overload vs. default params) | Data-Triggers (Batch 1) | Package spec never scanned; dual-arity usage observed but not explained |
| PKG_AUDIT parameter-to-column mapping onto AUDIT_LOG | Data-Schema (Batch 2) | Inferred from column-name alignment only, not confirmed |
| PKG_NOTIFICATION dispatcher existence/retry-limit logic | Data-Schema (Batch 2) | No dispatcher package scanned in either batch; NOTIFICATION_QUEUE may be write-only |
| EMPLOYEE_BANK_ACCOUNTS split-deposit waterfall algorithm | Data-Schema (Batch 2) | Implied by DEPOSIT_TYPE/PRIORITY_ORDER columns, no scanned code evidences the algorithm |
| PKG_EMPLOYEE.generate_emp_number's actual logic | Data-Schema (Batch 2) | Only known via a DDL-file comment describing a race condition; package body unscanned |

## Agent 1 Discrepancy Log

| Item | Agent 1 Said | Implementation Shows | Status |
|---|---|---|---|
| EMPLOYEE_HISTORY column shape | Flagged LOW confidence — suspected column mismatch between trigger and table | Confirmed independently from both the trigger side (Batch 1) and the DDL side (Batch 2): column names, counts, and CHECK-constraint values all diverge | **RESOLVED — CONFIRMED Critical defect** (TD-11/TD-12) |
| Hire-date validation threshold | Forms-layer WHEN-VALIDATE-ITEM enforces 90 days | DB-layer TRG_EMP_BEFORE_INSERT directly reads as `SYSDATE+180` | **RESOLVED — CONFIRMED cross-layer inconsistency** (TD-14) |
| SEQ_EMP_NUMBER usage | Catalogued in Data Store Registry as an active sequence | A DDL-file comment states `PKG_EMPLOYEE.generate_emp_number` uses `MAX(EMP_NUMBER)+1` instead, implying the sequence may be unused/orphaned | **UNRESOLVED — candidate discrepancy**, cannot confirm without PKG_EMPLOYEE's body (TD-23) |

---
Agent 2 Analysis Complete.
Documentation is ready for technical review.
Highest-priority action item: **TD-11 / TD-12 — `TRG_EMP_BEFORE_UPDATE`'s writes to `EMPLOYEE_HISTORY` are structurally broken (column-shape mismatch + disallowed CHECK values) and will raise an unhandled ORA-00904/ORA-02290 on every department or job change.** This is a guaranteed, reproducible runtime failure on a routine HR transaction, cross-confirmed from both the trigger and the table-DDL side across two independent batches — not a theoretical risk. Fix this before addressing TD-23 (EMP_NUMBER race condition) or the seed-script failures (TD-20/21/22), which are lower-frequency or one-time in impact by comparison.
