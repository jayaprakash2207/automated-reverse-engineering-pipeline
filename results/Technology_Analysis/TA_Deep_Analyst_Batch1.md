# Agent 2 — Batch 1 of 2 — Deep Technology Analysis

Reading `TA_Stack_Scout.md` findings as ground truth per the Decision Rules. Processing this batch as three layer chunks in priority order: **Security Layer** (highest risk surface, contains PKG_SECURITY integration + documented security gaps) → **Application Layer** (Forms libraries) → **Data Layer** (DB triggers, richest confirmed-defect density per Agent 1's handoff note).

Numbering starts fresh at AP-01 / NFR-01 / TD-01 for this batch.

---

## Agent 2 – Chunk 1 of 3 (Batch 1) – Security Layer

**Agent 1 Input This Chunk:**
- Technologies being analysed: Oracle Forms 12c (Login form), PKG_SECURITY (unresolved/unscanned package)
- Components being traced: HRMS_LOGIN, HRMS_COMMON_LIB (session-check functions)
- Data stores being traced: EMPLOYEES (EMP_ID, EMAIL, EMPLOYMENT_STATUS)
- LOW CONFIDENCE items to resolve: PKG_SECURITY dependency (unscanned body) — cannot be fully resolved this chunk, still no package body in Batch 1

**Carried Forward from Prior Chunks:** None — first chunk of Batch 1.

---

### Stage 2 — Technology Stack Assessment

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| Oracle Forms 12c — HRMS_LOGIN | 12c | Active - core path | Sole authentication entry point for the entire HRMS system; opens `HRMS_MENU` on success | Supported (per Agent 1 stack) | Confirmed |
| PKG_SECURITY | UNKNOWN — package body not scanned | Active - core path (called, not verifiable internally) | `authenticate(username, password, client_host)` returns session_id; `is_session_valid(session_id)` gates session-checked actions in HRMS_COMMON_LIB | UNKNOWN | Confirmed reference; LOW - implementation unverifiable, no .pks/.pkb in scan set |
| Oracle Forms `:GLOBAL` session variables | N/A | Active - core path | `:GLOBAL.session_id`, `:GLOBAL.current_user`, `:GLOBAL.current_emp_id` used as de facto session state across the whole app (set once at login, read everywhere) | N/A | New — not itemised in Agent 1 OUTPUT 1, but implied by Component Map |

---

### Stage 3 — Architecture Pattern Catalog

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-01 | Session Token Validation Gate | Security | HRMS_COMMON_LIB.check_session → PKG_SECURITY.is_session_valid | Session ID stored as `:GLOBAL.session_id` (VARCHAR2, converted via `TO_NUMBER` in `get_session_id`); on null or invalid session → `MESSAGE(...)` + `RAISE FORM_TRIGGER_FAILURE` | LOW - only `check_session`'s existence confirmed; which forms/triggers actually call it is not evidenced in this batch | LOW - PKG_SECURITY.is_session_valid internal logic unverifiable (no package body) | HRMS_COMMON_LIB.pll.sql |
| AP-02 | Masked Password Input | Security | HRMS_LOGIN.PASSWORD item | `Char(100)`, `ConcealData="Yes"` | Applied to the single password field on the login form | HIGH | HRMS_LOGIN.xml |
| AP-03 | Generic/Uniform Authentication Error Response | Security | HRMS_LOGIN.BTN_LOGIN `EXCEPTION WHEN OTHERS` | Single catch-all returns `'Invalid username or password.'` regardless of failure cause (bad credentials, `PKG_SECURITY.authenticate` exception, or `NO_DATA_FOUND`/`TOO_MANY_ROWS` from the EMP_ID lookup); clears and refocuses PASSWORD field | Applied only at this one entry point | HIGH | HRMS_LOGIN.xml |
| AP-04 | Email-as-Username Resolution (Active-Only) | Security / Data Access | HRMS_LOGIN.BTN_LOGIN | `SELECT EMP_ID INTO :GLOBAL.current_emp_id FROM EMPLOYEES WHERE UPPER(EMAIL)=UPPER(:LOGIN.USERNAME) AND EMPLOYMENT_STATUS='ACTIVE' AND ROWNUM=1` | Single implementation, no variants | HIGH | HRMS_LOGIN.xml |

---

### Stage 4 — NFR Registry

No NFR entries this chunk. **Availability/Reliability NFRs: None declared** — no explicit session-timeout duration, max failed-attempt threshold, or lockout window is configured anywhere in the scanned Security layer files; `PKG_SECURITY.authenticate`/`is_session_valid` internals are unscanned so any such limits, if present, live entirely outside this batch's visibility. This is logged as a gap, not assumed absent — see TD-02.

---

### Stage 5 — Technical Debt & Risk Register

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-01 | Password transmitted in cleartext (Forms applet limitation) | Security Vulnerability | HRMS_LOGIN | Critical | Explicitly documented known issue in HRMS_LOGIN.xml comments; no transport-layer mitigation evidenced | Enforce SSL/TLS termination at WebLogic for all Forms applet traffic; verify with network capture, not just config |
| TD-02 | No account lockout after failed login attempts | Security Vulnerability | HRMS_LOGIN / PKG_SECURITY.authenticate | High | Documented known issue; BTN_LOGIN trigger contains no attempt-counting or lockout logic, and `authenticate`'s internals are unverifiable | Implement failed-attempt tracking and lockout inside `PKG_SECURITY.authenticate` (requires package body access to confirm/implement) |
| TD-03 | No CAPTCHA or 2FA support | Security Vulnerability | HRMS_LOGIN | Medium | Documented known issue | Evaluate MFA integration point at `PKG_SECURITY.authenticate` boundary |
| TD-04 | `ROWNUM=1` silently picks an arbitrary EMP_ID when multiple ACTIVE employees share the same EMAIL (case-insensitive) | Anti-pattern / Data Quality | HRMS_LOGIN, EMPLOYEES table | High | `SELECT ... WHERE UPPER(EMAIL)=UPPER(:LOGIN.USERNAME) AND EMPLOYMENT_STATUS='ACTIVE' AND ROWNUM=1`; no unique constraint on EMAIL exists in schema (per Agent 1 cross-reference), and email uniqueness is only trigger-enforced for `ACTIVE_FLAG='Y'` rows (see TD-17) | Add a genuine unique index/constraint on `EMPLOYEES.EMAIL` scoped correctly, or resolve login by a guaranteed-unique identifier |
| TD-05 | `get_session_id` silently returns NULL on `VALUE_ERROR` (corrupt/non-numeric `:GLOBAL.session_id`) with no logging | Operational Risk | HRMS_COMMON_LIB.get_session_id | Medium | Exception handler catches `VALUE_ERROR`, returns NULL, no call to `PKG_COMMON.log_error` | Log the exception before returning NULL so corrupted session state is diagnosable |
| TD-06 | `handle_error`'s nested error-logging call is wrapped in `WHEN OTHERS THEN NULL` with no fallback | Operational Risk | HRMS_COMMON_LIB.handle_error | Medium | If `PKG_COMMON.log_error` itself fails (e.g., DB down, package invalid), the failure is silently swallowed — no error is ever surfaced anywhere | Add a last-resort fallback (e.g., `UTL_FILE` write or `DBMS_OUTPUT`) so total logging failure isn't invisible |

---

### Layer Summary — Security Layer

- Technologies confirmed this chunk: Oracle Forms 12c (Active-core), PKG_SECURITY (Active-core, internals unverifiable)
- Patterns found this chunk: AP-01 through AP-04
- NFR entries added this chunk: None (0)
- Technical debt entries added this chunk: TD-01 through TD-06 (6)
- Agent 1 LOW CONFIDENCE items resolved: None — PKG_SECURITY remains unresolved (no package body in Batch 1)
- New LOW CONFIDENCE items raised: AP-01 coverage (which callers actually invoke `check_session`) — not evidenced in this batch's file set
- DISCREPANCIES with Agent 1 found: None
- Cross-layer dependencies to carry to Synthesis: `PKG_SECURITY.authenticate`/`is_session_valid` — Stage 8 authentication assessment depends on this; still unverified after Batch 1

---

## Agent 2 – Chunk 2 of 3 (Batch 1) – Application Layer (Forms Libraries)

**Agent 1 Input This Chunk:**
- Technologies being analysed: Oracle Forms 12c PLL libraries, PKG_COMMON (unscanned), PKG_VALIDATION (unscanned)
- Components being traced: HRMS_COMMON_LIB (toolbar/formatting functions), HRMS_VALIDATION_LIB
- LOW CONFIDENCE items to resolve: PKG_COMMON, PKG_VALIDATION dependencies (unscanned) — not resolvable this chunk

**Carried Forward from Prior Chunks:**
- Validated technologies: Oracle Forms 12c, PKG_SECURITY (from Chunk 1)
- NFR entries catalogued so far: 0
- Technical debt entries catalogued so far: TD-01 – TD-06 (6)
- Unresolved Validation Queue items: PKG_SECURITY internals (carried), + new this chunk

---

### Stage 2 — Technology Stack Assessment

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| HRMS_COMMON_LIB.pll (toolbar/formatting functions) | N/A (Forms library) | Active - core path | Thin wrappers over Forms built-ins (`COMMIT_FORM`, `CLEAR_FORM`, `ENTER_QUERY`/`EXECUTE_QUERY` mode-switch, record navigation, `EXIT_FORM`); attached to all HRMS forms via `ATTACH_LIBRARY` per Agent 1's Component Map | N/A | Confirmed |
| HRMS_VALIDATION_LIB.pll | N/A (Forms library) | Active - core path | Client-side validation for email, phone, SSN, date-not-future, salary range — invoked from Forms `WHEN-VALIDATE-ITEM` triggers (not directly shown in this batch's file set, but confirmed as the library's stated purpose) | N/A | Confirmed |
| PKG_COMMON | UNKNOWN — unscanned | Active - core path (called, not verifiable internally) | `log_error(module, location, message, user)` called from `handle_error` | UNKNOWN | Confirmed reference; LOW - unverifiable |
| PKG_VALIDATION | UNKNOWN — unscanned | Declared-only in this batch — referenced only via documentation comment, no direct call site found in scanned files | Documented as the server-side counterpart to HRMS_VALIDATION_LIB's client-side checks, using `REGEXP_LIKE` per the in-code comment | UNKNOWN | LOW - declared in comments, no call-site evidence found in Batch 1 files |
| Table `JOB_GRADES` | N/A | Active - direct query | Queried by `validate_salary_range`: `SELECT MIN_SALARY, MAX_SALARY FROM JOB_GRADES WHERE GRADE_ID = :p_grade_id` | N/A | New — not previously itemised for this file in Agent 1 OUTPUT 3 detail |

---

### Stage 3 — Architecture Pattern Catalog

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-05 | Toolbar Command Delegation to Forms Built-ins | Communication (UI-to-runtime delegation) | HRMS_COMMON_LIB (toolbar_save, toolbar_clear, toolbar_query, toolbar_first/prev/next/last, toolbar_insert, toolbar_delete, toolbar_exit) | 1:1 wrapper mapping: save→`COMMIT_FORM`, clear→`CLEAR_FORM(ASK_COMMIT)`, query→mode-conditional `ENTER_QUERY`/`EXECUTE_QUERY` on `:SYSTEM.MODE`, exit→`EXIT_FORM(ASK_COMMIT)` | Applied uniformly across all 10 toolbar functions | HIGH | HRMS_COMMON_LIB.pll.sql |
| AP-06 | Dual-Layer (Client + Server) Field Validation | Data Access | HRMS_VALIDATION_LIB ↔ PKG_VALIDATION (server, unscanned) | Client-side: hand-rolled `INSTR`/`TRANSLATE`-based checks for email/phone/SSN/date/salary. Server-side counterpart described in comments as `REGEXP_LIKE`-based — different implementation, not shared code | Partial / inconsistent by design — two independent implementations of the same business rules with no shared source of truth | LOW - server-side (PKG_VALIDATION) implementation not directly observed, only described via in-code comment | HRMS_VALIDATION_LIB.pll.sql |
| AP-07 | Naming-Convention-Coupled LOV Refresh | Data Access | HRMS_COMMON_LIB.refresh_lov | Derives record group name as `'RG_' \|\| UPPER(REPLACE(p_lov_name,'LOV_',''))`; only calls `POPULATE_GROUP` if `FIND_GROUP` resolves (i.e., silently no-ops if the record group doesn't exist under that derived name) | Applies to any LOV whose caller uses the `LOV_x` → `RG_x` convention; silently fails for any that don't | HIGH | HRMS_COMMON_LIB.pll.sql |

---

### Stage 4 — NFR Registry

No NFR entries this chunk. Forms library files contain no timeout, pool-size, retry, rate-limit, or TTL configuration values — this file type is not expected to carry NFRs per the Reading Strategy (client-side validation/UI-wrapper code), so this is expected, not a gap.

---

### Stage 5 — Technical Debt & Risk Register

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-07 | Client-side email/phone/SSN/salary validation duplicated independently in HRMS_VALIDATION_LIB vs. server-side PKG_VALIDATION, with no shared logic and differing implementation approach (`INSTR`/`TRANSLATE` vs. `REGEXP_LIKE`) | Dependency Coupling / Anti-pattern | HRMS_VALIDATION_LIB, PKG_VALIDATION (unscanned) | High | Explicit in-code comment documents this as a known drift source; e.g. `validate_email` rejects/accepts email shapes independently of whatever `PKG_VALIDATION` enforces server-side | Consolidate to a single validation source (ideally server-side, called from client for immediate feedback) or, at minimum, add a regression test asserting parity between the two |
| TD-08 | `validate_salary_range` header comment claims salary-grade data is "cached at form startup," but the code issues a live `SELECT MIN_SALARY, MAX_SALARY ... FROM JOB_GRADES` on every call | Configuration Risk (doc/code mismatch) + potential Scalability Constraint | HRMS_VALIDATION_LIB.validate_salary_range, JOB_GRADES table | Medium | Comment vs. code contradiction is explicit; if this validation runs per-row in a loop (e.g. bulk salary import), it means an uncached DB round-trip per row rather than the cached lookup the comment implies | Either implement the caching the comment describes, or correct the comment — and confirm this function is never called inside a tight loop without batching |
| TD-09 | `refresh_lov`'s `LOV_x → RG_x` derivation is a hard-coded, unenforced naming convention | Configuration Risk | HRMS_COMMON_LIB.refresh_lov | Low | Function is a silent no-op (via `ID_NULL(FIND_GROUP(...))` check) if the convention is violated — no error raised, so a broken LOV refresh could go unnoticed | Add explicit logging/error when `FIND_GROUP` fails to resolve, rather than silent no-op |
| TD-10 | `validate_phone`/`validate_ssn` strip formatting via `TRANSLATE` and hard-assume US phone format (10 or 11 digits) | Scalability Constraint | HRMS_VALIDATION_LIB | Low | `LENGTH(v_digits) NOT IN (10,11)` → reject; no support for international numbers | Acceptable for a US-only HR deployment; flag only if internationalization is ever in scope |

---

### Layer Summary — Application Layer (Forms Libraries)

- Technologies confirmed this chunk: HRMS_COMMON_LIB (Active-core), HRMS_VALIDATION_LIB (Active-core), PKG_COMMON (Active-core, unverifiable), PKG_VALIDATION (Declared-only in this batch)
- Patterns found this chunk: AP-05 through AP-07
- NFR entries added this chunk: None (0)
- Technical debt entries added this chunk: TD-07 through TD-10 (4)
- Agent 1 LOW CONFIDENCE items resolved: None
- New LOW CONFIDENCE items raised: PKG_VALIDATION — no direct call-site found in Batch 1 files (only comment reference)
- DISCREPANCIES with Agent 1 found: None
- Cross-layer dependencies to carry to Synthesis: HRMS_VALIDATION_LIB vs. PKG_VALIDATION drift (AP-06/TD-07) is directly relevant to Stage 6 Pattern Coverage Gaps

---

## Agent 2 – Chunk 3 of 3 (Batch 1) – Data Layer (DB Triggers)

**Agent 1 Input This Chunk:**
- Technologies being analysed: Oracle Database 19c triggers, PKG_AUDIT (unscanned)
- Components being traced: EMPLOYEES, SALARY_RECORDS, LEAVE_REQUESTS, DEPARTMENTS, EMPLOYEE_HISTORY
- Data stores being traced: EMPLOYEE_HISTORY (per Agent 1: confirmed column-shape mismatch flagged in Validation Queue)
- LOW CONFIDENCE items to resolve: Agent 1's confirmed `TRG_EMP_BEFORE_UPDATE` → `EMPLOYEE_HISTORY` column mismatch; 90 vs. 180-day hire-date conflict

**Carried Forward from Prior Chunks:**
- Validated technologies: Oracle Forms 12c, PKG_SECURITY, HRMS_COMMON_LIB, HRMS_VALIDATION_LIB, PKG_COMMON, PKG_VALIDATION
- NFR entries catalogued so far: 0
- Technical debt entries catalogued so far: TD-01 – TD-10 (10)
- Unresolved Validation Queue items: PKG_SECURITY, PKG_COMMON, PKG_VALIDATION internals (all unscanned), AP-01 caller coverage

---

### Stage 2 — Technology Stack Assessment

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| Oracle DB 19c row-level triggers | 19c | Active - core path | 5 triggers scanned this chunk enforce validation, audit, and soft-delete rules directly at the DB layer, independent of Forms | Supported (per Agent 1 stack) | Confirmed |
| PKG_AUDIT | UNKNOWN — unscanned | Active - core path (called with two different arities) | `log_action(table, record_id, action, user, [old_json, new_json])` — called 6-arg from TRG_SALARY_AUDIT/TRG_LEAVE_REQUEST_AUDIT, 4-arg from TRG_DEPARTMENT_AUDIT | UNKNOWN | Confirmed reference; LOW - internal signature (overload vs. optional params) unverifiable without package spec |
| Table `EMPLOYEE_HISTORY` | N/A | Active - written to, but write is malformed | `TRG_EMP_BEFORE_UPDATE` inserts columns (`HISTORY_ID, EMP_ID, CHANGE_TYPE, CHANGE_DATE, OLD_VALUE, NEW_VALUE, CHANGED_BY, CHANGE_REASON`) that do not match the table's actual DDL column set as previously catalogued by Agent 1 | N/A | **DISCREPANCY** — see TD-11 below |

---

### Stage 3 — Architecture Pattern Catalog

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-08 | Row-Level Audit Trigger → Central Audit Package | Observability | TRG_SALARY_AUDIT, TRG_LEAVE_REQUEST_AUDIT, TRG_DEPARTMENT_AUDIT → `PKG_AUDIT.log_action` | Fires `AFTER INSERT OR UPDATE OR DELETE` (SALARY_RECORDS, DEPARTMENTS) or `AFTER UPDATE OF STATUS` (LEAVE_REQUESTS) | **Partial** — granularity is inconsistent: SALARY_RECORDS/LEAVE_REQUESTS capture before/after values as JSON; DEPARTMENTS captures only the fact of change | HIGH | plsql/triggers/trg_audit.sql |
| AP-09 | Manual JSON String Construction for Audit Payloads | Data Access | TRG_SALARY_AUDIT, TRG_LEAVE_REQUEST_AUDIT | Hand-built strings, e.g. `'{"emp_id":' \|\| :NEW.EMP_ID \|\| ',"salary":' \|\| :NEW.BASE_SALARY \|\| ',"effective":"' \|\| TO_CHAR(:NEW.EFFECTIVE_DATE,'YYYY-MM-DD') \|\| '"}'` — no `JSON_OBJECT()` or JSON-safe escaping used | Applied to both salary and leave-status audit records | HIGH | plsql/triggers/trg_audit.sql |
| AP-10 | Column-Specific Conditional Audit Trigger | Observability | TRG_LEAVE_REQUEST_AUDIT | `AFTER UPDATE OF STATUS ON LEAVE_REQUESTS` — fires only when the STATUS column is part of the update, not on every row update | HIGH | plsql/triggers/trg_audit.sql |
| AP-11 | Hard Block on Physical Delete (Enforced Soft-Delete) | Data Access | TRG_EMP_INSTEAD_OF_DELETE on EMPLOYEES | `BEFORE DELETE ... RAISE_APPLICATION_ERROR(-20504, 'Direct deletion not allowed. Use termination process or set ACTIVE_FLAG to N.')` — unconditional, no exception path | Applied to 100% of DELETE attempts against EMPLOYEES, including legitimate ones Oracle Forms expects to succeed | HIGH | plsql/triggers/trg_employees.sql |
| AP-12 | Field-Level Change History Logging (Status/Dept/Job) | Data Access / Observability | TRG_EMP_BEFORE_UPDATE → EMPLOYEE_HISTORY | 3 independent change-type branches (`STATUS_CHANGE`, `DEPARTMENT_CHANGE`, `JOB_CHANGE`), each `INSERT`ing a row via `SEQ_EMP_HISTORY.NEXTVAL` | **Applied but non-functional** — the INSERT statement's column list does not match EMPLOYEE_HISTORY's actual DDL (TD-11), and 2 of the 3 CHANGE_TYPE values used are not permitted by `CHK_CHANGE_TYPE` (TD-12); this pattern will fail at runtime on every department or job change | HIGH (both the pattern's existence and its failure mode are directly evidenced) | plsql/triggers/trg_employees.sql |
| AP-13 | DB-Level Business Rule Enforcement Duplicating Forms-Level Validation | Data Access | TRG_EMP_BEFORE_INSERT (hire-date, email uniqueness) vs. HRMS_EMPLOYEE.xml WHEN-VALIDATE-ITEM (per Agent 1) | DB: hire date must not exceed `SYSDATE + 180`; Forms: 90-day threshold (per Agent 1 finding, not re-verified in this batch's file set) | **Coverage gap / inconsistent** — different thresholds enforced at each layer | HIGH for the DB-side 180-day rule (directly read); the Forms-side 90-day figure is carried from Agent 1 and not independently re-verified in Batch 1 | plsql/triggers/trg_employees.sql |

---

### Stage 4 — NFR Registry

No NFR entries this chunk. The 90-day/180-day hire-date thresholds and SSN/phone/salary validation rules are **functional business rules**, not non-functional (performance/reliability/resource) parameters, and are correctly excluded from the NFR Registry per Stage 4's category definitions — they are instead captured as architecture-pattern/technical-debt findings (AP-13, TD-14).

---

### Stage 5 — Technical Debt & Risk Register

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-11 | `TRG_EMP_BEFORE_UPDATE`'s INSERT into `EMPLOYEE_HISTORY` uses a column list (`HISTORY_ID, EMP_ID, CHANGE_TYPE, CHANGE_DATE, OLD_VALUE, NEW_VALUE, CHANGED_BY, CHANGE_REASON`) that does not match the table's actual DDL column set (`HIST_ID, EMP_ID, CHANGE_TYPE, EFFECTIVE_DATE, OLD_DEPT_ID, NEW_DEPT_ID, OLD_JOB_ID, NEW_JOB_ID, OLD_MANAGER_ID, NEW_MANAGER_ID, OLD_SALARY, NEW_SALARY, OLD_LOCATION, NEW_LOCATION, REASON_CODE, COMMENTS, CREATED_BY, CREATED_DATE`) | Anti-pattern / Configuration Risk | TRG_EMP_BEFORE_UPDATE, EMPLOYEE_HISTORY | **Critical** | Column names/counts are completely different in shape (generic OLD_VALUE/NEW_VALUE vs. typed per-attribute columns); this INSERT would raise `ORA-00904: invalid identifier` against the DDL. Originally flagged LOW by Agent 1; confirmed HIGH via direct trigger-body read in this chunk — this is a real defect, not a scan artifact | Rewrite `TRG_EMP_BEFORE_UPDATE`'s history-insert logic to match the actual EMPLOYEE_HISTORY column set, or migrate the table DDL to match the trigger's intended generic-audit shape — pick one source of truth |
| TD-12 | Even if TD-11's column mismatch is fixed, `TRG_EMP_BEFORE_UPDATE` writes `CHANGE_TYPE = 'DEPARTMENT_CHANGE'` and `'JOB_CHANGE'`, neither of which is in `EMPLOYEE_HISTORY.CHK_CHANGE_TYPE`'s allowed list (`HIRE, TRANSFER, PROMOTION, DEMOTION, SALARY_CHANGE, TERMINATION, REHIRE, LEAVE_START, LEAVE_END, STATUS_CHANGE`) | Anti-pattern / Configuration Risk | TRG_EMP_BEFORE_UPDATE, EMPLOYEE_HISTORY.CHK_CHANGE_TYPE | **Critical** | Direct comparison of trigger literal values against the constraint's allowed value list; closest allowed value is `'TRANSFER'` | Either add `DEPARTMENT_CHANGE`/`JOB_CHANGE` to the check constraint, or change the trigger to emit `'TRANSFER'`/an appropriate existing value — this is a guaranteed `ORA-02290` on every department or job change once TD-11 is fixed |
| TD-13 | `TRG_EMP_INSTEAD_OF_DELETE` unconditionally blocks all physical deletes on EMPLOYEES, but Oracle Forms' `DELETE_RECORD` built-in expects the DELETE to succeed | Operational Risk | TRG_EMP_INSTEAD_OF_DELETE, all Forms calling `DELETE_RECORD` against EMPLOYEES | High | Documented in-code as a known bug; workaround (set `ACTIVE_FLAG='N'` + `CLEAR_RECORD` instead of `DELETE_RECORD`) exists only as a comment, not enforced anywhere in the trigger or (per Agent 1) confirmed present in HRMS_EMPLOYEE.xml | Verify HRMS_EMPLOYEE.xml's delete button actually uses the workaround pattern rather than `DELETE_RECORD`; if not, every delete attempt via the standard UI path fails with ORA-20504 |
| TD-14 | Hire-date validation threshold conflict: Forms-layer WHEN-VALIDATE-ITEM (90 days per Agent 1) vs. DB-layer TRG_EMP_BEFORE_INSERT (`SYSDATE + 180`, directly confirmed) | Anti-pattern (Business Logic Duplication/Drift) | HRMS_EMPLOYEE.xml, TRG_EMP_BEFORE_INSERT | High | Directly read DB threshold (180 days) contradicts Agent 1's Forms-layer threshold (90 days); a hire date 91–180 days out is rejected by Forms but would be accepted by any non-Forms insert path (batch job, direct SQL) | Establish a single source of truth for this business rule — ideally the DB constraint, with Forms validation relaxed to match or removed entirely |
| TD-15 | EMPLOYEES.EMAIL uniqueness is enforced only by `TRG_EMP_BEFORE_INSERT`'s trigger-based COUNT check, not by a DB unique constraint, and the check only considers `ACTIVE_FLAG='Y'` rows | Configuration Risk / Anti-pattern | TRG_EMP_BEFORE_INSERT, EMPLOYEES | High | Trigger's inline comment claims a backing unique constraint exists; only `UK_EMP_NUMBER` (on EMP_NUMBER) is present in schema DDL per Agent 1 — no unique constraint on EMAIL. A terminated employee's email can be reused by a new active employee without any conflict, and any insert path bypassing this trigger (direct SQL with triggers disabled, data load) has zero email-uniqueness protection | Add a proper unique index/constraint on EMAIL (partial/functional index scoped to ACTIVE_FLAG='Y' if reuse-after-termination is intentional business behavior) rather than relying solely on trigger logic |
| TD-16 | `PKG_AUDIT.log_action` is called with two different argument counts: 6-arg (table, id, action, user, old_json, new_json) for SALARY_RECORDS/LEAVE_REQUESTS vs. 4-arg (table, id, action, user) for DEPARTMENTS | Dependency Coupling / Configuration Risk | trg_audit.sql (all 3 triggers), PKG_AUDIT (unscanned) | Medium | Directly observed arity difference in the DDL; requires `PKG_AUDIT.log_action` to be overloaded or have default parameters — cannot be confirmed without the package spec | Obtain/scan PKG_AUDIT's spec to confirm the signature supports both call shapes; if not, TRG_DEPARTMENT_AUDIT will fail to compile/execute |
| TD-17 | Audit JSON payloads built via raw string concatenation (`'{"key":"' \|\| value \|\| '"}'`) rather than `JSON_OBJECT()` or an escaping-safe builder | Configuration Risk | TRG_SALARY_AUDIT, TRG_LEAVE_REQUEST_AUDIT | Medium | Currently safe because only numeric/date fields are embedded, but the pattern is fragile — any future addition of a free-text field (e.g. a change reason) risks malformed JSON if it contains quote characters | Replace manual concatenation with `JSON_OBJECT(...)` before any text field is added to the audit payload |
| TD-18 | TRG_DEPARTMENT_AUDIT captures no before/after values — only records that a change occurred | Operational Risk (Compliance Gap) | TRG_DEPARTMENT_AUDIT, DEPARTMENTS | Medium | 4-arg `PKG_AUDIT.log_action` call omits old/new JSON entirely, unlike the salary and leave audit triggers | Extend TRG_DEPARTMENT_AUDIT to capture old/new values consistently with the other two audit triggers, for compliance parity |
| TD-19 | Trigger naming/comment drift: `TRG_EMP_INSTEAD_OF_DELETE` is a `BEFORE DELETE` trigger but its header comment labels it `TRG_EMP_AFTER_DELETE` | Configuration Risk (documentation drift) | trg_employees.sql | Low | Directly observed mismatch between comment label and actual trigger timing/name | Correct the header comment to match the actual trigger name and timing |

---

### Layer Summary — Data Layer (DB Triggers)

- Technologies confirmed this chunk: Oracle DB 19c triggers (Active-core), PKG_AUDIT (Active-core, unverifiable signature consistency)
- Patterns found this chunk: AP-08 through AP-13
- NFR entries added this chunk: None (0)
- Technical debt entries added this chunk: TD-11 through TD-19 (9) — includes 2 Critical severity items
- Agent 1 LOW CONFIDENCE items resolved: EMPLOYEE_HISTORY column-shape mismatch — **RESOLVED/CONFIRMED** as a genuine Critical defect (TD-11) via direct trigger-body read, not just naming inference; hire-date 90-vs-180-day conflict — **RESOLVED/CONFIRMED** as a genuine cross-layer inconsistency (TD-14)
- New LOW CONFIDENCE items raised: PKG_AUDIT's actual signature (overload vs. default params) — cannot resolve without package spec
- DISCREPANCIES with Agent 1 found: None new — this chunk corroborates and upgrades confidence on discrepancies Agent 1 had already flagged (EMPLOYEE_HISTORY shape, hire-date threshold)
- Cross-layer dependencies to carry to Synthesis: TD-11/TD-12 (broken EMPLOYEE_HISTORY writes) are Critical and should be the top candidate for Stage 8's "Highest-priority action item" once Batch 2 synthesis runs; AP-13/TD-14 (hire-date drift) feeds Stage 6 Pattern Coverage Gaps

---

## Batch 1 Cumulative Totals (for Batch 2 continuity)

- **AP-01 through AP-13** (13 architecture patterns catalogued)
- **NFR-**: none catalogued this batch — next NFR found in Batch 2 should start at **NFR-01**
- **TD-01 through TD-19** (19 technical debt/risk items — 2 Critical, 6 High, 9 Medium, 2 Low)

Batch 2 should continue numbering at **AP-14**, **NFR-01**, **TD-20**.

**Note for Synthesis:** TD-11 and TD-12 (broken `EMPLOYEE_HISTORY` writes on every status/department/job change) are the most severe findings in Batch 1 and are strong candidates for the eventual "Highest-priority action item" in the Final Response Assembly, pending whatever Batch 2 surfaces.
