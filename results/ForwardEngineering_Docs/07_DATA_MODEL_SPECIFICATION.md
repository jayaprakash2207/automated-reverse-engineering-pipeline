# Data Model Specification

## Physical Schema — what is confirmed
- **Database:** Single Oracle schema, 30 tables total (HIGH confidence, DA summary).
- **Confirmed tables:** `EMPLOYEES`, `EMPLOYEE_HISTORY`.
- **Confirmed absent table:** `USER_CREDENTIALS` (or any password/credentials table) — does not exist anywhere in the schema.
- **Confirmed objects:** `PKG_SECURITY`, `PKG_EMPLOYEE`, `PKG_AUDIT` (packages); `TRG_EMP_BEFORE_UPDATE`, `TRG_EMP_INSTEAD_OF_DELETE` (triggers); `SEQ_EMP_NUMBER` (sequence, possible orphan).

## SQL DDL — honesty statement
Per the anti-hallucination rule, **no full CREATE TABLE statement is produced for EMPLOYEES or EMPLOYEE_HISTORY**, because their actual column lists were not included in any of the four provided summaries. Fabricating column names, types, or constraints for a real Oracle table would violate the "never invent facts" rule even though the table names themselves are confirmed. What follows are only the fragments directly evidenced.

```sql
-- CONFIRMED FACTS ONLY — not a runnable/complete DDL

-- EMPLOYEES: full column list MISSING. Known: has an email column (used for auth
-- lookup), has an SSN-bearing column (AES-256 encrypted, key is hard-coded — see
-- security finding), has a hire-date-related column (rule value disputed: 90 vs 180 days).

-- EMPLOYEE_HISTORY: full column list MISSING. Known defect: TRG_EMP_BEFORE_UPDATE's
-- insert into this table has a column-count/column-shape mismatch against the
-- actual table definition, and supplies at least one value that violates a CHECK
-- constraint on this table. Both faults fire on every UPDATE via
-- transfer_employee / promote_employee / terminate_employee / rehire_employee,
-- raising ORA-00904 (invalid column name) and/or ORA-02290 (check constraint violated).

-- USER_CREDENTIALS: CONFIRMED NOT TO EXIST. No password table anywhere in the
-- 30-table schema.
```

## Required remediation (documented, not yet implemented)
1. Reconcile `TRG_EMP_BEFORE_UPDATE`'s insert column list with `EMPLOYEE_HISTORY`'s actual DDL and CHECK constraints.
2. Introduce a genuine credentials table and rewrite `PKG_SECURITY.authenticate()` to verify a password/hash, not just look up by email.
3. Move the AES-256 SSN encryption key out of source code into a secrets manager / wallet.

## What is missing
Full DDL for all 30 tables, all indexes, all foreign keys, all remaining PL/SQL package bodies. See `OQ-006`.