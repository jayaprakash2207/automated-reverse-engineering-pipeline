# Agent 2 — Batch 2 of 2 — Deep Technology Analysis

Batch 2's file set is entirely **Data Layer** material (core/payroll/leave/performance table DDL, views, sequences) — a direct continuation of Batch 1's Data Layer chunk. Processing as a single chunk. Numbering continues from Batch 1: **AP-14**, **NFR-01**, **TD-20**.

---

## Agent 2 – Chunk 1 of 1 (Batch 2) – Data Layer (Schema DDL: Tables, Views, Sequences)

**Agent 1 Input This Chunk:**
- Technologies being analysed: Oracle Database 19c DDL (tables, views, sequences) — schema/tables/01–04, schema/views/hrms_views.sql, schema/sequences/hrms_sequences.sql
- Components being traced: DEPARTMENTS, LOCATIONS, JOB_GRADES, JOB_TITLES, EMPLOYEES, EMPLOYEE_HISTORY, EMPLOYEE_DEPENDENTS, EMERGENCY_CONTACTS, SALARY_RECORDS, PAY_ELEMENTS, EMPLOYEE_PAY_ELEMENTS, PAY_PERIODS, PAYROLL_RUNS, PAYROLL_DETAILS, TAX_BRACKETS, EMPLOYEE_TAX_INFO, EMPLOYEE_BANK_ACCOUNTS, LEAVE_TYPES, LEAVE_BALANCES, LEAVE_REQUESTS, LEAVE_ACCRUAL_LOG, HOLIDAYS, REVIEW_CYCLES, PERFORMANCE_REVIEWS, PERFORMANCE_GOALS, AUDIT_LOG, SYSTEM_PARAMETERS, NOTIFICATION_QUEUE, USER_SESSIONS, LOOKUP_VALUES
- Data stores being traced: Full HRMS schema DDL (30 tables, 7 views, 27 sequences)
- LOW CONFIDENCE items to resolve: EMPLOYEE_HISTORY column-shape conflict (Batch 1, now independently confirmed from the table-owner side); PKG_AUDIT signature ambiguity (Batch 1 TD-16, now partially informed by AUDIT_LOG's presumed backing shape)

**Carried Forward from Prior Chunks:**
- Validated technologies: Oracle Forms 12c, PKG_SECURITY, HRMS_COMMON_LIB, HRMS_VALIDATION_LIB, PKG_COMMON, PKG_VALIDATION, Oracle DB 19c triggers, PKG_AUDIT
- NFR entries catalogued so far: 0
- Technical debt entries catalogued so far: TD-01 – TD-19 (19)
- Unresolved Validation Queue items: PKG_SECURITY, PKG_COMMON, PKG_VALIDATION, PKG_AUDIT internals (all unscanned); AP-01 caller coverage

---

### Stage 2 — Technology Stack Assessment

| Component | Declared Version | Usage Depth | How It Is Used in This System | EOL / Support Status | Agent 1 Match? |
|---|---|---|---|---|---|
| Oracle DB 19c core DDL (30 tables) | 19c | Active - core path | Full relational schema for org structure, payroll, leave, performance, and cross-cutting audit/session/lookup concerns | Supported | Confirmed |
| Oracle `GENERATED ALWAYS AS ... VIRTUAL` computed columns | 19c feature | Active - core path | `LEAVE_BALANCES.AVAILABLE` derives balance from 5 stored columns via a stored formula | N/A | New — not itemised at this granularity by Agent 1 |
| Oracle `CONNECT BY` hierarchical queries | 19c feature | Active - core path, single usage | `VW_ORG_HIERARCHY` builds the org chart via `START WITH ... CONNECT BY PRIOR`, with a self-documented performance ceiling | N/A | New — view-level detail not previously itemised |
| Oracle sequences (27 total) | 19c feature | Active - core path (26 of 27 confirmed used); 1 orphaned candidate | Surrogate key generation for every table except EMPLOYEES (see TD-23/TD-24) | N/A | Confirmed |
| PKG_AUDIT | UNKNOWN — still unscanned | Active - core path | `AUDIT_LOG` table shape (TABLE_NAME/RECORD_ID/ACTION_TYPE/OLD_VALUES/NEW_VALUES/CHANGED_BY) strongly suggests it is `log_action`'s backing store, but the mapping is inferred from column-name alignment, not a scanned package body | UNKNOWN | LOW - inferred, not confirmed (informs but does not resolve Batch 1's PKG_AUDIT arity question) |
| PKG_EMPLOYEE.generate_emp_number | UNKNOWN — unscanned | Active - core path | Per DDL comment, reportedly uses `MAX(EMP_NUMBER)+1` logic rather than `SEQ_EMP_NUMBER.NEXTVAL` — a documented concurrency defect (TD-23) | UNKNOWN | DISCREPANCY candidate — `SEQ_EMP_NUMBER` exists in DDL but is potentially orphaned/unused; see TD-23 |
| USER_SESSIONS table | N/A | Active - core path | Backing store for `PKG_SECURITY.authenticate`/`is_session_valid`/session lifecycle (Batch 1, Chunk 1) — schema now confirms EMP_ID/USERNAME/LOGIN_TIME/LOGOUT_TIME/SESSION_STATUS shape | N/A | New evidence for Batch 1's AP-01 dependency; internals of PKG_SECURITY remain unverified |
| NOTIFICATION_QUEUE table | N/A | Declared-only in this batch — no dispatcher package (`PKG_NOTIFICATION`, inferred name) scanned | Queue-table pattern for EMAIL/IN_APP/SMS notifications with STATUS/RETRY_COUNT/PRIORITY | N/A | New — not previously itemised |

