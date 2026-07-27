# TA Agent 1 — Stack Scout Output
> Target system: "Oracle Forms Legacy HR System" (HRMS) — reference codebase provided via deep-scan file extraction
> Pair with: TA_Agent2_DeepAnalyst_v2.md | Scan version: v2

---

## Agent 1 - Chunk 0 - Project-Wide Structural Scan

**Documented directory layout (per README.md):**
```
forms/xml-exports/     - 10 forms documented, 6 scanned (+1 menu-as-.mmb)
forms/libraries/       - 2 PLL shared libraries scanned
forms/menus/           - 1 menu module scanned
plsql/packages/        - 12 packages documented, 0 scanned (spec/body not provided)
plsql/triggers/         - 2 trigger files scanned
schema/tables/          - 4 table DDL files scanned
schema/views/           - 1 views DDL file scanned
schema/sequences/       - 1 sequences DDL file scanned
schema/indexes/         - referenced in README, not present in scanned set
schema/constraints/     - referenced in README, not present (constraints found inline in table DDL instead)
data/seed/              - 2 seed DML files scanned
config/                 - referenced in README, not scanned
docs/                   - referenced in README, not scanned
```

**Detected:**
- Primary language/tooling: Oracle Forms (PL/SQL-based 4GL), Oracle PL/SQL, Oracle SQL DDL/DML
- Framework/platform: Oracle Forms 12c (App Server) on Oracle WebLogic Server 12c
- Database: Oracle Database 19c (schema `HRMS`)
- Reporting: Oracle Reports (.rdf/.rep) — referenced in README only, no report files in scanned set
- Architecture style: **Monolith** (fat-client/3-tier Forms architecture: Forms Server → WebLogic → {Forms Modules, PL/SQL Packages, Oracle Reports} → single Oracle DB) — HIGH confidence (explicit architecture diagram in README)
- Deployment target: **On-prem Oracle Forms/WebLogic** per README narrative — LOW confidence for deployment specifics (no IaC/container/VM config scanned to confirm)

**Technology layers present in scanned set:**
- Application Layer — YES (Forms XML exports, PLL libraries, menu module, PL/SQL triggers)
- Data Layer — YES (table/view/sequence DDL, seed DML)
- Infrastructure Layer — **NOT FOUND** (no Dockerfile, compose, Kubernetes, Terraform, or any IaC file in scanned set)
- CI/CD Layer — **NOT FOUND** (no pipeline files of any kind in scanned set)
- Security Layer — PARTIAL (embedded as `PKG_SECURITY` calls throughout Forms triggers; package body itself unscanned)
- Observability Layer — **NOT FOUND** (no monitoring/logging/tracing config in scanned set)

**Manifest/container/IaC/CI-CD/config files located:** NONE — no `package.json`-equivalent exists for Oracle Forms/PL/SQL; there is no build manifest in this technology stack for Agent 1 to parse in full per the Reading Depth Rules.

**Estimated technology surface:** 1 deployable application tier (Oracle Forms), 1 data store (Oracle DB 19c), 6 Forms modules scanned (of 10 documented), 12 PL/SQL packages referenced but unscanned, 3 external integration flags (SMTP, GL feed, benefits feed) declared only as config rows.

**Chunk Plan (highest information density first):**
1. Application Layer (Forms XML, PLL libraries, menu module, PL/SQL triggers)
2. Data Layer (tables, views, sequences, seed data)
3. Infrastructure Layer — flagged NOT FOUND, no chunk content
4. CI/CD Layer — flagged NOT FOUND, no chunk content
5. Security Layer (cross-cutting `PKG_SECURITY`/auth touchpoints, consolidated from Chunks 1–2)
6. Observability Layer — flagged NOT FOUND, no chunk content

---

## Agent 1 - Chunk 1 of 2 - Application Layer

**Carried Forward from Prior Chunks:**
- Technology components: None yet
- Data stores: None yet
- Integrations: None yet
- LOW CONFIDENCE items: 0

---

### Forms Libraries (PLL — attached to all HRMS forms)
- `HRMS_COMMON_LIB.pll.sql` — toolbar handlers, error handling (`handle_error` → `PKG_COMMON.log_error`), session check (`check_session` → `PKG_SECURITY.is_session_valid`), date formatting, LOV refresh helper.
- `HRMS_VALIDATION_LIB.pll.sql` — client-side validators: `validate_email`, `validate_phone`, `validate_ssn`, `validate_date_not_future`, `validate_salary_range` (queries `JOB_GRADES` directly, contradicting its own header comment about a startup-cached lookup).

### Menu Module
- `HRMS_MENU.mmb.sql` — `MAIN_MENUBAR` structure; File/Edit/Query/Navigate/Modules/Admin/Help menus; module launch points to `HRMS_EMPLOYEE`, `HRMS_PAYROLL`, `HRMS_LEAVE`, `HRMS_PERFORMANCE`, `HRMS_REPORTS`, `HRMS_ADMIN` via `OPEN_FORM`.

