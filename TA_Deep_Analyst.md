# TA Agent 2 — Deep Analyst Output
> Target system: Oracle Forms Legacy HR System (HRMS) v4.2
> Pair with: TA_Agent1_StackScout_v2.md (`TA_Stack_Scout.md`) | Agent 2 version: 2.0

---

## Agent 2 - Chunk 0 - Orientation Pass

**Input completeness check:** All 6 required Agent 1 outputs are present and populated in `TA_Stack_Scout.md` (Technology Stack Inventory, Component & Service Map, Data Store Registry, Infrastructure & Deployment Blueprint, Integration & Dependency Graph, Security & Configuration Snapshot). Activation condition met in full — proceeding without reduced-reliability flags on output availability.

**Standing analysis constraint (carried through every chunk below):** All 12 PL/SQL packages that hold the actual business logic (`PKG_SECURITY`, `PKG_EMPLOYEE`, `PKG_PAYROLL`, `PKG_LEAVE`, `PKG_VALIDATION`, `PKG_AUDIT`, `PKG_COMMON`, `PKG_DEPARTMENT`, `PKG_PERFORMANCE`, `PKG_NOTIFICATION`, `PKG_REPORTING`, `PKG_INTEGRATION`) have zero spec/body files scanned by either agent. Every finding in this document that depends on package internals is explicitly marked `LOW` or `ASSUMED` per the Confidence Rules — none is asserted `HIGH` on inferred package behavior.

**Resolution Targets — Agent 1 Validation Queue (31 items) carried forward as priority targets:**
Items #2, #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14, #17, #18, #19, #20, #21, #22, #23, #24, #29, #30, #31 are all directly addressable from the deep-scan file contents provided and are resolved/confirmed below with exact evidence. Items #1 (Oracle Reports version), #15 (partially — see TD-25), #16 (confirmed), #25 (packages unscanned), #26 (5 forms unscanned), #27/#28 (architecture notes) remain open — no new source material was provided to close them; they are carried into the final Validation Queue unresolved.