---

### Stage 3 — Architecture Pattern Catalog

| ID | Pattern Name | Category | Applies To | Exact Configuration | Coverage | Confidence | Source |
|---|---|---|---|---|---|---|---|
| AP-14 | Denormalized Reporting View with Date-Scoped Effective Salary Join | Data Access | VW_ACTIVE_EMPLOYEES | LEFT JOIN to SALARY_RECORDS filtered on `ACTIVE_FLAG='Y' AND EFFECTIVE_DATE<=SYSDATE AND (END_DATE IS NULL OR END_DATE>SYSDATE)`; computed `TENURE_YEARS = TRUNC(MONTHS_BETWEEN(SYSDATE,HIRE_DATE)/12,1)` | Applied consistently within this view only | HIGH | schema/views/hrms_views.sql |
| AP-15 | Self-Referencing Hierarchical Query (CONNECT BY) | Data Access | VW_ORG_HIERARCHY | `START WITH MANAGER_EMP_ID IS NULL CONNECT BY PRIOR EMP_ID = MANAGER_EMP_ID`; `LEVEL` as ORG_LEVEL; `SYS_CONNECT_BY_PATH` as ORG_PATH; `CONNECT_BY_ISLEAF` as IS_LEAF | Single implementation; self-documented as degrading ">500 employees" (see TD-30) | HIGH | schema/views/hrms_views.sql |
| AP-16 | Compensation Ratio Analytics View | Data Access | VW_EMPLOYEE_COMPENSATION | `GRADE_MIDPOINT = (MIN_SALARY+MAX_SALARY)/2`; `COMPA_RATIO = ROUND(BASE_SALARY/GRADE_MIDPOINT*100,1)` | Applied only in this view; join lacks the date-scoping AP-14 uses (see TD-27) | HIGH | schema/views/hrms_views.sql |
| AP-17 | Generated/Virtual Column for Derived Business Balance | Data Access | LEAVE_BALANCES.AVAILABLE | `GENERATED ALWAYS AS (OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT - PENDING) VIRTUAL` | Table-level formula not consistently mirrored elsewhere (see TD-28) | HIGH | schema/tables/03_leave_tables.sql |
| AP-18 | UNION ALL Cross-Domain Approval Queue | Data Access | VW_PENDING_APPROVALS | UNION ALL of LEAVE_REQUESTS (STATUS='PENDING') and PERFORMANCE_REVIEWS (STATUS='MANAGER_REVIEW'), normalised to APPROVAL_TYPE/ITEM_ID/APPROVER_ID/ITEM_DESCRIPTION/REQUEST_DATE/DETAILS | Covers 2 of the system's approval workflows (leave, performance); appears intended to back HRMS_LEAVE.xml's stubbed "Pending Approvals" tab (per Batch 1 finding that block has no data source) | HIGH | schema/views/hrms_views.sql |
| AP-19 | DB-Enforced State Machine via STATUS Column + CHECK Constraint | Data Access | PAYROLL_RUNS | `CHK_RUN_STATUS` permits exactly: PENDING, CALCULATING, CALCULATED, APPROVED, PAID, REVERSED, ERROR; default 'PENDING' | Enforced at DB layer only via CHECK — no DB-level trigger enforces valid *transitions* between these states (e.g. nothing stops PENDING→PAID directly) | HIGH for the allowed-value set; LOW - transition-order enforcement for transition legality, since no trigger was found governing it | schema/tables/02_payroll_tables.sql |
| AP-20 | "Latest Record" via MAX(Surrogate Key) | Data Access | VW_PAYROLL_LATEST | `pr.RUN_ID = (SELECT MAX(pr2.RUN_ID) FROM PAYROLL_RUNS pr2 WHERE pr2.STATUS='APPROVED')` | Single global "latest," not scoped per pay period/frequency (see TD-29) | HIGH | schema/views/hrms_views.sql |
| AP-21 | Differentiated Sequence Caching Strategy | Scalability | SEQ_AUDIT vs. all other 26 sequences | `SEQ_AUDIT`: `CACHE 100`; all others: `NOCACHE` (Oracle default is `CACHE 20` when unspecified) | Deliberate, consistently applied split (1 cached sequence, 26 explicitly NOCACHE) | HIGH | schema/sequences/hrms_sequences.sql |