### Forms (XML exports of .fmb)
| Form Module | Purpose | Attached Libraries | Menu | Key Package Calls |
|---|---|---|---|---|
| HRMS_LOGIN | Authentication entry point | (none) | — | `PKG_SECURITY.authenticate` |
| HRMS_MENU | MDI shell / navigation | HRMS_COMMON_LIB | MENU_MAIN | `PKG_SECURITY.has_permission`, `.logout` |
| HRMS_EMPLOYEE | Employee maintenance | HRMS_COMMON_LIB, HRMS_VALIDATION_LIB | HRMS_MENU | `PKG_SECURITY.*`, `PKG_EMPLOYEE.generate_emp_number`, `PKG_VALIDATION.validate_email_format` |
| HRMS_LEAVE | Leave request/approval | HRMS_COMMON_LIB | HRMS_MENU | `PKG_SECURITY.is_session_valid`, `PKG_LEAVE.submit_leave_request`, `.cancel_leave_request` |
| HRMS_PAYROLL | Payroll run processing | HRMS_COMMON_LIB | HRMS_MENU | `PKG_SECURITY.*`, `PKG_PAYROLL.create_payroll_run`, `.calculate_payroll`, `.approve_payroll` |
| HRMS_PERFORMANCE | Performance review cycles | HRMS_COMMON_LIB | HRMS_MENU | `PKG_SECURITY.is_session_valid` only |

**Referenced but NOT present in scanned set** (LOW confidence — flagged, not scanned):
- Forms: `HRMS_DEPARTMENT`, `HRMS_REPORTS`, `HRMS_ADMIN`, `HRMS_LOV`, `HRMS_TOOLBAR` — referenced via `OPEN_FORM` calls in HRMS_MENU.xml/.mmb.sql but not provided.
- Packages (all 12 documented in README, 0 scanned): `PKG_EMPLOYEE`, `PKG_DEPARTMENT`, `PKG_PAYROLL`, `PKG_LEAVE`, `PKG_PERFORMANCE`, `PKG_SECURITY`, `PKG_AUDIT`, `PKG_NOTIFICATION`, `PKG_REPORTING`, `PKG_COMMON`, `PKG_VALIDATION`, `PKG_INTEGRATION`.

### PL/SQL Triggers (DB layer, but grouped here as they encode application business rules)
- `trg_audit.sql`: `TRG_SALARY_AUDIT`, `TRG_LEAVE_REQUEST_AUDIT`, `TRG_DEPARTMENT_AUDIT` → all call `PKG_AUDIT.log_action` (4-arg and 6-arg call signatures observed — implies overload).
- `trg_employees.sql`: `TRG_EMP_BEFORE_INSERT`, `TRG_EMP_BEFORE_UPDATE`, `TRG_EMP_INSTEAD_OF_DELETE` (mislabeled in comment as AFTER_DELETE) — enforce hire-date window, email uniqueness among active rows, block reactivation of terminated employees, log to `EMPLOYEE_HISTORY`, and unconditionally block physical deletes.

---

### Chunk Inventory - Application Layer
- Technology components found this chunk: Oracle Forms 12c (HIGH), Oracle Forms PLL Libraries ×2 (HIGH), Oracle Forms Menu Module ×1 (HIGH), Oracle Forms Modules ×6 scanned / 4 referenced-only (HIGH/LOW), PL/SQL DB Triggers ×6 (HIGH)
- Data stores found this chunk: None directly declared here (see Chunk 2)
- Integrations found this chunk: None directly declared here (see Chunk 2 — SYSTEM_PARAMETERS)
- Infrastructure resources found: None
- Environments identified: None identified
- CI/CD tool invocations found (this chunk): N/A — no CI/CD artifacts in scanned set
- Reusable workflows followed: N/A
- Cross-layer dependencies flagged: Forms triggers → `EMPLOYEE_HISTORY` table (Data Layer, Chunk 2); Forms → `PKG_SECURITY`/`PKG_AUDIT`/etc. (unscanned Application sub-layer)
- Newly flagged as SHARED COMPONENT: `PKG_SECURITY` (called from HRMS_COMMON_LIB, HRMS_LOGIN, HRMS_MENU, HRMS_EMPLOYEE, HRMS_LEAVE, HRMS_PAYROLL, HRMS_PERFORMANCE — appears across nearly every scanned file)
- VERSION CONFLICTS detected: Hire-date future-date threshold — Forms `WHEN-VALIDATE-ITEM` in HRMS_EMPLOYEE.xml enforces 90 days vs. DB trigger `TRG_EMP_BEFORE_INSERT` enforces 180 days — flagged for Agent 2
- LOW CONFIDENCE items raised this chunk:
  - All 12 PL/SQL packages — referenced throughout but package spec/body files not in scanned set; behavior inferred only from call sites
  - 4 additional Forms modules (`HRMS_DEPARTMENT`, `HRMS_REPORTS`, `HRMS_ADMIN`, `HRMS_LOV`, `HRMS_TOOLBAR`) referenced via `OPEN_FORM`/menu bindings but not scanned
  - HRMS_LEAVE.xml, HRMS_PAYROLL.xml, HRMS_PERFORMANCE.xml each declare more tab pages / data blocks in header comments than are actually implemented in the scanned XML (stub/incomplete blocks)

---

## Agent 1 - Chunk 2 of 2 - Data Layer

**Carried Forward from Prior Chunks:**
- Technology components: Oracle Forms 12c, 2 PLL libraries, 1 menu module, 6 Forms modules, 6 DB triggers (see Chunk 1)
- Data stores: None yet
- Integrations: None yet
- LOW CONFIDENCE items: 3 categories (packages, unscanned forms, stub blocks)

