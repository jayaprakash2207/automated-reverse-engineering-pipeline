# Data Dictionary

**Coverage note:** Only 2 of the schema's 30 tables (and 0 columns of either) were named with any specificity in the material provided. This dictionary reflects that limit honestly rather than inventing column lists.

| Table | Columns | Confidence | Evidence |
|---|---|---|---|
| EMPLOYEES | **MISSING** — no column list was provided; existence and role (target of authenticate() email lookup, target of lifecycle-change updates) are confirmed | HIGH (existence) / MISSING (columns) | DA, AA, TA summaries |
| EMPLOYEE_HISTORY | **MISSING** — no column list provided; known only that the trigger's insert has a "column-shape mismatch" against whatever this table's actual DDL is, and that it uses CHECK constraints that reject some inserted values | HIGH (existence, and existence of the defect) / MISSING (columns) | DA, TA summaries |
| USER_CREDENTIALS | N/A — table does not exist | HIGH (confirmed absence) | DA summary |
| (27 additional tables) | **MISSING** — not named in any provided summary | — | — |

## Known field-level facts (not full column lists, but specific attributes referenced)
- EMPLOYEES has an **email** field, used as the sole identifier for authentication. Confidence: HIGH.
- EMPLOYEES (or a related PII store) has an **SSN** field, encrypted with AES-256 using a hard-coded key. Confidence: HIGH.
- A hire-date-related field exists and is subject to a disputed 90-vs-180-day rule. Confidence: HIGH (existence), unresolved (value).
- EMPLOYEE_HISTORY has at least one CHECK constraint whose allowed values are violated by the trigger's own insert. Confidence: HIGH (defect), MISSING (which column, which constraint).

## Required next step
Obtain the full DDL / schema export referenced by the Data Analysis layer (30 tables) before this dictionary can be considered anything beyond a partial stub. See OQ-006.