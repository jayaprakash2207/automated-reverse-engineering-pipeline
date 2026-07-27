# Storage Pattern Analysis — HRMS

`db_connection: CODE-ONLY` — see schema-catalogue.json.

## Caching

**No dedicated caching layer exists in this codebase.** This is an Oracle Forms + PL/SQL application, not a service-oriented app — there is no `*/Services*`, `*/Cache*`, or middleware caching class to find. The closest analogue:

- **PKG_EMPLOYEE global package variables** (`g_current_user`, `g_current_emp_id`, `g_current_dept_id`, `g_debug_mode`) act as a session-scoped cache of the authenticated user's identity, populated once by `PKG_EMPLOYEE.set_session_context` at login and read by every subsequent operation in that Forms session — avoiding a re-lookup of "who is logged in" on every call. Lifetime = the PL/SQL session's package state, which persists for the life of the Forms client connection (a single persistent DB session per user, typical of Oracle Forms architecture).
- **No TTL, no cache invalidation, no distributed cache** — this is in-process PL/SQL state, not a cache in the Redis/Memcached sense. There is no caching TTL to document as a business rule (the skill's self-check item "Caching TTL documented as a business rule" does not apply here — flagged as N/A, not skipped).
- The Oracle sequences (see below) use `NOCACHE` almost universally, which is itself a *storage* decision, not a caching-layer one, but worth noting it's the opposite of a caching strategy — every `NEXTVAL` round-trips to the sequence object without a session cache of pre-allocated values, trading a small amount of throughput for gap-free-ish, contention-safe IDs. `SEQ_AUDIT` is the sole exception (`CACHE 100`), an explicit performance decision for the highest-insert-volume table.

## Large object storage

- `EMPLOYEES.PHOTO_BLOB` (BLOB) and `EMPLOYEES.NOTES` (CLOB) are stored **inline on the master employee table**, not in a separate media/attachment table. This couples large-object I/O to every full-row fetch/update of the most frequently accessed table in the system, and has no separate access-control boundary from the rest of the employee record.
- `PERFORMANCE_REVIEWS` stores six separate CLOB columns (SELF_ASSESSMENT, MANAGER_ASSESSMENT, STRENGTHS, AREAS_FOR_IMPROVEMENT, DEVELOPMENT_PLAN, EMPLOYEE_COMMENTS) — free-text narrative fields, appropriately modeled as CLOB rather than bounded VARCHAR2.
- `AUDIT_LOG.OLD_VALUES`/`NEW_VALUES` (CLOB) store hand-built JSON strings (string concatenation in triggers, not `JSON_OBJECT()` or a serializer) — functional for the narrow field sets currently captured, but fragile if extended to fields containing quotes/special characters.

## Denormalization / reporting views

Six views exist purely to pre-join and flatten normalized tables for Forms LOVs and reporting, confirming the README's stated pattern of "denormalized reporting tables refreshed... " — though in this codebase they are live views (computed on query), not materialized/batch-refreshed tables as the README's generic description implies:

- `VW_ACTIVE_EMPLOYEES` — 5-way join (EMPLOYEES, DEPARTMENTS, JOB_TITLES, JOB_GRADES, LOCATIONS) + self-join for manager name + date-scoped join to SALARY_RECORDS.
- `VW_ORG_HIERARCHY` — `CONNECT BY` recursive query, self-documented as degrading past 500 employees.
- `VW_EMPLOYEE_COMPENSATION` — compa-ratio analysis, join to SALARY_RECORDS **without** the date-scoping that VW_ACTIVE_EMPLOYEES uses (data-quality risk, see data-quality-report.md).
- `VW_LEAVE_SUMMARY`, `VW_PAYROLL_LATEST`, `VW_PENDING_APPROVALS` — cross-module aggregation/union views.

## Soft delete pattern

Universal `ACTIVE_FLAG CHAR(1) DEFAULT 'Y'` column on essentially every table, paired with `CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE` audit columns — a consistent, repo-wide convention (confirmed across all 30 tables' DDL). For EMPLOYEES specifically, soft-delete is not just a convention but an enforced hard rule (TRG_EMP_INSTEAD_OF_DELETE blocks physical deletes entirely).

## Surrogate key strategy

Sequence + BEFORE INSERT trigger pattern is standard Oracle Forms practice, but this codebase's implementation of it for EMPLOYEES is split unusually: `SEQ_EMPLOYEE.NEXTVAL` is invoked in the **Forms-side** PRE-INSERT trigger (per prior deep-scan of HRMS_EMPLOYEE.xml), not in the DB-side `TRG_EMP_BEFORE_INSERT`. Since `EMPLOYEES.EMP_ID` has no `DEFAULT` clause in the DDL, any INSERT that bypasses Forms (batch load, another application, ad hoc SQL) must supply `EMP_ID` explicitly or the insert fails — the ID-generation responsibility is entirely client-side, which is atypical and a fragility risk for future integrations.

## Employee-number generation (documented concurrency defect)

`SEQ_EMP_NUMBER` exists as a proper Oracle sequence, but per `schema/sequences/hrms_sequences.sql`'s own documentation comment, `PKG_EMPLOYEE.generate_emp_number` reportedly uses `SELECT MAX(...)+1` logic instead of `SEQ_EMP_NUMBER.NEXTVAL` — a documented race condition where two concurrent employee creations could compute the same next number before either commits. `PKG_EMPLOYEE.generate_emp_number` is confirmed to exist in the package spec (returns VARCHAR2), but its body was not read in this pass, so the MAX()+1 implementation itself is *inferred from the sequence file's comment*, not independently re-confirmed — flagged for Agent 2 to verify against `PKG_EMPLOYEE.pkb`.