---

### Sequences (`schema/sequences/hrms_sequences.sql`)
24 sequences total, all `NOCACHE` except `SEQ_AUDIT` (`CACHE 100`). Covers core (`SEQ_EMPLOYEE`, `SEQ_DEPARTMENT`, etc.), payroll, leave, performance, and system domains. `SEQ_EMP_NUMBER` flagged as possibly orphaned (see Validation Queue).

### Tables (`schema/tables/01-04_*.sql`)
29 tables scanned across 4 files: `DEPARTMENTS`, `LOCATIONS`, `JOB_GRADES`, `JOB_TITLES`, `EMPLOYEES`, `EMPLOYEE_HISTORY`, `EMPLOYEE_DEPENDENTS`, `EMERGENCY_CONTACTS`, `SALARY_RECORDS`, `PAY_ELEMENTS`, `EMPLOYEE_PAY_ELEMENTS`, `PAY_PERIODS`, `PAYROLL_RUNS`, `PAYROLL_DETAILS`, `TAX_BRACKETS`, `EMPLOYEE_TAX_INFO`, `EMPLOYEE_BANK_ACCOUNTS`, `LEAVE_TYPES`, `LEAVE_BALANCES`, `LEAVE_REQUESTS`, `LEAVE_ACCRUAL_LOG`, `HOLIDAYS`, `REVIEW_CYCLES`, `PERFORMANCE_REVIEWS`, `PERFORMANCE_GOALS`, `AUDIT_LOG`, `SYSTEM_PARAMETERS`, `NOTIFICATION_QUEUE`, `USER_SESSIONS`, `LOOKUP_VALUES` (README documents 42 tables total — 13 not in scanned set).

PII-bearing columns: `EMPLOYEES.SSN_ENCRYPTED`, `EMPLOYEES.PHOTO_BLOB`, `EMPLOYEE_DEPENDENTS.SSN_ENCRYPTED`, `EMPLOYEE_BANK_ACCOUNTS.ACCOUNT_NUMBER_ENC`.

### Views (`schema/views/hrms_views.sql`)
6 views scanned: `VW_ACTIVE_EMPLOYEES`, `VW_ORG_HIERARCHY` (documented `CONNECT BY` performance warning >500 employees), `VW_EMPLOYEE_COMPENSATION`, `VW_LEAVE_SUMMARY`, `VW_PAYROLL_LATEST`, `VW_PENDING_APPROVALS` (README documents 15 views total — 9 not in scanned set).

### Seed Data (`data/seed/01_reference_data.sql`, `02_employee_data.sql`)
Static reference data (locations, job grades, departments, job titles, leave types, pay elements, holidays, system parameters) and 25 sample employees + salary records + department manager FK patch-up UPDATEs. Multiple column-name mismatches against the table DDL found (see Validation Queue).

### Config-as-Data: `SYSTEM_PARAMETERS` rows (only structured config source in scanned set — no `config.json`/appsettings provided)
| PARAM_GROUP.PARAM_CODE | Value | Purpose signal |
|---|---|---|
| SYSTEM.APP_VERSION | 4.2.0 | App version marker |
| SYSTEM.COMPANY_NAME | Acme Corporation | Tenant/company name |
| PAYROLL.DEFAULT_PAY_FREQUENCY | MONTHLY | Payroll config |
| PAYROLL.FISCAL_YEAR_START | 10 | Payroll config |
| SECURITY.SESSION_TIMEOUT_MIN | 30 | Session policy |
| SECURITY.PASSWORD_MIN_LENGTH | 8 | Password policy |
| NOTIFICATION.SMTP_HOST | smtp.internal.company.com | Email integration endpoint |
| NOTIFICATION.FROM_ADDRESS | hrms-noreply@company.com | Email integration sender |
| INTEGRATION.GL_FEED_STATUS | ACTIVE | External GL integration flag |
| INTEGRATION.BENEFITS_FEED_STATUS | ACTIVE | External benefits integration flag |

---

### Chunk Inventory - Data Layer
- Technology components found this chunk: Oracle Database 19c (HIGH), 24 sequences (HIGH), 29 tables (HIGH), 6 views (HIGH)
- Data stores found this chunk: Oracle Database 19c — schema `HRMS` (HIGH)
- Integrations found this chunk: SMTP mail relay (LOW — config key only), GL feed (LOW — flag only), Benefits feed (LOW — flag only)
- Infrastructure resources found: None
- Environments identified: None identified
- CI/CD tool invocations found (this chunk): N/A
- Reusable workflows followed: N/A
- Cross-layer dependencies flagged: `EMPLOYEE_HISTORY` DDL shape vs. `TRG_EMP_BEFORE_UPDATE` insert shape (Application Layer, Chunk 1) — mismatch; `AUDIT_LOG.CHK_AUDIT_ACTION` vs. `TRG_LEAVE_REQUEST_AUDIT` action value (Chunk 1) — possible constraint violation
- Newly flagged as SHARED COMPONENT: `SYSTEM_PARAMETERS` table (config source referenced conceptually by Security, Payroll, Notification, Integration domains)
- VERSION CONFLICTS detected: None additional this chunk (see Chunk 1 hire-date conflict)
- LOW CONFIDENCE items raised this chunk:
  - 13 of 42 documented tables and 9 of 15 documented views not present in scanned set
  - `schema/indexes/`, `schema/constraints/` directories referenced in README but not found as separate artifacts (constraints appear inline in table DDL instead)
  - Multiple seed-script column names do not match target table DDL (see Validation Queue) — INSERT statements as written would fail