---

### Stage 4 — NFR Registry

> DDL is a sparse source for classic NFRs (timeouts, pool sizes, TTLs live in application/WebLogic config, which Agent 1 confirmed **NOT FOUND** anywhere in the scanned set). The entries below are the only genuine non-functional parameters directly evidenced in this batch's schema files.

| ID | NFR Name | Value | Category | Source | Confidence |
|---|---|---|---|---|---|
| NFR-01 | `SEQ_AUDIT` sequence cache size | `CACHE 100` | Throughput / Resource Management | schema/sequences/hrms_sequences.sql | HIGH |
| NFR-02 | All non-audit sequences (26 of 27) cache size | `NOCACHE` (i.e., effectively cache size 1, vs. Oracle's implicit default of `CACHE 20`) | Resource Management / Throughput | schema/sequences/hrms_sequences.sql | HIGH |
| NFR-03 | `VW_ORG_HIERARCHY` documented safe operating ceiling | ">500 employees" before significant performance degradation (exact figure per in-code comment) | Latency | schema/views/hrms_views.sql | HIGH - directly quoted from source comment; cross-referenced as TD-30 |

**Availability/Resource NFRs: none declared for connection pooling, statement timeouts, or LOB fetch sizes** anywhere in this batch's DDL — any such limits are either absent or live entirely in the unscanned WebLogic/JDBC configuration layer, consistent with Agent 1's "NOT FOUND" infrastructure finding. Logged as a gap, not assumed absent.

---

### Stage 5 — Technical Debt & Risk Register

| ID | Risk / Debt Item | Category | Affected Component(s) | Severity | Evidence | Recommended Action |
|---|---|---|---|---|---|---|
| TD-20 | Seed script for `JOB_GRADES` inserts `GRADE_ID, GRADE_NAME, GRADE_LEVEL, MIN_SALARY, MAX_SALARY, ACTIVE_FLAG, CREATED_BY, CREATED_DATE` — omits the NOT NULL `GRADE_CODE` column and references a nonexistent `GRADE_LEVEL` column | Configuration Risk / Data Quality | data/seed/01_reference_data.sql, JOB_GRADES | Critical | Direct column-list comparison against DDL: `GRADE_CODE VARCHAR2(10) NOT NULL` has no seed value, `GRADE_LEVEL` does not exist in the table | Fix seed script column list to match DDL exactly (supply `GRADE_CODE`, drop `GRADE_LEVEL`) before this seed can execute at all |
| TD-21 | Seed script for `LOCATIONS` inserts into column `PHONE`; DDL defines `PHONE_NUMBER` | Configuration Risk / Data Quality | data/seed/01_reference_data.sql, LOCATIONS | Critical | Direct column-name comparison; `ORA-00904: invalid identifier` on execution | Correct seed script to use `PHONE_NUMBER` |
| TD-22 | Seed script for `SYSTEM_PARAMETERS` inserts into column `DESCRIPTION`; DDL defines `PARAM_DESCRIPTION`; `DATA_TYPE` also omitted (though it has a default, so that part alone would not fail) | Configuration Risk / Data Quality | data/seed/01_reference_data.sql, SYSTEM_PARAMETERS | Critical | Direct column-name comparison; the `DESCRIPTION` mismatch alone causes `ORA-00904` | Correct seed script to use `PARAM_DESCRIPTION` |
| TD-23 | `PKG_EMPLOYEE.generate_emp_number` reportedly derives new `EMP_NUMBER` values via `MAX(EMP_NUMBER)+1` instead of `SEQ_EMP_NUMBER.NEXTVAL`, per an explicit DDL-file comment stating this "creates a race condition" | Anti-pattern / Concurrency Defect | PKG_EMPLOYEE (unscanned body), EMPLOYEES, SEQ_EMP_NUMBER | Critical | Documented directly in schema/sequences/hrms_sequences.sql; two concurrent inserts computing the same MAX()+1 before either commits produce duplicate `EMP_NUMBER` values, violating the implied business uniqueness rule (no unique constraint on EMP_NUMBER format beyond `UK_EMP_NUMBER`, which would itself only reject the duplicate at commit time — one of the two transactions fails, an availability/UX issue, not silent corruption) | Rewrite `generate_emp_number` to use `SEQ_EMP_NUMBER.NEXTVAL`; confirm via package body scan (still unavailable) whether `SEQ_EMP_NUMBER` is actually orphaned |
| TD-24 | `EMPLOYEES.EMP_ID` (NOT NULL, no DEFAULT) is only populated via `SEQ_EMPLOYEE.NEXTVAL` in the Forms-layer `PRE-INSERT` trigger (per Batch 1/file description), not by any DB-level default or trigger | Operational Risk | EMPLOYEES, SEQ_EMPLOYEE | Medium | DDL shows no DEFAULT clause on EMP_ID; no `BEFORE INSERT` trigger populating it was found among the scanned triggers (Batch 1 covered TRG_EMP_BEFORE_INSERT/UPDATE, INSTEAD_OF_DELETE only) | Any non-Forms insert path (data migration, batch load, direct SQL) must supply EMP_ID explicitly or will fail — document this constraint explicitly for any future integration work |
| TD-25 | Inconsistent FK enforcement across conceptually identical relationships: `DEPARTMENTS.PARENT_DEPT_ID` (self-ref hierarchy), `DEPARTMENTS.MANAGER_EMP_ID`, `DEPARTMENTS.LOCATION_CODE`, `HOLIDAYS.LOCATION_CODE`, `LOOKUP_VALUES.PARENT_LOOKUP_ID`, and `NOTIFICATION_QUEUE.RECIPIENT_EMP_ID` all lack FK constraints, while `EMPLOYEES` declares FKs for the equivalent relationships (dept, manager self-ref, location) | Configuration Risk | DEPARTMENTS, HOLIDAYS, LOOKUP_VALUES, NOTIFICATION_QUEUE | Medium | Direct constraint-list comparison across tables; `DEPARTMENTS`'s own comment claims "Self-referencing FK for department hierarchy" on PARENT_DEPT_ID despite no such constraint existing | Add the missing FK constraints, or if intentionally omitted for performance/flexibility reasons, correct the misleading column comment on `DEPARTMENTS.PARENT_DEPT_ID` |
| TD-26 | `AUDIT_LOG.CHK_AUDIT_ACTION` permits only `'INSERT','UPDATE','DELETE'`, but Batch 1's `TRG_LEAVE_REQUEST_AUDIT` passes `'STATUS_CHANGE'` as the action argument to `PKG_AUDIT.log_action` | Configuration Risk / Anti-pattern | AUDIT_LOG, PKG_AUDIT (unscanned), TRG_LEAVE_REQUEST_AUDIT (Batch 1) | High | Table-column-shape alignment (TABLE_NAME/RECORD_ID/ACTION_TYPE/OLD_VALUES/NEW_VALUES/CHANGED_BY) strongly suggests AUDIT_LOG is `log_action`'s backing table; if the 3rd parameter maps straight to ACTION_TYPE, every leave status-change audit write violates `CHK_AUDIT_ACTION` | LOW - PKG_AUDIT's actual parameter-to-column mapping is unconfirmed without its package body; if confirmed, add `'STATUS_CHANGE'` to the check constraint or have the trigger pass an allowed value | Prioritise obtaining PKG_AUDIT's body — this could mean every leave-status audit insert is currently failing silently (if wrapped in `WHEN OTHERS`) or raising unhandled |
| TD-27 | `VW_EMPLOYEE_COMPENSATION`'s join to `SALARY_RECORDS` filters only on `ACTIVE_FLAG='Y'`, omitting the `EFFECTIVE_DATE<=SYSDATE AND (END_DATE IS NULL OR END_DATE>SYSDATE)` scoping that `VW_ACTIVE_EMPLOYEES` (AP-14) applies | Anti-pattern / Data Quality | VW_EMPLOYEE_COMPENSATION, SALARY_RECORDS | High | Direct comparison of the two views' JOIN predicates in the same file | If an employee has >1 row with `ACTIVE_FLAG='Y'` (e.g. a future-dated raise not yet effective, or a historical row not properly deactivated), this view can produce duplicate employee rows or report a not-yet-effective salary/compa-ratio | Align this view's join predicate with `VW_ACTIVE_EMPLOYEES`'s date-scoping |
| TD-28 | `VW_LEAVE_SUMMARY.AVAILABLE` is manually recomputed as `OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT`, omitting `PENDING` — diverging from `LEAVE_BALANCES.AVAILABLE`'s own virtual-column formula (AP-17), which subtracts PENDING | Anti-pattern / Data Quality | VW_LEAVE_SUMMARY, LEAVE_BALANCES | High | Formula comparison between the table's `GENERATED ALWAYS AS` definition and the view's `SELECT` expression, both directly read in this batch | Whenever `PENDING != 0`, `VW_LEAVE_SUMMARY.AVAILABLE` and `LEAVE_BALANCES.AVAILABLE` report different values for the same employee/leave-type/year — pick one formula and have the view select the table's virtual column directly rather than re-deriving it |
| TD-29 | `VW_PAYROLL_LATEST` defines "the latest payroll run" as the single global `MAX(RUN_ID)` among `APPROVED` runs, assuming exactly one global latest run rather than one per pay period/frequency/off-cycle run | Anti-pattern / Business Logic Risk | VW_PAYROLL_LATEST, PAYROLL_RUNS | Medium | Subquery directly read: `WHERE pr2.STATUS='APPROVED'` with no `PERIOD_ID` or `RUN_TYPE` scoping | If the company ever runs parallel payrolls (different frequencies, or a supplemental/off-cycle run alongside a regular run), this view silently reflects only the single highest-ID approved run and can exclude entire employee populations from "latest payroll" reporting | Scope the MAX(RUN_ID) subquery per PERIOD_ID/RUN_TYPE combination, or per pay-frequency grouping |
| TD-30 | `VW_ORG_HIERARCHY`'s CONNECT BY hierarchical query has a self-documented performance ceiling: "Performance degrades significantly with >500 employees" | Scalability Constraint | VW_ORG_HIERARCHY, EMPLOYEES | High (given org-chart views are typically hit frequently in HR UIs) | Direct quote from the view's own comment (also logged as NFR-03) | Replace with a materialized hierarchy table maintained incrementally (e.g. via trigger or scheduled job), or paginate/scope the CONNECT BY to a subtree rather than the whole org, before employee count approaches 500 |
| TD-31 | `EMPLOYEES` (the highest-traffic master table) stores `PHOTO_BLOB` and `NOTES` (CLOB) directly alongside frequently-queried transactional columns | Scalability Constraint | EMPLOYEES | Low-Medium | Column list directly read; any `SELECT *`-style fetch (common in Oracle Forms default data blocks, per the pattern already observed in HRMS_EMPLOYEE.xml in Batch 1) pulls LOB data even when unneeded | Confirm Forms blocks against EMPLOYEES project explicit column lists rather than `SELECT *`; consider moving PHOTO_BLOB/NOTES to a separate 1:1 table if LOB fetch overhead is measurable |
| TD-32 | `PERFORMANCE_GOALS.GOAL_CATEGORY` permits 5 values via `CHK_GOAL_CATEGORY` (`BUSINESS, DEVELOPMENT, LEADERSHIP, INNOVATION, COMPLIANCE`), but the HRMS_PERFORMANCE.xml `PERFORMANCE_GOAL` block's poplist LOV offers only 3 (`Business, Development, Leadership`) | Configuration Risk (UI/DB mismatch) | PERFORMANCE_GOALS, HRMS_PERFORMANCE.xml | Medium | Direct comparison of `CHK_GOAL_CATEGORY`'s allowed-value list against the described poplist choices | Existing rows with `INNOVATION`/`COMPLIANCE` display correctly but cannot be *set* to those values through this form — add the missing poplist entries or confirm this is an intentional soft-launch restriction |

---

### Layer Summary — Data Layer (Schema DDL: Tables, Views, Sequences)

- Technologies confirmed this chunk: Oracle DB 19c DDL (Active-core, all 30 tables), virtual/generated columns (Active-core), CONNECT BY hierarchical queries (Active-core, single use), sequence caching strategy (Active-core), PKG_AUDIT (Active-core, inferred backing table now identified — still internally unverified), PKG_EMPLOYEE.generate_emp_number (Active-core, new concurrency defect surfaced)
- Patterns found this chunk: AP-14 through AP-21 (8)
- NFR entries added this chunk: NFR-01 through NFR-03 (3)
- Technical debt entries added this chunk: TD-20 through TD-32 (13) — includes 4 Critical severity items
- Agent 1 LOW CONFIDENCE items resolved: None fully resolved (PKG_AUDIT, PKG_EMPLOYEE, PKG_NOTIFICATION internals remain unscanned); Batch 1's EMPLOYEE_HISTORY finding (TD-11/TD-12) is independently **corroborated** from the table-owner side — the DDL's actual column set and `CHK_CHANGE_TYPE` list exactly match what Batch 1 inferred from the trigger side, upgrading that finding from single-source to cross-confirmed
- New LOW CONFIDENCE items raised: PKG_AUDIT's parameter-to-column mapping (TD-26); PKG_NOTIFICATION dispatcher existence/retry-limit logic for NOTIFICATION_QUEUE (no package scanned in either batch); EMPLOYEE_BANK_ACCOUNTS' split-deposit waterfall algorithm (implied by DEPOSIT_TYPE/PRIORITY_ORDER columns, not evidenced in any scanned code)
- DISCREPANCIES with Agent 1 found: None new this chunk beyond the Batch 1 items now corroborated
- Cross-layer dependencies to carry to Synthesis: TD-20/TD-21/TD-22 (three separate confirmed seed-vs-DDL mismatches) belong together in Stage 6/8 as a single "seed data cannot load" finding class; TD-23 (EMP_NUMBER race condition) and TD-11/TD-12 (Batch 1, EMPLOYEE_HISTORY writes) are the two strongest Critical candidates for the eventual "Highest-priority action item"; AP-19 (PAYROLL_RUNS state machine) feeds Stage 7's Component Interaction Map for the payroll domain

---

## Batch 2 Cumulative Totals (for Synthesis handoff)

- **AP-14 through AP-21** (8 additional patterns; **21 total across both batches**)
- **NFR-01 through NFR-03** (3 total — the only NFRs found across the entire two-batch analysis; both batches confirm the application/infrastructure config layer where most NFRs would normally live is absent from the scanned file set, consistent with Agent 1's Infrastructure Blueprint marking CI/CD and IaC as **NOT FOUND**)
- **TD-20 through TD-32** (13 additional items; **32 total across both batches** — 6 Critical, 8 High, 12 Medium, 3 Low, plus 3 unresolved LOW-confidence dependency items not formally scored)

**Note for Synthesis:** The two strongest Critical-severity candidates remain **TD-11/TD-12** (Batch 1 — `EMPLOYEE_HISTORY` writes are guaranteed to fail on every department/job change, now independently corroborated by this batch's DDL) and **TD-23** (this batch — documented `EMP_NUMBER` generation race condition). TD-20/TD-21/TD-22 (seed script failures) are also Critical but lower-impact (one-time data-load failures vs. TD-11/TD-12's every-transaction failure and TD-23's ongoing concurrency exposure).