**Layer Processing Order applied** (per Decision Rules — adapted to this monolith's actual shape):
1. Security & Integration Layer — `PKG_SECURITY` is the single most cross-referenced dependency in the entire system (every scanned form calls it) and carries the highest risk surface; the 3 flagged external integrations (SMTP, GL feed, Benefits feed) are config-row-only with no dedicated code to deep-read, so they are folded into this chunk rather than given a standalone one.
2. Application Layer (Forms, PLL libraries, menu, business-rule triggers)
3. Data Layer (tables, views, sequences, seed data)
4. CI/CD & Deployment Layer — confirmed NOT FOUND, brief chunk
5. Infrastructure Layer — confirmed NOT FOUND, brief chunk
6. Observability Layer — confirmed NOT FOUND, brief chunk, closes into Synthesis

**Expected Pattern Checklist** (derived from Agent 1's OUTPUT 1 stack): custom session/permission-based auth (no OAuth2/JWT library present → expect hand-rolled session table pattern); no message queue/event bus in stack → expect purely synchronous PL/SQL call patterns; no ORM present → expect direct Forms-block-to-table binding (2-tier data access); no cache technology in stack → expect zero caching patterns (confirmed later — even the one function whose *comment* claims caching does not actually cache); no resilience library (Resilience4j/Polly-equivalent) in stack → expect zero retry/circuit-breaker/timeout patterns anywhere in the system. All four expectations were confirmed true during the deep read below.

**NFR categories expected:** session timeout / password policy (from `SYSTEM_PARAMETERS`), Forms record-fetch/display sizing, no connection-pool/thread-pool NFRs expected (WebLogic pool config not in scanned set — logged as a gap, not fabricated).

---

## Agent 2 - Chunk 1 of 6 - Security & Integration Layer

**Agent 1 Input This Chunk:**
- Technologies being analysed: `PKG_SECURITY` (authenticate, is_session_valid, has_permission, logout), `USER_SESSIONS` table, `SYSTEM_PARAMETERS` config rows, 3 flagged external integrations (SMTP, GL feed, Benefits feed)
- Components being traced: HRMS_LOGIN, HRMS_MENU (permission gating), HRMS_COMMON_LIB.check_session
- LOW CONFIDENCE items to resolve: Validation Queue #25 (packages unscanned, partial), #22, #23, #24

**Carried Forward from Prior Chunks:** None (first chunk).

---

### Stage 2 - Technology Usage Analysis

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| PKG_SECURITY | UNKNOWN | Active - core path (call sites confirmed in all 7 scanned Forms/library files) | Backs authenticate/session-validate/permission-check/logout for every module; body itself never scanned by either agent | UNKNOWN - custom code | Confirmed (Agent 1 marked call-site HIGH, body LOW — unchanged) |
| USER_SESSIONS (table) | Oracle DB 19c native | Active - core path | Presumed backing store for `is_session_valid`/`authenticate`/`logout` based on column shape (SESSION_ID, EMP_ID, LOGIN_TIME, LOGOUT_TIME, SESSION_STATUS) — inferred, not confirmed by reading package body | Supported (native DB feature) | New - not explicitly named in Agent 1's OUTPUT 3 narrative, but consistent with it |
| SYSTEM_PARAMETERS (config-as-data) | Oracle DB 19c native | Active - core path | Only structured config source in the system; holds session timeout, password policy, payroll defaults, integration on/off flags | Supported | Confirmed (Agent 1 OUTPUT 6) |
| SMTP Mail Relay | UNKNOWN | Declared-only - no usage evidence found | Only a config row (`NOTIFICATION.SMTP_HOST`, `NOTIFICATION.FROM_ADDRESS`); no `UTL_MAIL`/`UTL_SMTP` call site found anywhere in the deep-read file set | N/A | Confirmed (Agent 1 already flagged LOW) |
| GL Feed / Benefits Feed | UNKNOWN | Declared-only - no usage evidence found | Only status flags (`INTEGRATION.GL_FEED_STATUS`/`BENEFITS_FEED_STATUS` = ACTIVE); no endpoint, protocol, or call site found | N/A | Confirmed (Agent 1 already flagged LOW) |

### Stage 3 - Architecture Pattern Catalog (this chunk)

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-01 | Custom session-based authentication | Security | HRMS_LOGIN → PKG_SECURITY.authenticate | Session ID returned as a NUMBER, stored client-side as `:GLOBAL.session_id` (converted via TO_CHAR); no OAuth2/OIDC/JWT — fully custom | Applied consistently at the single login entry point | HIGH | forms/xml-exports/HRMS_LOGIN.xml BTN_LOGIN |
| AP-02 | Session-validity gate on every module entry | Security | HRMS_COMMON_LIB.check_session; WHEN-NEW-FORM-INSTANCE in HRMS_EMPLOYEE, HRMS_PAYROLL, HRMS_PERFORMANCE, HRMS_LEAVE, HRMS_MENU | Calls `PKG_SECURITY.is_session_valid(session_id)`; on failure shows a message and raises `FORM_TRIGGER_FAILURE` (Forms built-in abort) | Applied consistently — confirmed present in all 6 scanned form/library files | HIGH | forms/libraries/HRMS_COMMON_LIB.pll.sql; all 5 non-login form XML files |
| AP-03 | Role/permission-based authorization (custom RBAC-style) | Security | `PKG_SECURITY.has_permission(emp_id, module, action)` | Signature: (emp_id NUMBER, module VARCHAR2, action VARCHAR2) → BOOLEAN; used with module values `PAYROLL`/`ADMIN`/`REPORTS`/`EMPLOYEE` and action values `VIEW`/`EDIT`/`APPROVE` | **Partial** — see Pattern Coverage Gaps in Stage 6; depth of check varies wildly by module (see AP-04) | HIGH | forms/xml-exports/HRMS_MENU.xml, HRMS_EMPLOYEE.xml, HRMS_PAYROLL.xml |
| AP-04 | Defense-in-depth asymmetry: menu-path vs. button-path authorization | Security / Anti-pattern | HRMS_MENU.xml — MI_PAYROLL/MI_REPORTS (menu bar) vs. BTN_PAYROLL/BTN_REPORTS (buttons) | Button path: `SET_MENU_ITEM_PROPERTY(...,ENABLED,PROPERTY_FALSE)` at form-load **plus** an explicit `PKG_SECURITY.has_permission` runtime check inside `WHEN-BUTTON-PRESSED`. Menu-bar path: relies **only** on the disabled-state property set once at load — no independent runtime check inside the menu item's own command | Applied inconsistently between the two access paths to the identical target forms | HIGH | forms/xml-exports/HRMS_MENU.xml |
| AP-05 | Encrypted-at-rest PII columns | Security | EMPLOYEES.SSN_ENCRYPTED, EMPLOYEE_DEPENDENTS.SSN_ENCRYPTED, EMPLOYEE_BANK_ACCOUNTS.ACCOUNT_NUMBER_ENC | Column comment asserts "AES-256 encrypted SSN — decrypted only in PKG_SECURITY" | Declared via schema comment only | ASSUMED - reason: encryption algorithm and decrypt logic live entirely inside the unscanned PKG_SECURITY body; only the column comment's claim was found, not the implementation | schema/tables/01_core_tables.sql, schema/tables/02_payroll_tables.sql |
| AP-06 | Config-as-data (no external secrets/config service) | Security / Configuration | SYSTEM_PARAMETERS table | PARAM_GROUP.PARAM_CODE keys: `SECURITY.SESSION_TIMEOUT_MIN`=30, `SECURITY.PASSWORD_MIN_LENGTH`=8, `PAYROLL.DEFAULT_PAY_FREQUENCY`=MONTHLY, `PAYROLL.FISCAL_YEAR_START`=10, `NOTIFICATION.SMTP_HOST`=smtp.internal.company.com, `NOTIFICATION.FROM_ADDRESS`=hrms-noreply@company.com, `INTEGRATION.GL_FEED_STATUS`=ACTIVE, `INTEGRATION.BENEFITS_FEED_STATUS`=ACTIVE | Single source of runtime config across Security/Payroll/Notification/Integration domains | HIGH (rows exist) | data/seed/01_reference_data.sql, schema/tables/04_performance_tables.sql |

### Stage 4 - NFR Registry (this chunk)

| ID | NFR Name | Value | Category | Source | Confidence |
|---|---|---|---|---|---|
| NFR-01 | Session timeout | 30 minutes (`SECURITY.SESSION_TIMEOUT_MIN`) | Availability | data/seed/01_reference_data.sql (SYSTEM_PARAMETERS row) | HIGH - value stored / LOW - reason: cannot confirm `PKG_SECURITY.is_session_valid` actually reads and enforces this parameter; body unscanned |
| NFR-02 | Password minimum length | 8 characters (`SECURITY.PASSWORD_MIN_LENGTH`) | Reliability (Security policy) | data/seed/01_reference_data.sql (SYSTEM_PARAMETERS row) | HIGH - value stored / LOW - reason: no code path found anywhere in scanned files that reads this parameter and rejects a short password — HRMS_LOGIN.xml BTN_LOGIN only checks username/password NOT NULL |
| NFR-03 | Default pay frequency | MONTHLY (`PAYROLL.DEFAULT_PAY_FREQUENCY`) | Data Freshness / Config | data/seed/01_reference_data.sql (SYSTEM_PARAMETERS row) | HIGH |
| NFR-04 | Fiscal year start month | 10 = October (`PAYROLL.FISCAL_YEAR_START`) | Config | data/seed/01_reference_data.sql (SYSTEM_PARAMETERS row) | HIGH |

### Stage 5 - Technical Debt & Risk Register (this chunk)

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-01 | Password transmitted in cleartext over the Forms applet protocol (confirmed, explicitly documented) | Security Vulnerability | HRMS_LOGIN | **Critical** | HRMS_LOGIN.xml header comment: "Password field transmitted in cleartext (Forms applet limitation)" | Terminate Forms sessions over TLS at the network layer (Forms-over-HTTPS / JPI applet with SSL) or migrate the login tier to a modern web front end that can enforce TLS end-to-end |
| TD-02 | No account lockout after repeated failed login attempts | Security Vulnerability | HRMS_LOGIN / PKG_SECURITY.authenticate | High | HRMS_LOGIN.xml header comment, confirmed no lockout logic in BTN_LOGIN | Add a failed-attempt counter + lockout window to PKG_SECURITY.authenticate or USER_SESSIONS-adjacent table |
| TD-03 | No CAPTCHA or 2FA support — single factor only | Security Vulnerability | HRMS_LOGIN | High | HRMS_LOGIN.xml header comment | Add 2FA (TOTP or equivalent) at minimum for ADMIN/PAYROLL-approval-capable accounts |
| TD-04 | HRMS_PERFORMANCE has no module-level `has_permission` gate at all, and no edit-specific authorization for `OVERALL_RATING`/`SELF_ASSESSMENT`/`MANAGER_ASSESSMENT` — any authenticated user who can open the form can edit any review record they can navigate to | Security Vulnerability / Anti-pattern | HRMS_PERFORMANCE.xml | High | Compared against HRMS_PAYROLL.xml (form-level VIEW gate) and HRMS_EMPLOYEE.xml (EDIT gate disabling INSERT/UPDATE/DELETE) — HRMS_PERFORMANCE's WHEN-NEW-FORM-INSTANCE contains no equivalent `PKG_SECURITY.has_permission` call | Add a `PERFORMANCE/VIEW` module gate at form load and a `PERFORMANCE/EDIT` (or reviewer-only) gate before allowing rating/assessment updates |
| TD-05 | HRMS_PAYROLL `BTN_CREATE_RUN` and `BTN_CALCULATE` carry no explicit permission check beyond the form-level `PAYROLL/VIEW` gate checked once at load — any user who can view Payroll can also create and calculate runs; only `BTN_APPROVE` has its own `PAYROLL/APPROVE` check | Security Vulnerability | HRMS_PAYROLL.xml | High | Direct read of all 3 button triggers — BTN_CREATE_RUN and BTN_CALCULATE have no `has_permission` call; BTN_APPROVE does | Add explicit `PAYROLL/CREATE` and `PAYROLL/CALCULATE` (or equivalent) permission checks mirroring the BTN_APPROVE pattern |
| TD-06 | Menu-bar authorization path (`MI_PAYROLL`, `MI_REPORTS`) relies solely on the disabled-state property set once at form load, with no independent runtime permission check, unlike the button path to the same target forms | Anti-pattern (Coverage gap, AP-04) | HRMS_MENU.xml | Medium | Direct comparison of MENU_MAIN CommandText blocks vs. MENU_CONTROL button triggers | Add the same `has_permission` runtime check inside the menu item CommandText that the equivalent button already has |
| TD-07 | HRMS_LOGIN's catch-all `WHEN OTHERS` handler swallows the `SELECT EMP_ID INTO ... FROM EMPLOYEES` lookup's `NO_DATA_FOUND`/`TOO_MANY_ROWS` uniformly with genuine authentication failures, and the lookup's `ROWNUM=1` silently picks an arbitrary row when more than one ACTIVE employee shares the same EMAIL — masking a data-integrity problem (see TD-24) instead of surfacing it | Operational Risk / Data Integrity | HRMS_LOGIN.xml BTN_LOGIN | Medium | Direct read of BTN_LOGIN trigger body | Split the exception handling: keep the vague "Invalid username or password" message for `PKG_SECURITY.authenticate` failures (correct security practice), but log (not silently swallow) `TOO_MANY_ROWS` from the EMP_ID lookup as a distinct data-integrity alert |
| TD-08 | `SECURITY.PASSWORD_MIN_LENGTH`=8 is configured in SYSTEM_PARAMETERS but no code path in any scanned file reads or enforces it | Configuration Risk | SYSTEM_PARAMETERS, HRMS_LOGIN | Medium | Cross-reference NFR-02 config row vs. BTN_LOGIN validation logic (NOT NULL check only) | Confirm whether `PKG_SECURITY.authenticate` or a password-change form (unscanned) enforces this; if neither does, the parameter is decorative and should either be wired up or removed |
| TD-09 | `SECURITY.SESSION_TIMEOUT_MIN`=30 is configured but its enforcement inside `PKG_SECURITY.is_session_valid` cannot be confirmed from any scanned file | Operational Risk | SYSTEM_PARAMETERS, PKG_SECURITY | Low-Medium | Cross-reference NFR-01 | Confirm the timeout is actually read from SYSTEM_PARAMETERS at runtime rather than hard-coded or absent inside the unscanned package body |

---

### Layer Summary - Security & Integration Layer
- Technologies confirmed this chunk: PKG_SECURITY (Active — core path, call-site only), USER_SESSIONS (Active — inferred), SYSTEM_PARAMETERS (Active — core path), SMTP/GL/Benefits integrations (Declared-only, no usage evidence)
- Patterns found this chunk: AP-01 through AP-06
- NFR entries added this chunk: NFR-01 through NFR-04
- Technical debt entries added this chunk: TD-01 through TD-09
- Agent 1 LOW CONFIDENCE items resolved: Validation Queue #22 (RESOLVED — exact button-level evidence captured as TD-05), #23 (RESOLVED — exact gap captured as TD-04), #24 (RESOLVED — exact gap captured as TD-06/AP-04)
- New LOW CONFIDENCE items raised: enforcement of NFR-01/NFR-02 (session timeout, password policy) cannot be confirmed without `PKG_SECURITY` body
- DISCREPANCIES with Agent 1 found: None
- Cross-layer dependencies to carry to Synthesis: PKG_SECURITY is the highest-inbound-dependency component in the whole system (called by all 6 scanned forms) — flag as the primary Coupling Hotspot in Stage 7; TD-07/TD-24 (email uniqueness masking) crosses into the Data layer

---

## Agent 2 - Chunk 2 of 6 - Application Layer

**Agent 1 Input This Chunk:**
- Technologies being analysed: Oracle Forms 12c, HRMS_COMMON_LIB.pll, HRMS_VALIDATION_LIB.pll, HRMS_MENU.mmb, 6 Forms modules, 3 DB business-rule triggers
- Components being traced: HRMS_LOGIN, HRMS_MENU, HRMS_EMPLOYEE, HRMS_PAYROLL, HRMS_PERFORMANCE, HRMS_LEAVE
- LOW CONFIDENCE items to resolve: Validation Queue #2, #17, #18, #19, #20, #21, #29, #30, #31

**Carried Forward from Prior Chunks:**
- Validated technologies: PKG_SECURITY, USER_SESSIONS, SYSTEM_PARAMETERS (Chunk 1)
- NFR entries catalogued so far: NFR-01 through NFR-04 (4 total)
- Technical debt entries catalogued so far: TD-01 through TD-09 (9 total)
- Unresolved Validation Queue items: #1, #15, #16, #25, #26, #27, #28 (7 items)

---

### Stage 2 - Technology Usage Analysis

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| HRMS_COMMON_LIB (PLL) | N/A | Active - core path | Attached to all HRMS forms; supplies toolbar handlers, centralized error handler (`handle_error`), session check, date formatting, LOV refresh | N/A (custom code) | Confirmed |
| HRMS_VALIDATION_LIB (PLL) | N/A | Active - core path, but **duplicative** | Client-side field validation (email, phone, SSN, date, salary-range); explicitly documented to drift from server-side `PKG_VALIDATION` | N/A (custom code) | Confirmed |
| HRMS_MENU (Menu Module) | N/A | Active - core path | Defines MAIN_MENUBAR; all module launch points route through `OPEN_FORM` | N/A | Confirmed |
| Oracle Forms 12c (per-form usage) | 12c | Active - core path across all 6 scanned forms | Session gate + permission gate + block-bound CRUD + Forms-native master-detail relations in every module | Oracle Forms 12c is a Sustaining Support-era release (Oracle Lifetime Support model places Forms 12c past Premier Support) | LOW - EOL/support-tier detail not independently verifiable from source files alone; flagged as architecturally expected risk, not confirmed against Oracle's published support calendar |

### Stage 3 - Architecture Pattern Catalog (this chunk)

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-07 | Centralized error-handling library procedure | Observability / Error Handling | HRMS_COMMON_LIB.handle_error | Captures `SQLCODE`/`SQLERRM`; calls `PKG_COMMON.log_error(module, location, msg, NVL(:GLOBAL.current_user, USER))` inside a nested block that swallows all exceptions (`WHEN OTHERS THEN NULL`) to prevent recursive failure; calls `MESSAGE()` twice (documented Forms UI requirement); raises `FORM_TRIGGER_FAILURE` | **Declared but usage unconfirmed** — none of the 6 scanned form/trigger files was observed actually calling `HRMS_COMMON_LIB.handle_error`; every form instead implements its own bespoke error handling inline (e.g., HRMS_EMPLOYEE's `ON-ERROR` trigger, HRMS_LOGIN's own `WHEN OTHERS`) | LOW - reason: the procedure exists and is well-formed, but no call site was found in any of the 6 forms scanned; either it is invoked from unscanned code (the 5 unscanned forms, or package bodies) or it is effectively unused | forms/libraries/HRMS_COMMON_LIB.pll.sql |
| AP-08 | Client-side field validation library | Data Validation | HRMS_VALIDATION_LIB — validate_email, validate_phone, validate_ssn, validate_date_not_future, validate_salary_range | Email: rejects missing/leading/trailing `@`, requires a `.` after `@` not immediately adjacent or at string end. Phone: strips non-digits via `TRANSLATE`, valid only if resulting digit count is 10 or 11. SSN: strips non-digits, must be exactly 9 digits, rejects all-zero area/group/serial segments. Salary range: live query against `JOB_GRADES.MIN_SALARY`/`MAX_SALARY` | Applied at client tier only for the fields listed | HIGH | forms/libraries/HRMS_VALIDATION_LIB.pll.sql |
| AP-09 | Client/server validation duplication & drift (email format) | Anti-pattern / Data Validation | HRMS_VALIDATION_LIB.validate_email (client) vs. `PKG_VALIDATION.validate_email_format` (server, called from HRMS_EMPLOYEE's `WHEN-VALIDATE-ITEM` on EMAIL) | Two independently named, independently implemented functions enforcing (potentially) different email-format rules with no shared source of truth | Declared but unused — actually **used in two divergent places simultaneously**, which is the defect | HIGH - both call sites read directly | forms/libraries/HRMS_VALIDATION_LIB.pll.sql; forms/xml-exports/HRMS_EMPLOYEE.xml |
| AP-10 | Business-rule threshold conflict — hire-date future-dating limit | Anti-pattern / Data Validation | HRMS_EMPLOYEE.xml `WHEN-VALIDATE-ITEM(HIRE_DATE)` = 90 days vs. `TRG_EMP_BEFORE_INSERT` = 180 days | Forms: `:EMPLOYEE.HIRE_DATE > SYSDATE + 90` → block. DB: `:NEW.HIRE_DATE > SYSDATE + 180` → `RAISE_APPLICATION_ERROR(-20501,...)` | Inconsistent between the two enforcement points — see NFR-14/NFR-15, TD-10 | HIGH - both sites read directly | forms/xml-exports/HRMS_EMPLOYEE.xml; plsql/triggers/trg_employees.sql |
| AP-11 | Toolbar command wrapper procedures | UI Abstraction | HRMS_COMMON_LIB.toolbar_save/clear/query/first/prev/next/last/insert/delete/exit | Thin 1:1 wrappers around Forms built-ins (`COMMIT_FORM`, `CLEAR_FORM(ASK_COMMIT)`, `ENTER_QUERY`/`EXECUTE_QUERY` mode-dispatch, navigation built-ins, `EXIT_FORM(ASK_COMMIT)`) | Applied uniformly via the shared toolbar canvas | HIGH | forms/libraries/HRMS_COMMON_LIB.pll.sql |
| AP-12 | LOV ↔ Record-Group naming-convention coupling | Configuration Risk | HRMS_COMMON_LIB.refresh_lov | Hard-coded string transform: `'RG_' \|\| UPPER(REPLACE(p_lov_name,'LOV_',''))` — only refreshes if `FIND_GROUP` resolves that derived name | Fragile — breaks silently (no refresh, no error) if any LOV/RG pair diverges from this exact naming convention | HIGH | forms/libraries/HRMS_COMMON_LIB.pll.sql |
| AP-13 | Optimistic-concurrency conflict handling | Data Access / Concurrency | HRMS_EMPLOYEE.xml `ON-ERROR` trigger | Traps Oracle Forms error 40501 ("unable to reserve record") → `MESSAGE('Record is locked by another user. Please try again.')`; also traps 40202 (suppressed) and 40401 ("No changes to save") | Applied only in HRMS_EMPLOYEE among the scanned forms — not confirmed present in Payroll/Leave/Performance `ON-ERROR` triggers (none of those files show an equivalent block) | HIGH for HRMS_EMPLOYEE / Coverage gap elsewhere | forms/xml-exports/HRMS_EMPLOYEE.xml |
| AP-14 | Master-detail cascading Forms relations | Data Access | EMP_SALARY_REL, PERIOD_RUN_REL, CYCLE_REVIEW_REL, REVIEW_GOAL_REL | EMP_SALARY_REL: `DeleteRecordBehavior=Cascading`, `AutoQuery=Yes`; the other three: `AutoQuery=Yes` (delete behavior not documented as cascading in the excerpts read) | Applied across all 3 master-detail forms | HIGH | forms/xml-exports/HRMS_EMPLOYEE.xml, HRMS_PAYROLL.xml, HRMS_PERFORMANCE.xml |
| AP-15 | Payroll run lifecycle state machine | Workflow Orchestration | PAYROLL_RUNS.STATUS + HRMS_PAYROLL.xml button gates | PENDING → (BTN_CALCULATE, requires STATUS='PENDING') → CALCULATED → (BTN_APPROVE, requires `PAYROLL/APPROVE` permission) → APPROVED → PAID; alternate terminal states REVERSED/ERROR per `CHK_RUN_STATUS` | Enforced partly by Forms button-level checks, partly by the DB `CHK_RUN_STATUS` constraint; no button/trigger observed to drive CALCULATED→APPROVED→PAID transitions other than BTN_APPROVE (PAID/REVERSED transitions rely on unscanned `PKG_PAYROLL` logic) | HIGH for PENDING/CALCULATED/APPROVED steps; LOW - reason: PAID/REVERSED/ERROR transitions live entirely inside unscanned `PKG_PAYROLL` | forms/xml-exports/HRMS_PAYROLL.xml; schema/tables/02_payroll_tables.sql |
| AP-16 | Leave request lifecycle state machine | Workflow Orchestration | LEAVE_REQUESTS.STATUS + HRMS_LEAVE.xml button gates | Cancellation allowed only from PENDING/APPROVED (`BTN_CANCEL_REQUEST`); full lifecycle per `CHK_LR_STATUS`: PENDING/APPROVED/REJECTED/CANCELLED/TAKEN | Approval/rejection transitions not present in the scanned form (relies on the stubbed-out "Pending Approvals" tab / `PKG_LEAVE`, unscanned) | HIGH for cancellation path; LOW for approval/rejection path | forms/xml-exports/HRMS_LEAVE.xml; schema/tables/03_leave_tables.sql |
| AP-17 | Employee lifecycle integrity guards | Data Access / Anti-pattern | TRG_EMP_BEFORE_UPDATE, TRG_EMP_INSTEAD_OF_DELETE | Blocks direct reactivation (`TERMINATED`→`ACTIVE`, ORA-20503); unconditionally blocks all physical DELETE on EMPLOYEES (ORA-20504) regardless of caller | DB-level guard is unconditional and absolute; Forms UI is **not** adapted to it (see TD-19) | HIGH | plsql/triggers/trg_employees.sql; forms/xml-exports/HRMS_EMPLOYEE.xml |

### Stage 4 - NFR Registry (this chunk)

| ID | NFR Name | Value | Category | Source | Confidence |
|---|---|---|---|---|---|
| NFR-05 | PAY_PERIOD block record-fetch size | 10 rows | Throughput | forms/xml-exports/HRMS_PAYROLL.xml (RecordsDisplayed) | HIGH |
| NFR-06 | PAYROLL_RUN block record-fetch size | 5 rows | Throughput | forms/xml-exports/HRMS_PAYROLL.xml | HIGH |
| NFR-07 | EMPLOYEE block record-fetch size | 1 row (NavigationStyle "Same Record") | Throughput | forms/xml-exports/HRMS_EMPLOYEE.xml | HIGH |
| NFR-08 | SALARY detail block record-fetch size | 5 rows | Throughput | forms/xml-exports/HRMS_EMPLOYEE.xml | HIGH |
| NFR-09 | PERFORMANCE_REVIEW block record-fetch size | 8 rows | Throughput | forms/xml-exports/HRMS_PERFORMANCE.xml | HIGH |
| NFR-10 | PERFORMANCE_GOAL block record-fetch size | 5 rows | Throughput | forms/xml-exports/HRMS_PERFORMANCE.xml | HIGH |
| NFR-11 | REVIEW_CYCLE block record-fetch size | 5 rows | Throughput | forms/xml-exports/HRMS_PERFORMANCE.xml | HIGH |
| NFR-12 | LEAVE_REQUEST block record-fetch size | 8 rows | Throughput | forms/xml-exports/HRMS_LEAVE.xml | HIGH |
| NFR-13 | LEAVE_BALANCE block record-fetch size | 6 rows | Throughput | forms/xml-exports/HRMS_LEAVE.xml | HIGH |
| NFR-14 | Hire-date maximum future-dating (Forms tier) | 90 days (`SYSDATE + 90`) | Data Quality / Reliability | forms/xml-exports/HRMS_EMPLOYEE.xml `WHEN-VALIDATE-ITEM` | HIGH |
| NFR-15 | Hire-date maximum future-dating (DB tier) | 180 days (`SYSDATE + 180`) | Data Quality / Reliability | plsql/triggers/trg_employees.sql `TRG_EMP_BEFORE_INSERT` | HIGH — **DISCREPANCY vs. NFR-14** (conflicting thresholds; see TD-10) |

### Stage 5 - Technical Debt & Risk Register (this chunk)

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-10 | Hire-date future-dating validation conflict: Forms enforces 90 days, DB trigger enforces 180 days | Anti-pattern / Data Validation | HRMS_EMPLOYEE.xml, TRG_EMP_BEFORE_INSERT | High | NFR-14 vs. NFR-15 — both read directly, not inferred | Pick one authoritative threshold (recommend the stricter 90-day rule, enforced identically at both tiers) and remove the conflicting DB value, since a hire date 91–180 days out currently fails silently different rules depending on entry path (Forms UI blocks it; a batch/direct-SQL insert would not) |
| TD-11 | Client/server email-format validation drift — two independently maintained functions with no shared rule source | Anti-pattern / Dependency Coupling | HRMS_VALIDATION_LIB.validate_email, PKG_VALIDATION.validate_email_format | Medium-High | AP-09 | Consolidate to a single server-side authority (`PKG_VALIDATION`) called by both tiers, or synchronize the two rule sets under a documented shared spec with a regression test |
| TD-12 | Validation logic duplicated across HRMS_VALIDATION_LIB, PKG_VALIDATION, and (by architectural implication) domain packages such as PKG_EMPLOYEE — explicitly called out in the library's own header comment as a known drift source | Dependency Coupling | HRMS_VALIDATION_LIB, PKG_VALIDATION | Medium | forms/libraries/HRMS_VALIDATION_LIB.pll.sql header comment | Establish one validation authority per business rule; treat any second implementation as dead code to be removed |
| TD-13 | `validate_salary_range` header comment claims "cached local data ... populated at form startup and never refreshed" but the function body issues a live `SELECT MIN_SALARY, MAX_SALARY ... FROM JOB_GRADES` on every call | Configuration Risk (documentation drift) | HRMS_VALIDATION_LIB.validate_salary_range | Low-Medium | Direct read of function body vs. header comment | Correct the header comment to match actual (correct) live-query behavior — the code is not the bug here, the documentation is, but leaving it as-is risks a future maintainer "fixing" working code to match a wrong comment |
| TD-14 | HRMS_EMPLOYEE `KEY-EXIT` trigger's `SHOW_ALERT('ALT_CONFIRM_EXIT')` call appears in both the `IF` and its `ELSIF` condition expression, risking the alert being evaluated/shown twice for a single exit attempt | Anti-pattern (UI bug) | HRMS_EMPLOYEE.xml KEY-EXIT | Low-Medium | Direct read of trigger body | Cache the `SHOW_ALERT` return value in a local variable once, then branch on the variable, rather than re-invoking `SHOW_ALERT` in each condition |
| TD-15 | Three forms (HRMS_PAYROLL, HRMS_PERFORMANCE, HRMS_LEAVE) each declare more tab pages / data blocks in their own header comments than are actually implemented: Payroll's "Pay Details" tab (missing PAYROLL_DETAIL/PAYSLIP_SUMMARY blocks), Performance's missing REVIEW_DETAIL block, Leave's "Pending Approvals"/"Team Calendar" tabs (no backing blocks, though `VW_PENDING_APPROVALS` exists in the Data layer and appears intended to back the missing Leave tab) | Operational Risk (incomplete feature) | HRMS_PAYROLL.xml, HRMS_PERFORMANCE.xml, HRMS_LEAVE.xml | Medium | Direct comparison of each file's header comment against its actual block/canvas definitions | Either complete the stubbed tabs (wiring `VW_PENDING_APPROVALS` into Leave's "Pending Approvals" tab is the clearest quick win) or remove the dead tab-page declarations and update the header comments to match reality |
| TD-16 | `ALT_CONFIRM_DELETE` alert is defined in HRMS_EMPLOYEE.xml but no trigger in the file invokes it — `DELETE_RECORD` is bound via menu/toolbar with no visible confirmation step | Configuration Risk (possible dead code) | HRMS_EMPLOYEE.xml | Low | Direct read — alert declared, no `SHOW_ALERT('ALT_CONFIRM_DELETE')` call found in this file | LOW confidence only insofar as confirmation logic could live in an unscanned trigger; confirm and either wire it in before DELETE_RECORD or remove the unused alert |
| TD-17 | HRMS_PERFORMANCE.xml `GOAL_CATEGORY` poplist offers only 3 of the 5 values allowed by `CHK_GOAL_CATEGORY` (Business, Development, Leadership — missing Innovation, Compliance) | Configuration Risk (UI/DB mismatch) | HRMS_PERFORMANCE.xml, PERFORMANCE_GOALS table | Medium | Cross-reference poplist definition vs. schema/tables/04_performance_tables.sql CHK_GOAL_CATEGORY | Add the 2 missing poplist entries so existing INNOVATION/COMPLIANCE-categorized goals can be edited and new ones created through the UI |
| TD-18 | `RATING_LABEL` is declared as Forms `ItemType="Display Item"` while also `DatabaseItem="Yes"` — inconsistent Forms metadata for a genuinely stored VARCHAR2(50) column | Configuration Risk | HRMS_PERFORMANCE.xml, PERFORMANCE_REVIEWS table | Low | Cross-reference Forms item declaration vs. DDL column | Reconcile the item type declaration in Forms Builder to reflect that this is a real, editable/queryable database column |
| TD-19 | `TRG_EMP_INSTEAD_OF_DELETE` unconditionally raises ORA-20504 on any physical DELETE against EMPLOYEES, but HRMS_EMPLOYEE.xml's EMPLOYEE block still declares `DeleteAllowed=Yes` and the standard menu/toolbar bind `DELETE_RECORD` directly — a user following the normal UI delete path gets a raw unhandled Oracle error instead of a graceful soft-delete flow | Anti-pattern / UX + Data Integrity | HRMS_EMPLOYEE.xml, trg_employees.sql | Medium-High | Direct cross-file read: DDL trigger + Forms block property + menu/toolbar bindings | Set `DeleteAllowed=No` on the EMPLOYEE block and replace the DELETE_RECORD toolbar/menu binding with the documented workaround (set `ACTIVE_FLAG='N'` then `CLEAR_RECORD`) so the UI never attempts an operation the DB will always reject |

---

### Layer Summary - Application Layer
- Technologies confirmed this chunk: HRMS_COMMON_LIB (Active), HRMS_VALIDATION_LIB (Active - duplicative), HRMS_MENU (Active), Oracle Forms 12c (Active across all 6 forms)
- Patterns found this chunk: AP-07 through AP-17
- NFR entries added this chunk: NFR-05 through NFR-15 (11 entries)
- Technical debt entries added this chunk: TD-10 through TD-19 (10 entries)
- Agent 1 LOW CONFIDENCE items resolved: #2 (RESOLVED — exact 90 vs. 180-day values captured as NFR-14/NFR-15/TD-10), #17 (RESOLVED — confirmed exact trigger names and blocked-delete behavior, AP-17/TD-19), #18 (RESOLVED — exact two function names captured, AP-09/TD-11), #19 (RESOLVED — confirmed code queries live, comment is what's wrong, TD-13), #20 (RESOLVED — exact missing blocks/tabs enumerated per form, TD-15), #21 (RESOLVED — exact 3-of-5 poplist gap confirmed, TD-17), #30 (RESOLVED — confirmed the double-condition SHOW_ALERT pattern, TD-14), #31 (RESOLVED — confirmed ALT_CONFIRM_DELETE has no invoking trigger in this file, TD-16)
- New LOW CONFIDENCE items raised: HRMS_COMMON_LIB.handle_error usage could not be confirmed anywhere in the 6 scanned forms (AP-07) — flagged for investigation, not confirmed as dead code, since the 5 unscanned forms may call it
- DISCREPANCIES with Agent 1 found: None — this chunk's findings are refinements of Agent 1's Validation Queue items, not contradictions
- Cross-layer dependencies to carry to Synthesis: TD-19 (delete-block conflict) spans Application ↔ Data; AP-15/AP-16 (workflow state machines) depend on unscanned `PKG_PAYROLL`/`PKG_LEAVE` for their later transitions

---

## Agent 2 - Chunk 3 of 6 - Data Layer

**Agent 1 Input This Chunk:**
- Technologies being analysed: Oracle Database 19c, 29 tables, 6 views, 24 sequences
- Data stores being traced: HRMS schema (single data store per Agent 1 OUTPUT 3)
- LOW CONFIDENCE items to resolve: Validation Queue #3, #4, #5, #6, #7, #8, #9, #10, #11, #12, #13, #14, #15, #16, #29

**Carried Forward from Prior Chunks:**
- Validated technologies: PKG_SECURITY, USER_SESSIONS, SYSTEM_PARAMETERS, HRMS_COMMON_LIB, HRMS_VALIDATION_LIB, HRMS_MENU, Oracle Forms 12c (all Active)
- NFR entries catalogued so far: NFR-01 through NFR-15 (15 total)
- Technical debt entries catalogued so far: TD-01 through TD-19 (19 total)
- Unresolved Validation Queue items: #1, #25, #26, #27, #28 (5 items)

---

### Stage 2 - Technology Usage Analysis

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| Oracle Database 19c | 19c | Active - core path | Sole data store for the entire system; 29 tables / 6 views / 24 sequences scanned across 4 domains (Core, Payroll, Leave, Performance + cross-cutting) | 19c is on Oracle's Extended Support track as of the current date — Supported (Extended Support), not independently re-verified against Oracle's live support calendar in this session | Confirmed |
| Generated/virtual columns (`LEAVE_BALANCES.AVAILABLE`) | Oracle DB 19c native feature | Active - core path, but with a **known divergence** | Computes available leave balance server-side; a reporting view recomputes the same concept by hand with a different formula | Supported (native feature) | New — not itemized individually in Agent 1's tables, consistent with its inventory |

### Stage 3 - Architecture Pattern Catalog (this chunk)

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-18 | Trigger-based audit logging | Observability / Audit | TRG_SALARY_AUDIT, TRG_LEAVE_REQUEST_AUDIT, TRG_DEPARTMENT_AUDIT → `PKG_AUDIT.log_action` | Salary/Leave triggers pass a 6-argument call (table, record_id, action, user, old_json, new_json); Department trigger passes only 4 arguments (table, record_id, action, user) — implies an overloaded or default-parameter package signature | **Partial** — audit granularity varies by table; department changes capture no before/after values at all | HIGH (call-site shape) / LOW (why the signature differs — package body unscanned) | plsql/triggers/trg_audit.sql |
| AP-19 | Soft-delete via ACTIVE_FLAG with DB-level hard-delete block | Data Access | TRG_EMP_INSTEAD_OF_DELETE | Unconditionally raises ORA-20504 on any physical DELETE against EMPLOYEES; intended workaround is `ACTIVE_FLAG='N'` + `CLEAR_RECORD`, not wired into the Forms UI (TD-19) | Declared-but-inconsistently-wired — see TD-19 | HIGH | plsql/triggers/trg_employees.sql |
| AP-20 | Computed/generated column for leave balance | Data Access | LEAVE_BALANCES.AVAILABLE | `GENERATED ALWAYS AS (OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT - PENDING) VIRTUAL` | **Coverage gap**: `VW_LEAVE_SUMMARY` hand-recomputes `AVAILABLE` as `OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT` (omitting PENDING) instead of reading the virtual column — the two figures diverge whenever PENDING ≠ 0 | HIGH | schema/tables/03_leave_tables.sql; schema/views/hrms_views.sql |
| AP-21 | Self-referencing hierarchy pattern | Data Access / Scalability | DEPARTMENTS.PARENT_DEPT_ID (no FK enforced), EMPLOYEES.MANAGER_EMP_ID (FK enforced, self-ref), VW_ORG_HIERARCHY (`CONNECT BY`) | `START WITH MANAGER_EMP_ID IS NULL CONNECT BY PRIOR EMP_ID = MANAGER_EMP_ID`; view carries its own documented comment: "Performance degrades significantly with >500 employees" | Inconsistent FK enforcement between the two conceptually identical hierarchy patterns (DEPARTMENTS vs. EMPLOYEES); documented scalability ceiling on the reporting side | HIGH | schema/tables/01_core_tables.sql; schema/views/hrms_views.sql |
| AP-22 | Denormalized reporting/view layer | Data Access / Reporting | VW_ACTIVE_EMPLOYEES, VW_ORG_HIERARCHY, VW_EMPLOYEE_COMPENSATION, VW_LEAVE_SUMMARY, VW_PAYROLL_LATEST, VW_PENDING_APPROVALS | 6 views scanned (of 15 documented); VW_PENDING_APPROVALS is a `UNION ALL` cross-module approval queue (Leave + Performance) | Partial — 9 of 15 documented views not in scanned set (Agent 1 Validation Queue #13/14 area) | HIGH for the 6 scanned | schema/views/hrms_views.sql |
| AP-23 | NOCACHE surrogate-key sequence generation | Scalability / Resource Management | 24 sequences total | 23 sequences NOCACHE; `SEQ_AUDIT` is the sole exception at `CACHE 100` (presumably for high-volume audit-insert throughput); `SEQ_EMP_NUMBER` (START 1000) is a declared-but-likely-bypassed pattern — comment states `PKG_EMPLOYEE.generate_emp_number` uses `MAX()+1` logic instead of `NEXTVAL` | Declared-but-unused/bypassed for `SEQ_EMP_NUMBER` specifically — see TD-25 | HIGH (sequence DDL + comment) / LOW (actual runtime behavior of generate_emp_number — package unscanned) | schema/sequences/hrms_sequences.sql |

### Stage 4 - NFR Registry (this chunk)

| ID | NFR Name | Value | Category | Source | Confidence |
|---|---|---|---|---|---|
| NFR-16 | SEQ_AUDIT sequence cache size | 100 | Throughput / Resource Management | schema/sequences/hrms_sequences.sql | HIGH |
| NFR-17 | All other 23 HRMS sequences cache size | NOCACHE (0) | Resource Management | schema/sequences/hrms_sequences.sql | HIGH |
| NFR-18 | VW_ORG_HIERARCHY documented performance-degradation threshold | >500 active employees (CONNECT BY hierarchical query) | Scalability / Latency | schema/views/hrms_views.sql (view comment) | HIGH — directly documented in the view's own comment |
| NFR-19 | NOTIFICATION_QUEUE default retry count | 0 (`RETRY_COUNT NUMBER(3) DEFAULT 0`), no maximum-retry ceiling column present | Reliability | schema/tables/04_performance_tables.sql | LOW - reason: a retry ceiling, if any, is presumably enforced inside the unscanned dispatch mechanism (`PKG_NOTIFICATION`, never named directly in any scanned file), not visible in the schema itself |
| NFR-20 | NOTIFICATION_QUEUE default priority | 5 (`PRIORITY NUMBER(2) DEFAULT 5`) | Rate | schema/tables/04_performance_tables.sql | LOW - reason: priority scale (min/max, meaning of 1 vs. 9) is not documented anywhere in scanned files |
| NFR-21 | EMPLOYEE_BANK_ACCOUNTS split-deposit default priority | 1 (`PRIORITY_ORDER NUMBER(2) DEFAULT 1`) | Resource Management | schema/tables/02_payroll_tables.sql | HIGH |
| NFR-22 | EMERGENCY_CONTACTS default priority | 1 (`PRIORITY_ORDER NUMBER(2) DEFAULT 1`) | Resource Management | schema/tables/01_core_tables.sql | HIGH |

### Stage 5 - Technical Debt & Risk Register (this chunk)

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-20 | `TRG_EMP_BEFORE_UPDATE` inserts into `EMPLOYEE_HISTORY` using column names (`HISTORY_ID`, `CHANGE_DATE`, `OLD_VALUE`, `NEW_VALUE`, `CHANGED_BY`, `CHANGE_REASON`) that do not exist on the table at all (actual DDL: `HIST_ID`, `EFFECTIVE_DATE`, typed `OLD_DEPT_ID`/`NEW_DEPT_ID`/etc., `CREATED_BY`, `REASON_CODE`, `COMMENTS`) — **and** uses `CHANGE_TYPE` values `'DEPARTMENT_CHANGE'`/`'JOB_CHANGE'`, neither of which is permitted by `CHK_CHANGE_TYPE` (closest allowed value is `'TRANSFER'`). These are two independently fatal defects — fixing only the column names would still leave the CHECK-constraint violation | Architecture Anti-pattern / Configuration Risk | TRG_EMP_BEFORE_UPDATE, EMPLOYEE_HISTORY | **Critical** | Direct cross-file DDL-vs-trigger comparison, schema/tables/01_core_tables.sql vs. plsql/triggers/trg_employees.sql | Rewrite the INSERT to use the actual column set and to substitute `CHANGE_TYPE='TRANSFER'` (or add DEPARTMENT_CHANGE/JOB_CHANGE to `CHK_CHANGE_TYPE`) before this trigger is allowed to fire in any environment that enforces the constraint; add a regression test covering status/department/job changes on EMPLOYEES |
| TD-21 | Seed script inserts into `LOCATIONS.PHONE`; the actual DDL column is `PHONE_NUMBER` | Configuration Risk | data/seed/01_reference_data.sql, LOCATIONS | Critical | schema/tables/01_core_tables.sql vs. seed script (per Agent 1 cross-reference, confirmed) | Fix the seed script column name before any environment rebuild — as written, this INSERT fails |
| TD-22 | Seed script for `JOB_GRADES` omits the required `NOT NULL GRADE_CODE` column and references a nonexistent `GRADE_LEVEL` column | Configuration Risk | data/seed/01_reference_data.sql, JOB_GRADES | Critical | schema/tables/01_core_tables.sql vs. seed script | Add `GRADE_CODE` values and remove the `GRADE_LEVEL` reference from the seed script |
| TD-23 | Seed script for `SYSTEM_PARAMETERS` inserts into `DESCRIPTION` (actual column: `PARAM_DESCRIPTION`) and omits `DATA_TYPE` | Configuration Risk | data/seed/01_reference_data.sql, SYSTEM_PARAMETERS | High | schema/tables/04_performance_tables.sql vs. seed script | Fix the column name; `DATA_TYPE` omission alone is safe (has a DEFAULT), but the column-name error is fatal as written |
| TD-24 | `EMPLOYEES.EMAIL` has no unique constraint at the DB level; uniqueness is enforced only by `TRG_EMP_BEFORE_INSERT`'s `SELECT COUNT(*) ... WHERE ACTIVE_FLAG='Y'` check — this is a classic check-then-insert race (two concurrent inserts can both pass the count check before either commits, producing duplicate active emails), and it only scopes to ACTIVE_FLAG='Y', so a terminated employee's email can be freely reused | Data Integrity / Concurrency | EMPLOYEES, TRG_EMP_BEFORE_INSERT | **Critical** | schema/tables/01_core_tables.sql (no UNIQUE on EMAIL, only `UK_EMP_NUMBER`) vs. trigger logic; connects to TD-07 (login ROWNUM=1 masking) | Add a unique index/constraint on `UPPER(EMAIL)` scoped appropriately (or a function-based unique index filtered to ACTIVE_FLAG='Y' if reuse-after-termination is an intentional business rule) rather than relying solely on a trigger-level count check |
| TD-25 | `SEQ_EMP_NUMBER` is likely orphaned: the sequence exists (START 1000, NOCACHE) but `PKG_EMPLOYEE.generate_emp_number` is documented (via comment in the sequence DDL file) to use `MAX()+1` logic instead of `NEXTVAL` — a genuine concurrency race where two simultaneous inserts could compute the same `MAX()+1` value before either commits, producing duplicate `EMP_NUMBER` values | Scalability Constraint / Anti-pattern | SEQ_EMP_NUMBER, PKG_EMPLOYEE.generate_emp_number | High | schema/sequences/hrms_sequences.sql comment — HIGH confidence that this documented risk exists; LOW confidence on `generate_emp_number`'s actual runtime behavior since `PKG_EMPLOYEE`'s body is unscanned | Confirm `generate_emp_number`'s actual implementation; if it truly uses MAX()+1, replace it with `SEQ_EMP_NUMBER.NEXTVAL` immediately — this is a live data-integrity risk under concurrent employee creation |
| TD-26 | `EMPLOYEES.EMP_ID` has no DEFAULT or sequence tied at the DB level (NOT NULL, no default) — it is populated only by the Forms `PRE-INSERT` trigger (`SEQ_EMPLOYEE.NEXTVAL`); any direct SQL or batch insert bypassing Forms must supply EMP_ID explicitly or the insert fails | Dependency Coupling / Configuration Risk | EMPLOYEES, SEQ_EMPLOYEE | Medium | schema/tables/01_core_tables.sql (no DEFAULT on EMP_ID) vs. HRMS_EMPLOYEE.xml PRE-INSERT trigger vs. schema/sequences/hrms_sequences.sql | Consider moving `SEQ_EMPLOYEE.NEXTVAL` into a DB-level trigger (mirroring `TRG_EMP_BEFORE_INSERT`'s pattern for other defaults) so non-Forms insert paths are not silently broken |
| TD-27 | `AUDIT_LOG.CHK_AUDIT_ACTION` permits only `INSERT`/`UPDATE`/`DELETE`, but `TRG_LEAVE_REQUEST_AUDIT` passes `'STATUS_CHANGE'` as the action argument to `PKG_AUDIT.log_action` — if that parameter is written directly into `ACTION_TYPE`, every leave-status-change audit call would violate the CHECK constraint | Anti-pattern / Configuration Risk | AUDIT_LOG, TRG_LEAVE_REQUEST_AUDIT | High (if confirmed) | schema/tables/04_performance_tables.sql `CHK_AUDIT_ACTION` vs. plsql/triggers/trg_audit.sql call — column-name/shape alignment is suggestive but not proven | LOW - reason: `PKG_AUDIT.log_action`'s body is unscanned, so the mapping of its 3rd parameter to `ACTION_TYPE` is inferred from naming/shape similarity, not confirmed. **Priority item to verify** — if true, every status-change audit call is currently failing or being silently caught somewhere upstream |
| TD-28 | `TRG_DEPARTMENT_AUDIT` calls `PKG_AUDIT.log_action` with only 4 arguments (table, record_id, action, user) vs. the 6-argument call used by the Salary/Leave triggers — department changes capture no before/after values at all, reducing audit usefulness for org-structure changes | Operational Risk | TRG_DEPARTMENT_AUDIT, AUDIT_LOG | Medium | Direct call-site comparison across all 3 triggers in trg_audit.sql — HIGH confidence on the shape difference itself; LOW confidence on *why* (package overload/defaults unconfirmed) | Add old/new JSON payloads to the department-audit call to match the granularity of the other two audited tables |
| TD-29 | `VW_LEAVE_SUMMARY.AVAILABLE` formula (`OPENING_BALANCE+ACCRUED-USED+ADJUSTMENT`) omits `PENDING`, diverging from `LEAVE_BALANCES.AVAILABLE`'s own virtual-column formula (which subtracts PENDING) — the two "available balance" figures can disagree whenever PENDING ≠ 0 | Anti-pattern / Data Consistency | VW_LEAVE_SUMMARY, LEAVE_BALANCES | Medium-High | AP-20 — direct formula comparison | Change the view to select `lb.AVAILABLE` directly instead of recomputing the formula by hand |
| TD-30 | `VW_EMPLOYEE_COMPENSATION` joins `SALARY_RECORDS` only on `ACTIVE_FLAG='Y'`, without the `EFFECTIVE_DATE<=SYSDATE AND (END_DATE IS NULL OR END_DATE>SYSDATE)` scoping that `VW_ACTIVE_EMPLOYEES` applies to the identical join — risks duplicate employee rows or inclusion of a not-yet-effective salary if more than one salary row is flagged ACTIVE_FLAG='Y' for an employee | Anti-pattern / Data Accuracy | VW_EMPLOYEE_COMPENSATION, SALARY_RECORDS | Medium | Direct comparison of the two views' join predicates in schema/views/hrms_views.sql | Apply the same date-scoping predicate used in VW_ACTIVE_EMPLOYEES |
| TD-31 | `VW_PAYROLL_LATEST` defines "latest" as the single global `MAX(RUN_ID)` among APPROVED runs — this assumes one global latest payroll run rather than one per pay frequency/employee subset; parallel or off-cycle/supplemental runs would be entirely excluded from this view | Architecture Anti-pattern / Scalability Constraint | VW_PAYROLL_LATEST, PAYROLL_RUNS | Medium-High | Direct read of the view's correlated-subquery filter | Redefine "latest" per pay-period/frequency (e.g., `MAX(RUN_ID)` partitioned by `PERIOD_ID` or `RUN_TYPE`) rather than a single global maximum |
| TD-32 | `DEPARTMENTS.PARENT_DEPT_ID`, `MANAGER_EMP_ID`, and `LOCATION_CODE` have no FK constraints despite column comments describing FK-like semantics ("self-referencing FK for department hierarchy") — inconsistent with `EMPLOYEES`, which declares all its analogous FKs | Configuration Risk / Data Integrity | DEPARTMENTS | Medium | schema/tables/01_core_tables.sql — comment vs. actual constraint list | Add the missing FK constraints (self-ref on PARENT_DEPT_ID, FK to EMPLOYEES on MANAGER_EMP_ID, FK to LOCATIONS on LOCATION_CODE) to match the enforcement level already present on EMPLOYEES |
| TD-33 | Same missing-FK pattern recurs on `HOLIDAYS.LOCATION_CODE`, `NOTIFICATION_QUEUE.RECIPIENT_EMP_ID`, `LEAVE_ACCRUAL_LOG.RUN_ID`, and `LOOKUP_VALUES.PARENT_LOOKUP_ID` — a schema-wide convention gap, not an isolated case | Configuration Risk | HOLIDAYS, NOTIFICATION_QUEUE, LEAVE_ACCRUAL_LOG, LOOKUP_VALUES | Low-Medium | schema/tables/03_leave_tables.sql, 04_performance_tables.sql | Perform a schema-wide FK audit rather than fixing these one at a time — the pattern suggests a systemic gap in DDL review practice |
| TD-34 | `VW_ORG_HIERARCHY`'s `CONNECT BY` hierarchical query has a self-documented performance ceiling of ~500 employees, with no materialization or indexing strategy evident anywhere in scanned files | Scalability Constraint | VW_ORG_HIERARCHY | Medium-High | NFR-18 — directly documented in the view's own comment | Evaluate a materialized hierarchy/closure table (refreshed on manager-change events, which are already audited via TRG_EMP_BEFORE_UPDATE's DEPARTMENT_CHANGE/JOB_CHANGE logic once TD-20 is fixed) if employee count approaches or exceeds 500 |
| TD-35 | Seed script `02_employee_data.sql` issues two consecutive `UPDATE DEPARTMENTS ... WHERE DEPT_ID=30` statements — first sets `MANAGER_EMP_ID=3`, second immediately overwrites it with `MANAGER_EMP_ID=30` — the first UPDATE is dead/no-op | Configuration Risk | data/seed/02_employee_data.sql | Low | Confirmed per Agent 1 Validation Queue #29 | Remove the dead first UPDATE statement; confirm which manager ID (3 or 30) is actually intended for DEPT_ID=30 before deleting |

---

### Layer Summary - Data Layer
- Technologies confirmed this chunk: Oracle Database 19c (Active - core path), generated/virtual columns (Active - with known divergence)
- Patterns found this chunk: AP-18 through AP-23
- NFR entries added this chunk: NFR-16 through NFR-22 (7 entries)
- Technical debt entries added this chunk: TD-20 through TD-35 (16 entries)
- Agent 1 LOW CONFIDENCE items resolved: #3/#4 (RESOLVED — exact column-name and CHECK-constraint evidence, TD-20), #5 (Escalated to Priority-Verify, not fully resolvable without PKG_AUDIT body — TD-27), #6 (RESOLVED, TD-21), #7 (RESOLVED, TD-22), #8 (RESOLVED, TD-23), #9 (RESOLVED, TD-32), #10 (RESOLVED, TD-33), #11 (RESOLVED, TD-24), #12 (RESOLVED, TD-29), #13 (RESOLVED, TD-30), #14 (RESOLVED, TD-31), #15 (Partially resolved — sequence-file comment confirmed HIGH, generate_emp_number's actual behavior remains LOW, TD-25), #16 (RESOLVED, TD-26), #29 (RESOLVED, TD-35)
- New LOW CONFIDENCE items raised: None beyond what's already carried in TD-25/TD-27
- DISCREPANCIES with Agent 1 found: None
- Cross-layer dependencies to carry to Synthesis: TD-20/AP-17/AP-19 (Employee lifecycle) spans Application↔Data; TD-24 connects directly to TD-07 (Security chunk, login lookup masking duplicate active emails); TD-27 depends on unscanned `PKG_AUDIT` and should be the #1 item on any future Agent 1/2 re-run once package bodies become available

---

## Agent 2 - Chunk 4 of 6 - CI/CD & Deployment Layer

Per the CI/CD Deep-Read Sub-Procedure: scanned for `.github/workflows/`, `.circleci/`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `.gitlab-ci.yml`, and any other pipeline file across the provided file set. **None found** — this is a re-confirmation of Agent 1's OUTPUT 4 finding, not a new discovery; no additional pipeline files surfaced beyond what Agent 1 already flagged NOT FOUND.

Per the Flag-and-Continue escalation rule for this exact condition: **CI/CD LAYER: No pipeline files found in any expected location. Stage 8 CI/CD Maturity is assessed as all 14 capabilities Absent, with Critical/High severity gaps, per the mandatory evidence-based methodology — no capability is inferred from the absence of contrary evidence, each is explicitly marked Absent for lack of any matching tool/action invocation.**

### Layer Summary - CI/CD & Deployment Layer
- Technologies confirmed this chunk: None (confirmed absent)
- Patterns found this chunk: None
- NFR entries added this chunk: None
- Technical debt entries added this chunk: TD-36
- Agent 1 LOW CONFIDENCE items resolved: None new (Agent 1 already marked this layer NOT FOUND with HIGH confidence on the absence itself)
- New LOW CONFIDENCE items raised: None
- Pipeline files directly read: 0
- Additional tools found vs. Agent 1: None
- DISCREPANCIES with Agent 1 found: None

**TD-36 | No CI/CD pipeline of any kind exists (no build, test, security-scan, or deploy automation)** | CI/CD Risk | Entire application | **Critical** | Confirmed absence across the full provided file set, consistent with the README's self-reported "no unit tests — manual testing only via Forms" | Even a minimal pipeline (compile `.fmb`/`.pll` artifacts, run available SQL/PLSQL static checks, tag releases) would materially reduce the risk of exactly the kind of schema/trigger/seed defects catalogued in this document reaching production undetected

---

## Agent 2 - Chunk 5 of 6 - Infrastructure Layer

No Dockerfile, docker-compose, Kubernetes manifest, Terraform/Bicep/CloudFormation, or any other IaC artifact was found anywhere in the provided file set — re-confirming Agent 1's OUTPUT 4 finding. The README's architecture diagram names "Oracle Forms 12c App Server" and "Oracle WebLogic Server 12c" as compute components, but no deployment configuration exists to verify resource sizing, replica count, environment topology, or provider. This is treated as a confirmed absence, not an unscanned gap, per Agent 1's explicit re-confirmation language.

### Layer Summary - Infrastructure Layer
- Technologies confirmed this chunk: None (confirmed absent — narrative-only references to Oracle Forms App Server / WebLogic Server carried at LOW confidence, unchanged from Agent 1)
- Patterns found this chunk: None
- NFR entries added this chunk: None
- Technical debt entries added this chunk: TD-37
- DISCREPANCIES with Agent 1 found: None

**TD-37 | No Infrastructure-as-Code found; deployment topology (compute sizing, network, TLS termination) is entirely undocumented in the scanned repository** | Operational Risk | Oracle Forms App Server, WebLogic Server, Oracle DB 19c host | **High** | Confirmed absence, README narrative only | Document actual deployment topology outside this repository if it exists elsewhere, or begin capturing it as IaC/config-as-code to enable repeatable environment builds and DR planning

---

## Agent 2 - Chunk 6 of 6 - Observability Layer

No monitoring, structured-logging-framework, tracing, or metrics-export configuration was found in the scanned set. The only logging-adjacent evidence in the entire system is `HRMS_COMMON_LIB.handle_error` → `PKG_COMMON.log_error` (body unscanned, usage itself unconfirmed per AP-07) and the 3 audit triggers → `PKG_AUDIT.log_action` (body unscanned). Neither constitutes a structured logging/observability platform — both are ad hoc, custom, table-backed logging calls with unverified internals.

### Layer Summary - Observability Layer
- Technologies confirmed this chunk: None confirmed as an observability platform; `PKG_COMMON.log_error`/`PKG_AUDIT.log_action` exist as ad hoc logging call points only (Partial/Declared-only)
- Patterns found this chunk: None (no distributed tracing, no metrics export, no alerting config found)
- NFR entries added this chunk: None
- Technical debt entries added this chunk: TD-38
- DISCREPANCIES with Agent 1 found: None

**TD-38 | No structured/centralized logging framework exists beyond ad hoc PKG_COMMON.log_error / PKG_AUDIT.log_action calls (both unscanned); no correlation-ID propagation was found beyond the security-purpose `:GLOBAL.session_id`/`:GLOBAL.current_user` globals, which are not confirmed to be written into any log record other than the username argument passed to `log_error`** | Operational Risk | Entire application | Medium-High | Confirmed absence of any monitoring/tracing/metrics configuration in the scanned set; direct read of handle_error's log_error call signature | Introduce a consistent correlation identifier (e.g., the existing SESSION_ID) into every `log_error`/`log_action` call so that a single user session's activity can be reconstructed across forms during incident investigation |

---

# Synthesis Pass

## Stage 6 - Architecture Pattern Catalog (Final)

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-01 | Custom session-based authentication | Security | HRMS_LOGIN → PKG_SECURITY.authenticate | Session ID as NUMBER, propagated client-side via `:GLOBAL.session_id` | Single entry point, consistent | HIGH | HRMS_LOGIN.xml |
| AP-02 | Session-validity gate on every module entry | Security | HRMS_COMMON_LIB.check_session; all 5 non-login forms | `PKG_SECURITY.is_session_valid` + `FORM_TRIGGER_FAILURE` on failure | Consistent across all 6 scanned files | HIGH | HRMS_COMMON_LIB.pll.sql, all forms |
| AP-03 | Role/permission-based authorization (custom RBAC) | Security | `PKG_SECURITY.has_permission(emp_id, module, action)` | module∈{PAYROLL,ADMIN,REPORTS,EMPLOYEE}, action∈{VIEW,EDIT,APPROVE} | **Partial** — see Coverage Gaps below | HIGH | HRMS_MENU.xml, HRMS_EMPLOYEE.xml, HRMS_PAYROLL.xml |
| AP-04 | Defense-in-depth asymmetry (menu vs. button path) | Security / Anti-pattern | HRMS_MENU.xml | Button path = disabled-state + runtime check; menu path = disabled-state only | Inconsistent | HIGH | HRMS_MENU.xml |
| AP-05 | Encrypted-at-rest PII columns | Security | SSN_ENCRYPTED×2, ACCOUNT_NUMBER_ENC | "AES-256, decrypted only in PKG_SECURITY" (comment only) | Declared via comment | ASSUMED | schema/tables/01,02_*.sql |
| AP-06 | Config-as-data (SYSTEM_PARAMETERS) | Configuration | Session/password/payroll/notification/integration config | 8 key rows itemized in Chunk 1 | Single config source, no external secrets manager | HIGH | data/seed/01_reference_data.sql |
| AP-07 | Centralized error-handling library procedure | Observability | HRMS_COMMON_LIB.handle_error | Nested exception swallow, double MESSAGE, FORM_TRIGGER_FAILURE | **Declared but usage unconfirmed** in any of the 6 scanned forms | LOW | HRMS_COMMON_LIB.pll.sql |
| AP-08 | Client-side field validation library | Data Validation | 5 validator functions | Exact rules per field, see Chunk 2 | Client tier only | HIGH | HRMS_VALIDATION_LIB.pll.sql |
| AP-09 | Client/server email-validation drift | Anti-pattern | validate_email vs. validate_email_format | Two independent implementations | Both actively used, simultaneously divergent | HIGH | HRMS_VALIDATION_LIB.pll.sql, HRMS_EMPLOYEE.xml |
| AP-10 | Hire-date threshold conflict | Anti-pattern | Forms=90d vs. DB=180d | See NFR-14/NFR-15 | Inconsistent | HIGH | HRMS_EMPLOYEE.xml, trg_employees.sql |
| AP-11 | Toolbar command wrapper procedures | UI Abstraction | 10 toolbar_* procedures | 1:1 Forms-built-in wrappers | Uniform | HIGH | HRMS_COMMON_LIB.pll.sql |
| AP-12 | LOV↔Record-Group naming coupling | Configuration Risk | refresh_lov | `'RG_'\|\|UPPER(REPLACE(name,'LOV_',''))` | Fragile convention | HIGH | HRMS_COMMON_LIB.pll.sql |
| AP-13 | Optimistic-concurrency conflict handling | Data Access | HRMS_EMPLOYEE ON-ERROR (ORA-40501) | Message + no auto-retry | Only confirmed in HRMS_EMPLOYEE | HIGH / Coverage gap elsewhere | HRMS_EMPLOYEE.xml |
| AP-14 | Master-detail cascading Forms relations | Data Access | 4 relations | AutoQuery=Yes; EMP_SALARY_REL Cascading delete | Consistent across 3 master-detail forms | HIGH | HRMS_EMPLOYEE/PAYROLL/PERFORMANCE.xml |
| AP-15 | Payroll run lifecycle state machine | Workflow | PENDING→CALCULATED→APPROVED→PAID/REVERSED/ERROR | Button gates + CHK_RUN_STATUS | Partial (later transitions in unscanned PKG_PAYROLL) | HIGH/LOW split | HRMS_PAYROLL.xml |
| AP-16 | Leave request lifecycle state machine | Workflow | PENDING/APPROVED/REJECTED/CANCELLED/TAKEN | Cancel gate on PENDING/APPROVED | Partial (approval path unscanned) | HIGH/LOW split | HRMS_LEAVE.xml |
| AP-17 | Employee lifecycle integrity guards | Anti-pattern | No reactivation, no hard delete | ORA-20503/-20504 | DB-absolute, Forms UI not adapted | HIGH | trg_employees.sql, HRMS_EMPLOYEE.xml |
| AP-18 | Trigger-based audit logging | Observability | 3 audit triggers → PKG_AUDIT.log_action | 4-arg vs. 6-arg calls | Partial — Department audit captures no deltas | HIGH/LOW split | trg_audit.sql |
| AP-19 | Soft-delete via ACTIVE_FLAG + DB hard-delete block | Data Access | TRG_EMP_INSTEAD_OF_DELETE | ORA-20504 unconditional | Inconsistently wired to Forms UI | HIGH | trg_employees.sql |
| AP-20 | Computed/generated leave-balance column | Data Access | LEAVE_BALANCES.AVAILABLE | Virtual column formula | Diverges from VW_LEAVE_SUMMARY's manual formula | HIGH | schema/tables/03_leave_tables.sql |
| AP-21 | Self-referencing hierarchy pattern | Scalability | DEPARTMENTS/EMPLOYEES self-refs, VW_ORG_HIERARCHY | CONNECT BY, >500-employee perf ceiling documented | Inconsistent FK enforcement | HIGH | schema/tables/01_core_tables.sql, hrms_views.sql |
| AP-22 | Denormalized reporting view layer | Reporting | 6 views | See Chunk 3 | Partial (9 of 15 documented views unscanned) | HIGH | schema/views/hrms_views.sql |
| AP-23 | NOCACHE surrogate-key sequences | Scalability | 24 sequences | 23 NOCACHE, SEQ_AUDIT CACHE 100, SEQ_EMP_NUMBER likely bypassed | Declared-but-bypassed for SEQ_EMP_NUMBER | HIGH/LOW split | schema/sequences/hrms_sequences.sql |

### Pattern Coverage Gaps

| Gap | Affected Integration / Component | Severity | Recommendation |
|---|---|---|---|
| Authorization depth varies by module — HRMS_PERFORMANCE has none, HRMS_PAYROLL's create/calculate buttons have none, HRMS_EMPLOYEE and HRMS_PAYROLL's approve path are the only fully-gated flows | HRMS_PERFORMANCE, HRMS_PAYROLL | Critical | Standardize on a single "module-load gate + action-level gate" pattern (AP-03's best-case form) and apply it to every module uniformly |
| No resilience patterns anywhere in the system — zero retry, circuit-breaker, timeout, or bulkhead patterns found on any of the package calls made from Forms (PKG_SECURITY, PKG_PAYROLL, PKG_LEAVE, PKG_EMPLOYEE, PKG_VALIDATION) | All Forms → PKG_* calls | High | Architecturally expected given the technology (Oracle Forms 2-tier synchronous calls have no resilience-library equivalent) — flagged as an inherent characteristic, not a fixable code gap, but worth noting for any future migration off Forms |
| No caching pattern anywhere — the one function whose header comment claims a cache (`validate_salary_range`) does not actually implement one | HRMS_VALIDATION_LIB | Low (informational — the "gap" is actually the absence of a documented bug, see TD-13) | N/A — comment should be corrected, not the code |
| Client/server validation duplication with drift (email format; broader validation logic per HRMS_VALIDATION_LIB's own header comment) | HRMS_VALIDATION_LIB, PKG_VALIDATION | Medium-High | Consolidate to one validation authority per rule |
| Business-rule threshold conflict at the most safety-relevant validation point found (hire-date) | HRMS_EMPLOYEE.xml, TRG_EMP_BEFORE_INSERT | High | Reconcile to a single threshold enforced identically at both tiers |

### Declared-But-Unused / Usage-Unconfirmed

Oracle Forms/PL-SQL has no package-manager manifest, so this section is adapted to the technology: items below are custom procedures/objects whose existence is confirmed but whose actual invocation could not be confirmed anywhere in the scanned file set.

| Item | Declared In | No Usage Found In | Risk |
|---|---|---|---|
| HRMS_COMMON_LIB.handle_error | forms/libraries/HRMS_COMMON_LIB.pll.sql | All 6 scanned form/trigger files (each implements its own inline error handling instead) | Either dead code, or invoked only from the 5 unscanned forms — cannot be resolved without those files |
| SEQ_EMP_NUMBER | schema/sequences/hrms_sequences.sql | PKG_EMPLOYEE.generate_emp_number (per documented comment, uses MAX()+1 instead) | Orphaned sequence masking a live concurrency defect (TD-25) |

---

## Stage 7 - Component Interaction & Contract Map

| Caller | Target | Protocol | Interaction Type | Coupling Strength | Contract | Timeout Declared? | Error Handling | Notes |
|---|---|---|---|---|---|---|---|---|
| HRMS_LOGIN | PKG_SECURITY.authenticate | PL/SQL procedure call | Sync Request-Response | Tight — direct package call, no interface | Positional PL/SQL signature only, undocumented/unversioned | No | Generic `WHEN OTHERS` → vague message (intentional for security) — also swallows unrelated EMP_ID lookup errors (TD-07) | Cleartext password over the Forms wire protocol (TD-01) |
| All 6 scanned forms | PKG_SECURITY.is_session_valid / has_permission / logout | PL/SQL procedure call | Sync Request-Response | Tight — ubiquitous shared dependency, no interface/abstraction layer | Positional signature only | No | `FORM_TRIGGER_FAILURE` on negative result | Single highest-inbound-dependency component in the system — see Coupling Hotspots |
| HRMS_EMPLOYEE | PKG_EMPLOYEE.generate_emp_number | PL/SQL function call | Sync Request-Response | Tight | Positional signature only | No | None visible (called directly in PRE-INSERT with no exception handling around it) | Body unscanned; documented MAX()+1 race risk (TD-25) |
| HRMS_EMPLOYEE | PKG_VALIDATION.validate_email_format | PL/SQL function call | Sync Request-Response | Tight | Positional signature only | No | `FORM_TRIGGER_FAILURE` on false | Drifts from client-side validate_email (TD-11) |
| HRMS_PAYROLL | PKG_PAYROLL.create_payroll_run / calculate_payroll / approve_payroll | PL/SQL procedure call | Sync Request-Response (blocking — UI shows "Please wait" + `SYNCHRONIZE`) | Tight | Positional signature only | No | Relies on form-level ON-ERROR only | No async/background job pattern for what the UI itself acknowledges may be long-running (Scalability Constraint) |
| HRMS_LEAVE | PKG_LEAVE.submit_leave_request / cancel_leave_request | PL/SQL procedure call | Sync Request-Response | Tight | Positional signature only | No | Form-level validation before call; no handler around the call itself shown | — |
| All 6 scanned forms | HRMS.* tables (direct block binding) | Forms native DML | Sync Request-Response | Tight — inherent 2-tier architecture, no service layer between UI and schema | Table DDL is the de facto contract | No | Forms ON-ERROR trigger per form (inconsistent depth — AP-13 gap) | Architecturally expected for Oracle Forms; flagged for modernization-risk awareness, not as a defect |
| TRG_SALARY_AUDIT / TRG_LEAVE_REQUEST_AUDIT / TRG_DEPARTMENT_AUDIT | PKG_AUDIT.log_action | PL/SQL procedure call | Sync Request-Response (fire-and-forget from the trigger's perspective) | Tight | Positional signature, inconsistent arity (4-arg vs. 6-arg) observed | No | None visible | Signature inconsistency (TD-28); possible CHECK-constraint violation risk (TD-27) |
| Oracle Reports / external reporting tools (unscanned) | VW_ACTIVE_EMPLOYEES, VW_ORG_HIERARCHY, VW_EMPLOYEE_COMPENSATION, VW_LEAVE_SUMMARY, VW_PAYROLL_LATEST, VW_PENDING_APPROVALS | SQL query against view | Sync Request-Response | Loose-ish (view provides an abstraction layer over base tables) but still same-schema/same-DB — not a true service boundary | View DDL is the contract; unversioned | No | N/A | VW_LEAVE_SUMMARY/VW_EMPLOYEE_COMPENSATION/VW_PAYROLL_LATEST all carry documented formula/scope defects (TD-29, TD-30, TD-31) |

### Coupling Hotspots

| Component | Inbound Dependencies | Outbound Dependencies | Coupling Risk |
|---|---|---|---|
| PKG_SECURITY | 7 (HRMS_COMMON_LIB, HRMS_LOGIN, HRMS_MENU, HRMS_EMPLOYEE, HRMS_LEAVE, HRMS_PAYROLL, HRMS_PERFORMANCE) | USER_SESSIONS (inferred) | **High** — single point of failure for authentication/authorization across the entire application, and its body is entirely unverified (unscanned) |
| EMPLOYEES table | Nearly every module (direct FK target from DEPARTMENTS-adjacent logic, SALARY_RECORDS, PERFORMANCE_REVIEWS, LEAVE_REQUESTS, EMPLOYEE_HISTORY, EMPLOYEE_DEPENDENTS, EMERGENCY_CONTACTS, EMPLOYEE_BANK_ACCOUNTS, EMPLOYEE_TAX_INFO, EMPLOYEE_PAY_ELEMENTS, USER_SESSIONS) | DEPARTMENTS, JOB_TITLES, LOCATIONS, self (MANAGER_EMP_ID) | **High** — master entity for the entire schema; the EMPLOYEE_HISTORY trigger defect (TD-20) means a core, frequently-fired write path on this table is currently broken or silently bypassing its own audit trail |
| HRMS_COMMON_LIB | Attached to all 6+ Forms modules (ATTACH_LIBRARY) | PKG_COMMON, PKG_SECURITY | Medium — widely shared, but individual procedures are simple wrappers; risk is concentrated in check_session/handle_error, not the toolbar wrappers |

### API Contract Inventory

| Boundary | Contract Type | Version | Location | Breaking Change Risk |
|---|---|---|---|---|
| Forms → PL/SQL package calls (all packages) | Undocumented (positional PL/SQL signature only) | UNVERSIONED | N/A — no spec files exist | High — any signature change to an unscanned package silently breaks every calling form with no compile-time contract check visible in this scan |
| Forms → HRMS schema tables | Undocumented (table DDL as implicit contract) | UNVERSIONED | schema/tables/*.sql | High — column renames/drops directly break Forms block bindings, as already demonstrated by the seed-script mismatches |
| External Reporting → HRMS views | Undocumented (view DDL as implicit contract) | UNVERSIONED | schema/views/hrms_views.sql | Medium — views provide one layer of insulation, but view definitions themselves already contain formula drift (TD-29/TD-30) |
| SMTP / GL Feed / Benefits Feed | NOT FOUND — no endpoint, protocol, or schema documented anywhere in scanned files | N/A | N/A | Unknown — cannot be assessed; these integrations are config-flags only |

---

## Stage 8 - Operational Architecture Assessment

### CI/CD Pipeline Maturity
> Evidence-based assessment per the mandatory methodology. No pipeline files of any kind (`.github/workflows/`, `.circleci/`, `bitbucket-pipelines.yml`, `azure-pipelines.yml`, `Jenkinsfile`, `.gitlab-ci.yml`) were found anywhere in the scanned repository — confirmed absent by both agents independently.

| Capability | Present? | Evidence (tool / action name + file + job) | Runs On | Gap Severity |
|---|---|---|---|---|
| Build | Absent | No matching tool found; no build script, manifest, or compile automation of any kind | N/A | Critical |
| Unit Tests | Absent | No matching tool found; README self-reports "no unit tests — manual testing only via Forms" | N/A | Critical |
| Integration Tests | Absent | No matching tool found | N/A | High |
| Code Coverage Gate | Absent | No matching tool found | N/A | Medium |
| SAST (Static Security) | Absent | No matching tool found | N/A | High |
| Dependency Scan | Absent | No matching tool found | N/A | High |
| Container / Image Scan | Absent | N/A — no containers exist in this stack | N/A | - (not applicable, but see TD-37 for the broader IaC gap) |
| Secret / Credential Scan | Absent | No matching tool found | N/A | High |
| Infrastructure Scan (IaC) | Absent | N/A — no IaC exists in this stack | N/A | - |
| Automated Deploy | Absent | No matching tool found; deployment presumed fully manual (compile/copy .fmb/.pll, run SQL scripts by hand) | N/A | Critical |
| Smoke / Health Check Post-Deploy | Absent | No matching tool found | N/A | High |
| Auto Rollback | Absent | No matching tool found | N/A | High |
| Manual Approval Gate | Absent | No matching tool found (no environment-protection config of any kind) | N/A | Low |
| Release / Versioning Automation | Absent | No matching tool found; version tracked only as a static config row (`SYSTEM.APP_VERSION`=4.2.0) | N/A | Low |

**CI/CD capabilities confirmed present: 0 of 14.**

### Observability Coverage

| Concern | Component | Present? | Tool / Library | Gap? |
|---|---|---|---|---|
| Structured Logging | All modules | Partial | `PKG_COMMON.log_error` / `PKG_AUDIT.log_action` (custom, table-backed, bodies unscanned — format unknown) | GAP — no confirmed structured format, no confirmed centralization |
| Distributed Tracing | All modules | Absent | None found | GAP (architecturally lower priority for a 2-tier monolith, but still a real observability blind spot) |
| Metrics Export | All modules | Absent | None found | GAP |
| Correlation ID Propagation | All modules | Partial | `:GLOBAL.session_id`/`:GLOBAL.current_user` exist and are passed as the "user" argument to `log_error`, but full session/request correlation into every log record is unconfirmed | GAP |
| Health / Readiness Endpoints | Oracle Forms App Server / WebLogic | UNKNOWN | WebLogic Admin Console monitoring presumably exists but is entirely outside the scanned file set | GAP (assessment incomplete — Infrastructure Layer not scanned) |
| Alerting Rules | Entire system | Absent | None found | GAP |

### Deployment Safety

| Practice | Present? | Evidence | Risk If Absent |
|---|---|---|---|
| Graceful Shutdown | UNKNOWN | Not applicable/not scanned — WebLogic-managed, no config found | Cannot assess — flag as an open item for any future infra-focused scan |
| Readiness Probe | No | N/A — not a container/k8s deployment (confirmed no containers) | N/A for this architecture |
| Liveness Probe | No | N/A — same as above | N/A for this architecture |
| Blue-Green / Canary | No | No deployment automation of any kind found (TD-36) | Every deployment is presumably a full-stop manual cutover with no rollback automation |
| Feature Flags | No | No flag provider referenced anywhere in scanned files | No decoupled release capability — every code change ships live |

### Disaster Recovery Posture

| Item | Declared? | Detail | Source |
|---|---|---|---|
| Database backup configuration | UNKNOWN | No RMAN script, backup policy file, or retention config found | NOT FOUND — Infrastructure Layer confirmed absent |
| Multi-region / multi-AZ config | UNKNOWN | No IaC to confirm | NOT FOUND |
| Database replication | UNKNOWN | No Oracle Data Guard (or equivalent) reference found anywhere in scanned files | NOT FOUND |
| RTO / RPO declarations | UNKNOWN | Not documented anywhere in scope | NOT FOUND |

---

# Agent 2 - Analysis Summary
- Layers analysed: 6 — Security & Integration, Application, Data, CI/CD & Deployment, Infrastructure, Observability
- Chunks processed: 6 (plus Chunk 0 Orientation)
- Technologies assessed: 13 (PKG_SECURITY, USER_SESSIONS, SYSTEM_PARAMETERS, 3 external integration flags, HRMS_COMMON_LIB, HRMS_VALIDATION_LIB, HRMS_MENU, Oracle Forms 12c, Oracle Database 19c, generated/virtual columns, plus Agent 1's carried-forward Oracle WebLogic/Oracle Reports entries)
- Architecture patterns catalogued: 23 (AP-01 through AP-23)
- NFR entries recorded: 22 (NFR-01 through NFR-22)
- Technical debt items identified: 38 (TD-01 through TD-38) — Critical: 6, High: 12, Medium-High: 6, Medium: 9, Low-Medium: 3, Low: 2
- CI/CD pipeline files directly read: 0 (confirmed none exist; 0 reusable workflow files)
- CI/CD capabilities confirmed present: 0 of 14
- Agent 1 LOW CONFIDENCE items resolved: 24 of 31 (items #2–#14, #17–#24, #29–#31)
- Discrepancies with Agent 1: 0 (all findings this session refine or confirm Agent 1's inventory; none contradict it)

---

## OUTPUT 1 - Technology Stack Assessment

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| Oracle Forms | 12c | Active - core path (all 6 scanned modules) | Full application UI/business-logic tier; every module gated by session+permission checks | Sustaining-support-era release per Oracle's Forms lifecycle — not independently re-verified against the live Oracle support calendar this session | Confirmed |
| Oracle WebLogic Server | 12c | Active (assumed, per README) | Hosts the Forms application server tier | UNKNOWN — no server config scanned | Confirmed (Agent 1 LOW on specifics, unchanged) |
| Oracle Database 19c | 19c | Active - core path | Sole data store; 29 tables / 6 views / 24 sequences scanned | Supported (Extended Support track), not independently re-verified | Confirmed |
| Oracle Reports | UNKNOWN | Declared-only | Referenced in README as the reporting engine; no .rdf/.rep files scanned, but the 6 scanned views appear purpose-built to feed reporting | UNKNOWN | Confirmed (Agent 1 already LOW) |
| PL/SQL | Oracle DB 19c native | Active - core path | All business logic, triggers, and libraries | Bundled with Oracle DB, Supported | Confirmed |
| HRMS_COMMON_LIB (PLL) | N/A | Active - core path, but handle_error usage unconfirmed | Toolbar handlers, session check, error-handling declaration, date formatting, LOV refresh | N/A | Confirmed |
| HRMS_VALIDATION_LIB (PLL) | N/A | Active - core path, duplicative with server-side rules | Client-side field validation | N/A | Confirmed |
| HRMS_MENU (Menu Module) | N/A | Active - core path | MAIN_MENUBAR structure, module launch points | N/A | Confirmed |
| PKG_SECURITY | UNKNOWN | Active - core path (call-site only; body unscanned) | Authenticate/session-validate/permission-check/logout for every module — highest coupling hotspot in the system | UNKNOWN | Confirmed |
| PKG_COMMON | UNKNOWN | Declared-only (call site exists in handle_error, but handle_error's own usage is unconfirmed) | Presumed error-logging sink | UNKNOWN | Confirmed |
| PKG_EMPLOYEE | UNKNOWN | Active - core path (call-site only; body unscanned) | Employee-number generation (documented race-condition risk) | UNKNOWN | Confirmed |
| PKG_VALIDATION | UNKNOWN | Active - core path (call-site only; body unscanned) | Server-side email-format validation, diverges from client-side equivalent | UNKNOWN | Confirmed |
| PKG_LEAVE | UNKNOWN | Active - core path (call-site only; body unscanned) | Submit/cancel leave request | UNKNOWN | Confirmed |
| PKG_PAYROLL | UNKNOWN | Active - core path (call-site only; body unscanned) | Payroll run create/calculate/approve | UNKNOWN | Confirmed |
| PKG_AUDIT | UNKNOWN | Active - core path (call-site only; body unscanned) | Audit logging sink for 3 DB triggers; inconsistent call signatures observed | UNKNOWN | Confirmed |
| PKG_DEPARTMENT, PKG_PERFORMANCE, PKG_NOTIFICATION, PKG_REPORTING, PKG_INTEGRATION | UNKNOWN | Declared-only - no call sites found in any scanned file this session either | UNKNOWN | UNKNOWN | Confirmed (Agent 1 already flagged as documentation-only) |
| USER_SESSIONS (table) | Oracle DB 19c native | Active - core path (inferred) | Presumed backing store for PKG_SECURITY session functions | Supported | New (consistent with Agent 1's narrative, not separately itemized in Agent 1's OUTPUT 1) |
| SYSTEM_PARAMETERS (config-as-data) | Oracle DB 19c native | Active - core path | Session/password/payroll/notification/integration config, 8 keys itemized | Supported | Confirmed (Agent 1 OUTPUT 6) |

---

## OUTPUT 2 - Architecture Pattern Catalog

*(Full catalog is the Stage 6 Final table above — AP-01 through AP-23, plus Pattern Coverage Gaps and Declared-But-Unused sections — reproduced here by reference to avoid duplication; see "Stage 6 - Architecture Pattern Catalog (Final)" section.)*

---

## OUTPUT 3 - Component Interaction & Contract Map

*(Full map is the Stage 7 table above, plus Coupling Hotspots and API Contract Inventory — reproduced by reference; see "Stage 7 - Component Interaction & Contract Map" section.)*

---

## OUTPUT 4 - Data Architecture Assessment

### Data Store Deep Dive

| Store | Access Pattern | ORM / Query Style | Transaction Scope | Consistency Model | Connection Pool Config | Migration State | Agent 1 Match? |
|---|---|---|---|---|---|---|---|
| HRMS Schema (Oracle DB 19c) | Direct Forms block binding (2-tier) + raw PL/SQL in packages/triggers | Raw SQL/PL-SQL — no ORM (none exists in this stack) | Forms-managed (COMMIT_FORM at UI action level); explicit trigger-level logic for cross-table audit/history writes | Strong (single Oracle instance, ACID) — no distributed/eventual-consistency concerns present given single data store | NOT FOUND — no WebLogic datasource/pool config scanned (Infrastructure Layer absent) | No migration framework found; DDL files appear to be the authoritative "current state" with no versioned migration history evident | Confirmed |

### Data Ownership Map

| Entity / Table | Owning Service | Other Services With Access | Access Type | Coupling Risk |
|---|---|---|---|---|
| EMPLOYEES | HRMS_EMPLOYEE (primary CRUD owner) | HRMS_LOGIN (read, EMP_ID lookup), HRMS_PAYROLL/LEAVE/PERFORMANCE (read, FK joins), all audit/history triggers (write) | Read-write (owner) / Read-only (others) | Tight — master entity referenced directly by nearly every other table via FK; no service-boundary abstraction |
| SALARY_RECORDS | HRMS_EMPLOYEE (read-only in this form — Insert/Update/DeleteAllowed=No at block level) | PKG_PAYROLL (presumed write path, unscanned), TRG_SALARY_AUDIT (write, audit) | Read-only (Forms) / Read-write (unscanned package) | Tight — shared table, write path not visible in this scan |
| LEAVE_REQUESTS | HRMS_LEAVE (owner) | PKG_LEAVE (write, unscanned), TRG_LEAVE_REQUEST_AUDIT (write, audit) | Read-write | Tight |
| PAYROLL_RUNS / PAYROLL_DETAILS | HRMS_PAYROLL (owner, via PKG_PAYROLL) | VW_PAYROLL_LATEST (read) | Read-write | Tight — no versioned contract between the view and the underlying tables' evolving shape |
| EMPLOYEE_HISTORY | Intended as a shared compliance-trail table, written by TRG_EMP_BEFORE_UPDATE | None (read side not observed in any scanned file) | Write (currently broken — see TD-20) | **ANTIPATTERN** — the sole writer to this table (TRG_EMP_BEFORE_UPDATE) uses a column/constraint shape that doesn't match the table's actual DDL; this compliance trail is not reliably being populated |
| SYSTEM_PARAMETERS | Cross-cutting config owner, no single "service" | Security, Payroll, Notification, Integration domains (conceptual readers, no direct read call site scanned) | Read (presumed) | Loose — table-based config is inherently shared, but no single owner enforces schema on the PARAM_VALUE contents |

### Data Flow & Consistency Notes

- **Leave-balance consistency drift** (TD-29): `LEAVE_BALANCES.AVAILABLE` (virtual column, subtracts PENDING) and `VW_LEAVE_SUMMARY.AVAILABLE` (hand-rolled, omits PENDING) are two representations of the same business concept that will disagree whenever an employee has a pending leave request — a real, user-visible data-consistency defect, not a theoretical one.
- **Salary-effective-dating inconsistency** (TD-30): `VW_ACTIVE_EMPLOYEES` correctly scopes its SALARY_RECORDS join by effective/end date; `VW_EMPLOYEE_COMPENSATION` does not, and can therefore surface a salary that isn't actually in effect yet, or produce duplicate rows.
- **Audit trail granularity is inconsistent by design** (AP-18): Salary and Leave changes get before/after JSON snapshots; Department changes get only the fact that *a* change occurred, with no captured detail — this is a genuine cross-table inconsistency in compliance depth, not a bug in any single trigger.
- **No event-sourcing or CQRS pattern present** — this is a straightforward normalized-write / denormalized-view-read architecture, consistent with the technology's era and the absence of any message-queue technology in the stack.

---

## OUTPUT 5 - Security Architecture Assessment

### Authentication & Authorisation Implementation

| Mechanism | Declared (Agent 1) | Implemented How | Validation Completeness | Gaps | Severity |
|---|---|---|---|---|---|
| PKG_SECURITY.authenticate | Authentication, call-site only, LOW confidence | Called from HRMS_LOGIN.BTN_LOGIN with username/password + client host; returns a session ID stored in `:GLOBAL.session_id` | Full at the call-site level; implementation internals (hashing, lockout, rate-limiting) entirely unverified | No account lockout, no 2FA/CAPTCHA (both explicitly documented as absent), cleartext password transport | Critical (transport) / High (no lockout, no 2FA) |
| PKG_SECURITY.is_session_valid | Session Validation, HIGH confidence on call-site | Called at the top of every module's WHEN-NEW-FORM-INSTANCE, and from HRMS_COMMON_LIB.check_session | Full at the call-site level (universally applied); `SECURITY.SESSION_TIMEOUT_MIN`=30 exists as config but its use inside this function is unconfirmed | Cannot confirm the 30-minute timeout is actually enforced | Medium (enforcement unconfirmed) |
| PKG_SECURITY.has_permission | Authorisation (RBAC-style), HIGH confidence on call-site | Called with (emp_id, module, action) at varying depths — full module+action gating in HRMS_PAYROLL's approve path; module-only gating (via menu-disable) elsewhere; **entirely absent** in HRMS_PERFORMANCE | **Partial** — see Attack Surface Summary | Zero authorization on Performance Reviews; asymmetric authorization on Payroll create/calculate vs. approve; menu-path vs. button-path asymmetry | High |
| PKG_SECURITY.logout | Session Termination, HIGH confidence on call-site | Called from HRMS_MENU BTN_LOGOUT and MI_LOGOUT | Full | None observed | - |

### Secrets Posture

| Item | Finding | Severity | Evidence |
|---|---|---|---|
| Login password | Transmitted in cleartext over the Forms applet wire protocol (masked in the UI via ConcealData, but not encrypted in transit per the form's own documentation) | Critical | forms/xml-exports/HRMS_LOGIN.xml header comment |
| SSN (EMPLOYEES, EMPLOYEE_DEPENDENTS) | Column-level encryption claimed (AES-256) via comment only; decrypt logic lives in unscanned PKG_SECURITY | Medium (ASSUMED - cannot verify the claim) | schema/tables/01_core_tables.sql comment |
| Bank account number (EMPLOYEE_BANK_ACCOUNTS) | Same as above — ACCOUNT_NUMBER_ENC, encryption mechanism unverified | Medium (ASSUMED) | schema/tables/02_payroll_tables.sql |
| Application config (SYSTEM_PARAMETERS) | No secrets manager; config-as-data in a plain table with no column-level protection noted on PARAM_VALUE itself (though the values scanned — SMTP host, fiscal year start, etc. — are not credential secrets) | Low (no credential-like values found in the scanned config rows) | data/seed/01_reference_data.sql |

### Attack Surface Summary

| Surface | Exposure | Mitigations Found | Gaps |
|---|---|---|---|
| Login form (HRMS_LOGIN) | Single unauthenticated entry point to the entire application | Vague error messaging (correct practice against username enumeration); password field masked in UI | Cleartext transport, no lockout, no 2FA/CAPTCHA — all three Critical/High |
| HRMS_PERFORMANCE module | Any authenticated employee, once past login, can open this form and edit any performance review's rating/assessment fields they can navigate to | Session-validity gate only | No module-level or action-level `has_permission` check at all — the weakest-gated module in the system |
| HRMS_PAYROLL create/calculate actions | Any user with `PAYROLL/VIEW` (a comparatively low bar) can create and calculate payroll runs | Form-level VIEW gate; approve path separately gated on `PAYROLL/APPROVE` | Create/Calculate have no distinct permission tier from View |
| Menu-bar navigation paths (Payroll, Reports) | Slightly wider than the button paths to the same forms | Disabled-state property set at load | No independent runtime re-check on the menu path, unlike the button path |

---

## OUTPUT 6 - NFR Registry

*(Full cumulative register is reproduced across Chunks 1–3 above — NFR-01 through NFR-22. Summarized by category below for quick reference.)*

| Category | Count | Notable Entries |
|---|---|---|
| Availability | 1 | NFR-01 (30-min session timeout, enforcement unconfirmed) |
| Reliability / Data Quality | 3 | NFR-02 (8-char password minimum, unenforced), NFR-14/NFR-15 (conflicting 90-day vs. 180-day hire-date thresholds) |
| Throughput | 9 | NFR-05 through NFR-13 (Forms block record-fetch sizes, 1–10 rows depending on module) |
| Scalability / Latency | 1 | NFR-18 (VW_ORG_HIERARCHY >500-employee documented perf ceiling) |
| Resource Management | 5 | NFR-16/NFR-17 (sequence caching), NFR-21/NFR-22 (bank account / emergency contact priority ordering defaults) |
| Rate | 1 | NFR-20 (notification priority default, scale undocumented) |
| Data Freshness / Config | 2 | NFR-03/NFR-04 (payroll frequency and fiscal year defaults) |
| Reliability (queue) | 1 | NFR-19 (notification retry-count default, no ceiling found) |

**Notable gap:** no connection-pool, thread-pool, or WebLogic-tier NFRs were found anywhere in the scanned set — this is a real gap (Infrastructure Layer confirmed absent by Agent 1), not an oversight in this analysis; any WebLogic datasource pool sizing that exists is undocumented in this repository.

---

## OUTPUT 7 - Technical Debt & Risk Register

*(Sorted by severity, descending. Full detail for each item is in its originating chunk above; summarized here for the final register.)*

### Critical
- **TD-20** — `TRG_EMP_BEFORE_UPDATE` inserts into `EMPLOYEE_HISTORY` with column names and CHECK-constraint values that don't exist/aren't allowed on the table — the compliance-audit trail for employee status/dept/job changes is currently broken.
- **TD-21** — Seed script column mismatch: `LOCATIONS.PHONE` vs. actual `PHONE_NUMBER`.
- **TD-22** — Seed script for `JOB_GRADES` omits required `GRADE_CODE`, references nonexistent `GRADE_LEVEL`.
- **TD-24** — `EMPLOYEES.EMAIL` has no unique constraint; enforced only by a racy, ACTIVE_FLAG-scoped trigger check.
- **TD-01** — Login password transmitted in cleartext over the Forms applet protocol.
- **TD-36** — No CI/CD pipeline of any kind exists anywhere in the system.

### High
- **TD-02** — No account lockout after failed logins.
- **TD-03** — No CAPTCHA/2FA.
- **TD-04** — Zero authorization gating on HRMS_PERFORMANCE.
- **TD-05** — HRMS_PAYROLL create/calculate actions lack distinct permission checks.
- **TD-10** — Hire-date validation conflict (90 vs. 180 days).
- **TD-19** — Employee hard-delete is DB-blocked but Forms UI still exposes DELETE_RECORD.
- **TD-23** — `SYSTEM_PARAMETERS` seed script column mismatch.
- **TD-25** — `SEQ_EMP_NUMBER` likely bypassed by a MAX()+1 race condition in `PKG_EMPLOYEE.generate_emp_number`.
- **TD-27** — Possible `CHK_AUDIT_ACTION` CHECK-constraint violation on every leave status-change audit call (**highest-priority item to verify once PKG_AUDIT is available**).
- **TD-37** — No Infrastructure-as-Code anywhere in the system.
- *(CI/CD Stage 8 sub-findings: Build, Unit Tests, Automated Deploy, Auto Rollback, Smoke/Health-Check, SAST, Dependency Scan, Secret Scan — all Critical/High per the CI/CD Maturity table; consolidated under TD-36 rather than itemized separately to avoid duplicate bookkeeping.)*

### Medium-High
- **TD-06** — Menu-path vs. button-path authorization asymmetry.
- **TD-11** — Client/server email-validation drift.
- **TD-29** — Leave-balance formula divergence (view vs. virtual column).
- **TD-31** — `VW_PAYROLL_LATEST` "latest run" logic doesn't generalize to parallel/off-cycle runs.
- **TD-34** — `VW_ORG_HIERARCHY` documented performance ceiling, no mitigation evident.
- **TD-38** — No structured/centralized logging beyond ad hoc, unscanned package calls.

### Medium
- **TD-07** — Login's catch-all exception handling masks EMP_ID-lookup data-integrity errors.
- **TD-08** — Password-minimum-length policy configured but unenforced in any scanned code path.
- **TD-12** — Validation logic duplicated across 3+ implementation points.
- **TD-15** — Three forms have stub/incomplete tab pages relative to their own documentation.
- **TD-17** — HRMS_PERFORMANCE goal-category poplist can't set 2 of 5 DB-valid values.
- **TD-26** — `EMPLOYEES.EMP_ID` has no DB-level default; non-Forms inserts will fail without explicit ID.
- **TD-28** — `TRG_DEPARTMENT_AUDIT` captures no before/after values, unlike its peer triggers.
- **TD-30** — `VW_EMPLOYEE_COMPENSATION` lacks the date-scoping its sibling view applies.
- **TD-32** — Missing FK constraints on `DEPARTMENTS` self/manager/location references.

### Low-Medium
- **TD-09** — Session-timeout enforcement unconfirmed.
- **TD-13** — `validate_salary_range` header comment contradicts its own (correct) live-query code.
- **TD-14** — Possible duplicate `SHOW_ALERT` invocation in HRMS_EMPLOYEE's KEY-EXIT trigger.
- **TD-33** — Missing FK constraints recur across `HOLIDAYS`, `NOTIFICATION_QUEUE`, `LEAVE_ACCRUAL_LOG`, `LOOKUP_VALUES`.

### Low
- **TD-16** — `ALT_CONFIRM_DELETE` alert appears unused in HRMS_EMPLOYEE.xml.
- **TD-18** — `RATING_LABEL` Forms item-type metadata inconsistency.
- **TD-35** — Dead first `UPDATE DEPARTMENTS` statement in seed script.

---

## OUTPUT 8 - Operational Architecture Assessment

*(Full four-section assessment reproduced above under "Stage 8 - Operational Architecture Assessment": CI/CD Pipeline Maturity — 0 of 14 capabilities present — plus Observability Coverage, Deployment Safety, and Disaster Recovery Posture, all predominantly Absent/UNKNOWN given the confirmed absence of Infrastructure, CI/CD, and Observability layers.)*

---

## Validation Queue (Unresolved)

| # | Item | Chunk | Reason Still Unresolved |
|---|---|---|---|
| 1 | Oracle Reports version unknown | 0 | No .rdf/.rep files were provided in this deep-scan batch either |
| 2 | 5 Forms referenced via OPEN_FORM/menu bindings (`HRMS_DEPARTMENT`, `HRMS_REPORTS`, `HRMS_ADMIN`, `HRMS_LOV`, `HRMS_TOOLBAR`) remain unscanned | 2 | Not included in this deep-scan file set |
| 3 | All 12 PL/SQL packages (`PKG_SECURITY`, `PKG_EMPLOYEE`, `PKG_PAYROLL`, `PKG_LEAVE`, `PKG_VALIDATION`, `PKG_AUDIT`, `PKG_COMMON`, `PKG_DEPARTMENT`, `PKG_PERFORMANCE`, `PKG_NOTIFICATION`, `PKG_REPORTING`, `PKG_INTEGRATION`) remain entirely unscanned at the body level | 1/2/3 | Standing constraint for this entire analysis — every finding that touches package internals is marked LOW/ASSUMED accordingly (see TD-05→TD-09, TD-25, TD-27, TD-28, AP-05) |
| 4 | TD-27 — whether `PKG_AUDIT.log_action`'s 3rd parameter actually maps to `AUDIT_LOG.ACTION_TYPE` (which would make every leave status-change audit call violate `CHK_AUDIT_ACTION`) | 3 | Cannot be confirmed without `PKG_AUDIT`'s body — **highest-priority package to obtain for the next analysis pass** |
| 5 | TD-25 — whether `PKG_EMPLOYEE.generate_emp_number` truly uses `MAX()+1` instead of `SEQ_EMP_NUMBER.NEXTVAL` | 3 | Same constraint — package body unscanned; only the sequence-file's own comment documents this risk |
| 6 | AP-05 — whether SSN/bank-account columns are actually AES-256 encrypted as their column comments claim | 1 | Same constraint — `PKG_SECURITY` body unscanned |
| 7 | AP-07 — whether `HRMS_COMMON_LIB.handle_error` is invoked anywhere in the system (no call site found in the 6 scanned forms) | 2 | May be called from the 5 unscanned forms; cannot confirm dead-code status without them |
| 8 | Deployment topology (WebLogic sizing, network, TLS termination, DR posture) | 4/5/6 | Infrastructure Layer confirmed absent from the entire repository, not merely unscanned — this information may exist outside the repository entirely |
| 9 | `config/` and `docs/` directories referenced in the README's documented layout were never included in either agent's scanned file set | 0 | Unknown additional configuration/documentation may exist outside this scan |

---

## Agent 1 Discrepancy Log

**No contradictions found.** Every finding in this deep analysis either confirms or refines an item Agent 1 already flagged in its Validation Queue — none of Agent 1's Technology Stack Inventory, Component & Service Map, Data Store Registry, or Security & Configuration Snapshot entries were contradicted by the deep read.

One classification refinement worth recording: Agent 1's Validation Queue logged the `EMPLOYEE_HISTORY` trigger problem as two adjacent items (#3: column-name mismatch, #4: CHECK-constraint violation on `CHANGE_TYPE` values). Deep read confirms these are **two independently fatal defects that must both be fixed together** — resolving only the column-name mismatch would still leave `'DEPARTMENT_CHANGE'`/`'JOB_CHANGE'` violating `CHK_CHANGE_TYPE` on every department/job-change update to an employee. This is consolidated as a single Critical finding (TD-20) in this document's register, with both root causes stated explicitly so neither is fixed in isolation.

---
Agent 2 Analysis Complete.
Documentation is ready for technical review.
Highest-priority action item: **TD-20 — `TRG_EMP_BEFORE_UPDATE`'s INSERT into `EMPLOYEE_HISTORY` uses column names and CHECK-constraint values that do not exist/aren't permitted on the actual table.** This is a live, confirmed defect (not inferred) on the most frequently-exercised write path in the system (any employee status, department, or job change) — the compliance/audit trail for these changes is currently either failing outright or has never been successfully exercised in this environment. Fix this before addressing any Medium/Low item in this register. Runner-up priority: verify TD-27 (`PKG_AUDIT.log_action` / `CHK_AUDIT_ACTION` interaction) as soon as `PKG_AUDIT`'s body becomes available, since it may indicate the same class of defect is already silently affecting leave-request audit logging today.