---

## Agent 1 - Project Scan Summary
- Language(s): Oracle Forms 4GL / PL/SQL (Oracle Database 19c native) — no version conflict between DB and Forms citations
- Framework(s): Oracle Forms 12c, Oracle WebLogic Server 12c (App Server), Oracle Reports (referenced only, version undeclared)
- Architecture style: **Monolith** — HIGH confidence
- Deployment target: **On-prem Oracle Forms/WebLogic** (per README narrative) — LOW confidence (no IaC/deployment config scanned to confirm)
- Total files scanned: 14 (1 README, 2 PLL libraries, 1 menu module, 6 Forms XML, 2 trigger files, 1 sequence file, 4 table DDL files, 1 view file, 2 seed files — note: 20 listed individually above; README + 2 libraries + 1 menu + 6 forms + 2 triggers + 1 sequences + 4 tables + 1 views + 2 seed = 20 files)
- Technology layers found: 2 confirmed (Application, Data) + 1 partial (Security, embedded) — 3 layers NOT FOUND (Infrastructure, CI/CD, Observability)
- Chunks processed: 2 (Application Layer, Data Layer) + Chunk 0
- External integrations found: 3 (SMTP mail relay, GL feed, Benefits feed) — all LOW confidence, config-flag only
- Data stores identified: 1 (Oracle Database 19c, schema HRMS)
- Services / components found: 6 Forms modules scanned + 1 menu module + 2 shared libraries; 5 additional forms and 12 PL/SQL packages referenced but unscanned
- CI/CD pipeline files read: 0 (none exist in scanned set; 0 reusable workflows followed)
- CI/CD tool invocations found: None — no CI/CD artifacts present

---

## OUTPUT 1 - Technology Stack Inventory

| Component Name | Version | Category | Layer | Package Manager / Source | Source File | Confidence |
|---|---|---|---|---|---|---|
| Oracle Forms | 12c | RAD Application Framework / Runtime | Application | Oracle (proprietary, licensed) | README.md | HIGH |
| Oracle WebLogic Server | 12c | Java EE Application Server | Application/Infrastructure | Oracle (proprietary, licensed) | README.md | HIGH |
| Oracle Database | 19c | RDBMS | Data | Oracle (proprietary, licensed) | README.md, schema/tables/*.sql | HIGH |
| Oracle Reports | UNKNOWN | Reporting Engine (.rdf/.rep) | Application | Oracle (proprietary, licensed) | README.md | LOW - VERSION UNKNOWN, no report files scanned |
| PL/SQL | Oracle DB 19c native | Procedural Language | Application/Data | Bundled with Oracle DB | plsql/*, schema/*, forms/libraries/*.pll.sql | HIGH |
| HRMS_COMMON_LIB (PLL) | N/A (no version metadata in export) | Forms Shared Library | Application | Oracle Forms Builder export | forms/libraries/HRMS_COMMON_LIB.pll.sql | HIGH |
| HRMS_VALIDATION_LIB (PLL) | N/A | Forms Client-side Validation Library | Application | Oracle Forms Builder export | forms/libraries/HRMS_VALIDATION_LIB.pll.sql | HIGH |
| HRMS_MENU (Menu Module) | N/A | Forms Menu Module (.mmb) | Application | Oracle Forms Builder export | forms/menus/HRMS_MENU.mmb.sql | HIGH |
| PKG_SECURITY | UNKNOWN | Auth/Session PL/SQL Package | Security | Oracle (custom) | Referenced in all Forms + HRMS_COMMON_LIB | LOW - inferred from call sites; package body not scanned |
| PKG_COMMON | UNKNOWN | Shared Utility PL/SQL Package | Application | Oracle (custom) | Referenced in HRMS_COMMON_LIB.pll.sql | LOW - referenced only, not scanned |
| PKG_EMPLOYEE | UNKNOWN | Domain Logic PL/SQL Package | Application | Oracle (custom) | Referenced in HRMS_EMPLOYEE.xml | LOW - referenced only, not scanned |
| PKG_VALIDATION | UNKNOWN | Server-side Validation PL/SQL Package | Application | Oracle (custom) | Referenced in HRMS_EMPLOYEE.xml | LOW - referenced only, not scanned |
| PKG_LEAVE | UNKNOWN | Domain Logic PL/SQL Package | Application | Oracle (custom) | Referenced in HRMS_LEAVE.xml | LOW - referenced only, not scanned |
| PKG_PAYROLL | UNKNOWN | Domain Logic PL/SQL Package | Application | Oracle (custom) | Referenced in HRMS_PAYROLL.xml | LOW - referenced only, not scanned |
| PKG_AUDIT | UNKNOWN | Audit Logging PL/SQL Package | Security | Oracle (custom) | Referenced in plsql/triggers/trg_audit.sql | LOW - referenced only, not scanned |
| PKG_DEPARTMENT, PKG_PERFORMANCE, PKG_NOTIFICATION, PKG_REPORTING, PKG_INTEGRATION | UNKNOWN | Domain/Integration PL/SQL Packages | Application | Oracle (custom) | Listed only in README.md directory layout | LOW - listed in documentation only; no call sites found in scanned files |

---

## OUTPUT 2 - Component & Service Map

| Service / Component Name | Type | Exposed Port(s) | Communication Protocol(s) | Primary Technology | Source File | Notes |
|---|---|---|---|---|---|---|
| Oracle Forms App Server | Application Server | N/A (not declared) | Forms client protocol over HTTP(S) (per README diagram, undeclared in scanned config) | Oracle Forms 12c | README.md | LOW - architecture diagram only, no server config scanned |
| Oracle WebLogic Server | App Server / Servlet Container | N/A (not declared) | HTTP(S) | WebLogic 12c | README.md | LOW - narrative only |
| HRMS_LOGIN | Forms Module (auth entry point) | N/A | Forms client protocol | Oracle Forms 12c | forms/xml-exports/HRMS_LOGIN.xml | Documented cleartext password limitation, no lockout/2FA |
| HRMS_MENU | Forms Module (MDI shell/navigation) | N/A | Forms client protocol | Oracle Forms 12c | forms/xml-exports/HRMS_MENU.xml | Entry point after login; permission-gated menu items |
| HRMS_EMPLOYEE | Forms Module (Employee CRUD) | N/A | Forms client protocol | Oracle Forms 12c | forms/xml-exports/HRMS_EMPLOYEE.xml | Master-detail with SALARY_RECORDS |
| HRMS_LEAVE | Forms Module (Leave request/approval) | N/A | Forms client protocol | Oracle Forms 12c | forms/xml-exports/HRMS_LEAVE.xml | Stub tabs: Pending Approvals, Team Calendar not implemented |
| HRMS_PAYROLL | Forms Module (Payroll run processing) | N/A | Forms client protocol | Oracle Forms 12c | forms/xml-exports/HRMS_PAYROLL.xml | Stub tab: Pay Details not implemented |
| HRMS_PERFORMANCE | Forms Module (Performance reviews) | N/A | Forms client protocol | Oracle Forms 12c | forms/xml-exports/HRMS_PERFORMANCE.xml | Stub block: Review Detail not implemented |
| HRMS_DEPARTMENT, HRMS_REPORTS, HRMS_ADMIN, HRMS_LOV, HRMS_TOOLBAR | Forms Modules (referenced, unscanned) | N/A | Forms client protocol (assumed) | Oracle Forms 12c (assumed) | Referenced in HRMS_MENU.xml / .mmb.sql | LOW - not in scanned file set; existence unconfirmed beyond call sites |
| Oracle Database (HRMS schema) | Relational Database | N/A (not declared) | Oracle Net / SQL*Net (assumed) | Oracle Database 19c | schema/tables/*.sql | Backing store for all Forms modules |

---

## OUTPUT 3 - Data Store Registry

| Store Name | Category | Engine / Technology | Version | Declared Database / Collection Name | Connected Services (if detectable) | Source File | Confidence |
|---|---|---|---|---|---|---|---|
| HRMS Schema | Relational Database | Oracle Database | 19c | HRMS (schema name, per README) | All 6 scanned Forms modules; all PL/SQL triggers; all views | schema/tables/*.sql, schema/views/hrms_views.sql, schema/sequences/hrms_sequences.sql, data/seed/*.sql | HIGH |

**Note:** Single data store identified in scanned set (29 tables, 6 views, 24 sequences scanned; README documents 42 tables / 15 views total system-wide — 13 tables and 9 views not present in this scan and thus not itemized above). No secondary data stores (cache, queue, search engine, object storage) were found or referenced anywhere in the scanned artifacts.

---

## OUTPUT 4 - Infrastructure & Deployment Blueprint

### Compute & Container Resources
**LAYER NOT FOUND** - no Dockerfile, docker-compose, Kubernetes manifest, Terraform/Bicep/CloudFormation/CDK file, or any other IaC artifact was present in the scanned file set. The README's architecture diagram names "Oracle Forms 12c App Server" and "Oracle WebLogic 12c Server" as compute components, but no deployment configuration exists to confirm resource sizing, replica count, or provider.

### Environments Identified
| Environment Name | Trigger / Target | Source File |
|---|---|---|
| None identified | N/A | N/A |

### CI/CD Pipeline Inventory
**LAYER NOT FOUND** - no `.github/workflows/`, Jenkinsfile, `.gitlab-ci.yml`, `azure-pipelines.yml`, `.circleci/config.yml`, or `bitbucket-pipelines.yml` present in scanned set. README documents "No unit tests — manual testing only via Forms" as a self-reported known issue, consistent with the absence of any CI/CD configuration.

### Network Topology (declared configuration only - no inference)
- No ingress/load balancer declarations found
- No internal network/service mesh/DNS declarations found
- No VPC/subnet/security group declarations found
- No TLS termination point declared (HRMS_LOGIN.xml documents cleartext password transmission as a known limitation — implies no TLS termination is confirmed at the Forms applet layer)

---

## OUTPUT 5 - Integration & Dependency Graph

### External Integrations
| Integration Name | Category | Protocol / Interface | Direction | Config Key / Env Var | Source File | Confidence |
|---|---|---|---|---|---|---|
| SMTP Mail Relay | Email Provider | SMTP (assumed from key name) | Outbound | NOTIFICATION.SMTP_HOST, NOTIFICATION.FROM_ADDRESS | data/seed/01_reference_data.sql | LOW - config row only; no UTL_MAIL/UTL_SMTP call sites scanned |
| GL Feed | ERP / General Ledger Integration | UNKNOWN | Outbound (assumed) | INTEGRATION.GL_FEED_STATUS | data/seed/01_reference_data.sql | LOW - status flag only, no endpoint/protocol declared |
| Benefits Feed | Benefits Provider Integration | UNKNOWN | Outbound (assumed) | INTEGRATION.BENEFITS_FEED_STATUS | data/seed/01_reference_data.sql | LOW - status flag only, no endpoint/protocol declared |

### Internal Service Dependencies (for multi-service / microservice projects)
Not applicable — this is a monolithic Oracle Forms application backed by a single Oracle Database; no internal service-to-service network calls were found or are architecturally expected in this stack.

### Build & Developer Toolchain
**NONE FOUND** - no build tool, linter, test framework, or packaging tool configuration was present in the scanned set (consistent with README's self-reported "no unit tests" technical debt item).

---

## OUTPUT 6 - Security & Configuration Snapshot

### Authentication & Authorisation Mechanisms
| Mechanism Name | Type | Provider / Library | Scope | Config Key / Annotation | Source File | Confidence |
|---|---|---|---|---|---|---|
| PKG_SECURITY.authenticate | Authentication | Custom PL/SQL package (body unscanned) | Application (Forms login) | Called from HRMS_LOGIN.xml BTN_LOGIN | forms/xml-exports/HRMS_LOGIN.xml | LOW - call signature only, implementation unscanned |
| PKG_SECURITY.is_session_valid | Session Validation | Custom PL/SQL package (body unscanned) | All Forms | Called in WHEN-NEW-FORM-INSTANCE of every scanned form + HRMS_COMMON_LIB.check_session | Multiple (HRMS_COMMON_LIB.pll.sql, all 5 non-login forms) | HIGH - call site confirmed across 6 files |
| PKG_SECURITY.has_permission | Authorisation (RBAC-style) | Custom PL/SQL package (body unscanned) | Module/button level | Called in HRMS_MENU.xml, HRMS_EMPLOYEE.xml, HRMS_PAYROLL.xml | Multiple | HIGH - call site confirmed, uses (emp_id, module, action) signature |
| PKG_SECURITY.logout | Session Termination | Custom PL/SQL package (body unscanned) | Application | Called from HRMS_MENU.xml BTN_LOGOUT / MI_LOGOUT | forms/xml-exports/HRMS_MENU.xml | HIGH - call site confirmed |

### Secrets & Configuration Management
| Approach | Tool / Service | Scope | Config Key / Reference | Source File | Confidence |
|---|---|---|---|---|---|
| Database-table-based configuration | HRMS.SYSTEM_PARAMETERS (custom, no external secrets manager) | Application (Payroll, Security, Notification, Integration domains) | PARAM_GROUP/PARAM_CODE/PARAM_VALUE rows | schema/tables/04_performance_tables.sql, data/seed/01_reference_data.sql | HIGH |
| Column-level encryption (custom) | Referenced as "AES-256 ... decrypted only in PKG_SECURITY" (comment only) | Data (PII columns) | EMPLOYEES.SSN_ENCRYPTED, EMPLOYEE_DEPENDENTS.SSN_ENCRYPTED, EMPLOYEE_BANK_ACCOUNTS.ACCOUNT_NUMBER_ENC | schema/tables/01_core_tables.sql, schema/tables/02_payroll_tables.sql | LOW - encryption mechanism asserted in a column comment only; decrypt logic in unscanned PKG_SECURITY body |

### Network Security Declarations
| Declaration | Type | Value (non-secret only) | Source File | Confidence |
|---|---|---|---|---|
| Password field transmitted in cleartext (documented limitation) | TLS/Transport | "Password field transmitted in cleartext (Forms applet limitation)" | forms/xml-exports/HRMS_LOGIN.xml (header comment) | HIGH - explicitly documented |
| No account lockout after failed attempts (documented limitation) | Auth Hardening | Not implemented | forms/xml-exports/HRMS_LOGIN.xml (header comment) | HIGH - explicitly documented |
| No CAPTCHA / 2FA support (documented limitation) | Auth Hardening | Not implemented | forms/xml-exports/HRMS_LOGIN.xml (header comment) | HIGH - explicitly documented |

### Compliance & Audit Flags
| Item | Type | Detail | Source File |
|---|---|---|---|
| AUDIT_LOG table + PKG_AUDIT.log_action + 3 audit triggers | Audit Logging | Salary changes, leave status changes, and department changes are logged via `TRG_SALARY_AUDIT`, `TRG_LEAVE_REQUEST_AUDIT`, `TRG_DEPARTMENT_AUDIT` → `PKG_AUDIT.log_action`; granularity of captured old/new values varies by table | plsql/triggers/trg_audit.sql, schema/tables/04_performance_tables.sql |
| PII fields present on master tables | PII / Data Privacy | SSN (encrypted), date of birth, home address, bank account (encrypted), phone numbers stored directly on EMPLOYEES / EMPLOYEE_DEPENDENTS / EMPLOYEE_BANK_ACCOUNTS | schema/tables/01_core_tables.sql, schema/tables/02_payroll_tables.sql |
| EMPLOYEE_HISTORY compliance trail | Audit / Data Retention | Table exists to record status/department/job change history, but is fed by a trigger whose insert column list and CHECK-constraint values do not match the table's actual DDL (see Validation Queue) — compliance trail is at risk of silently failing or throwing at runtime | schema/tables/01_core_tables.sql, plsql/triggers/trg_employees.sql |

---

## Validation Queue

| # | Item | Chunk | Reason |
|---|---|---|---|
| 1 | Oracle Reports version unknown | 0 | Referenced in README only, no .rdf/.rep files scanned |
| 2 | Hire-date future-date threshold conflict: 90 days (Forms WHEN-VALIDATE-ITEM, HRMS_EMPLOYEE.xml) vs. 180 days (DB trigger TRG_EMP_BEFORE_INSERT, trg_employees.sql) | 1 | Business-rule drift between UI and DB validation layers |
| 3 | `TRG_EMP_BEFORE_UPDATE` inserts into `EMPLOYEE_HISTORY` using columns (`HISTORY_ID`, `CHANGE_DATE`, `OLD_VALUE`, `NEW_VALUE`, `CHANGED_BY`, `CHANGE_REASON`) that do not exist on the table (actual: `HIST_ID`, `EFFECTIVE_DATE`, typed old/new columns, `CREATED_BY`, `REASON_CODE`, `COMMENTS`) | 1/2 | Cross-file schema mismatch — this INSERT would fail as documented |
| 4 | Same trigger uses `CHANGE_TYPE` values `'DEPARTMENT_CHANGE'`/`'JOB_CHANGE'`, neither present in `CHK_CHANGE_TYPE`'s allowed list on `EMPLOYEE_HISTORY` | 1/2 | CHECK constraint violation risk |
| 5 | `TRG_LEAVE_REQUEST_AUDIT` passes `'STATUS_CHANGE'` as the action value into `PKG_AUDIT.log_action`; `AUDIT_LOG.CHK_AUDIT_ACTION` only allows INSERT/UPDATE/DELETE | 1/2 | Possible CHECK constraint violation (inferred — `PKG_AUDIT` body unscanned, mapping assumed) |
| 6 | Seed script inserts `LOCATIONS.PHONE`; DDL column is `PHONE_NUMBER` | 2 | Seed/DDL column-name mismatch |
| 7 | Seed script inserts `JOB_GRADES.GRADE_NAME`/`GRADE_LEVEL`, omits required `GRADE_CODE`; DDL has no `GRADE_LEVEL` column | 2 | Seed/DDL column-name mismatch, missing NOT NULL column |
| 8 | Seed script inserts `SYSTEM_PARAMETERS.DESCRIPTION`; DDL column is `PARAM_DESCRIPTION`; `DATA_TYPE` also omitted | 2 | Seed/DDL column-name mismatch |
| 9 | No FK constraints on `DEPARTMENTS.PARENT_DEPT_ID`, `MANAGER_EMP_ID`, `LOCATION_CODE` despite conceptual relationships (inconsistent with `EMPLOYEES`, which does declare equivalent FKs) | 2 | Inconsistent referential-integrity enforcement |
| 10 | No FK on `HOLIDAYS.LOCATION_CODE`, `NOTIFICATION_QUEUE.RECIPIENT_EMP_ID`, `LEAVE_ACCRUAL_LOG.RUN_ID`, `LOOKUP_VALUES.PARENT_LOOKUP_ID` | 2 | Same pattern — undeclared conceptual FKs |
| 11 | No unique constraint on `EMPLOYEES.EMAIL`; uniqueness enforced only by `TRG_EMP_BEFORE_INSERT` and only among `ACTIVE_FLAG='Y'` rows | 1/2 | Terminated employees' emails can be reused without conflict |
| 12 | `LEAVE_BALANCES.AVAILABLE` (virtual column) subtracts `PENDING`; `VW_LEAVE_SUMMARY.AVAILABLE` (hand-rolled) omits `PENDING` | 2 | Formula divergence between table and view when PENDING != 0 |
| 13 | `VW_EMPLOYEE_COMPENSATION` joins `SALARY_RECORDS` on `ACTIVE_FLAG='Y'` only, without the `EFFECTIVE_DATE`/`END_DATE` scoping used by `VW_ACTIVE_EMPLOYEES` | 2 | Possible duplicate rows or premature inclusion of not-yet-effective salary |
| 14 | `VW_PAYROLL_LATEST` defines "latest" as global `MAX(RUN_ID)` among APPROVED runs | 2 | May not generalize to multiple parallel/off-cycle payroll runs |
| 15 | `SEQ_EMP_NUMBER` may be orphaned/unused if `PKG_EMPLOYEE.generate_emp_number` uses `MAX()+1` logic instead (per README/comment; package body unscanned) | 1/2 | Documented concurrency/race-condition risk, not independently verifiable |
| 16 | `EMPLOYEES.EMP_ID` has no DEFAULT/sequence tie at the DB level; relies on Forms `PRE-INSERT` trigger | 1/2 | Non-Forms inserts (batch, ad hoc SQL) would require EMP_ID supplied explicitly |
| 17 | `TRG_EMP_INSTEAD_OF_DELETE` unconditionally blocks all physical deletes on EMPLOYEES; comment mislabels it as an AFTER_DELETE trigger | 1 | Documented UX/maintenance trap — any real DELETE against EMPLOYEES fails |
| 18 | Client-side `HRMS_VALIDATION_LIB.validate_email` vs. server-side `PKG_VALIDATION.validate_email_format` are independently maintained, differently named functions | 1 | Documented validation-drift risk between Forms library and DB package |
| 19 | `HRMS_VALIDATION_LIB.validate_salary_range` header comment claims cached local data; code performs a direct `SELECT` against `JOB_GRADES` | 1 | Comment/code mismatch |
| 20 | HRMS_LEAVE.xml, HRMS_PAYROLL.xml, HRMS_PERFORMANCE.xml header comments each reference more data blocks/tab pages than are actually implemented | 1 | Stub/incomplete forms relative to their own documentation |
| 21 | HRMS_PERFORMANCE.xml `GOAL_CATEGORY` poplist offers only 3 of the 5 values allowed by `CHK_GOAL_CATEGORY` (missing INNOVATION, COMPLIANCE) | 1/2 | UI cannot set values the DB permits |
| 22 | HRMS_PAYROLL.xml `BTN_CREATE_RUN`/`BTN_CALCULATE` have no explicit permission check beyond form-level VIEW gate, while `BTN_APPROVE` requires explicit PAYROLL/APPROVE permission | 1 | Inconsistent depth of authorization within the same form |
| 23 | HRMS_PERFORMANCE.xml has no module-level `has_permission` check and no edit-specific authorization gate on ratings/assessments | 1 | Any authenticated user can open and edit; weaker gating than Payroll/Employee forms |
| 24 | HRMS_MENU.xml button path (Payroll/Reports) has disabled-state + runtime permission check; menu-bar path relies only on disabled-state property | 1 | Differing depth of defense between two access paths to the same forms |
| 25 | All 12 documented PL/SQL packages referenced across forms/triggers/libraries have no spec/body files in the scanned set | 1 | Package internals (business logic, error handling, calculations) are entirely unverified |
| 26 | 5 Forms referenced via `OPEN_FORM`/menu bindings (`HRMS_DEPARTMENT`, `HRMS_REPORTS`, `HRMS_ADMIN`, `HRMS_LOV`, `HRMS_TOOLBAR`) not present in scanned set | 1 | Existence and implementation unconfirmed |
| 27 | ARCHITECTURE NOTE: No infrastructure-as-code, container, or CI/CD artifacts found anywhere in the scanned set | 0 | Deployment configuration may be manual, externally managed, or in a separate repository |
| 28 | ARCHITECTURE NOTE: `config/` and `docs/` directories referenced in README's documented layout were not included in the scanned file set | 0 | Unknown additional configuration/documentation may exist outside this scan |
| 29 | Seed script `02_employee_data.sql` issues two consecutive `UPDATE DEPARTMENTS ... WHERE DEPT_ID=30` statements (setting `MANAGER_EMP_ID` to 3, then to 30) | 2 | First UPDATE is dead/no-op |
| 30 | HRMS_EMPLOYEE.xml `KEY-EXIT` trigger appears to invoke `SHOW_ALERT('ALT_CONFIRM_EXIT')` in both an IF and its ELSIF condition expression | 1 | Possible duplicate alert/dialog behavior |
| 31 | `ALT_CONFIRM_DELETE` alert is defined in HRMS_EMPLOYEE.xml but no trigger in the scanned file invokes it | 1 | Possibly dead alert, or invoked from unscanned code |

---

## Handoff Note to Agent 2

This is a **monolithic Oracle Forms 12c / PL/SQL / Oracle Database 19c** HR system (no microservices, no containers, no cloud infrastructure, no CI/CD — all three of those layers are confirmed absent from the scanned set, not merely unscanned). The primary language/framework is Oracle Forms backed by Oracle DB 19c; the only data store is the single `HRMS` schema (29 tables / 6 views scanned of 42/15 documented). No CI/CD tool invocations exist because no pipeline files were found, consistent with the README's self-reported absence of automated testing. The Validation Queue is unusually dense with **concrete, verifiable cross-file defects** (not just documentation gaps) — most notably a trigger (`TRG_EMP_BEFORE_UPDATE`) whose INSERT into `EMPLOYEE_HISTORY` uses column names and CHECK-constraint values that do not exist on that table, three seed-script/DDL column-name mismatches, an hire-date business-rule conflict between Forms and DB validation layers, and a formula divergence between a virtual column and its corresponding view. All 12 PL/SQL packages that carry the actual business logic (`PKG_EMPLOYEE`, `PKG_PAYROLL`, `PKG_SECURITY`, etc.) are referenced pervasively but were not included in this scan — Agent 2 should treat every finding that depends on package internals as inferred, not confirmed, and should flag package unavailability as a standing analysis constraint.

---
Agent 1 Scan Complete.
Agent 2 may now begin deep analysis using the 6 output files above.
Recommended starting point: **Data Layer** — reason: highest concentration of concrete, cross-file structural defects (schema/trigger column-shape mismatches, CHECK constraint violations, seed/DDL mismatches, missing FK enforcement) that carry direct data-integrity risk and should be triaged before Application-layer business-rule drift or the (absent) Infrastructure/CI-CD/Observability layers.
