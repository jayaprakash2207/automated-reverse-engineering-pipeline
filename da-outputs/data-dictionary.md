# Data Dictionary — HRMS (schema HRMS, Oracle 19c)

Confidence 0.9 (DDL-sourced) unless noted. `db_connection: CODE-ONLY`.

## DEPARTMENTS
| Column | Type | Null? | Description |
|---|---|---|---|
| DEPT_ID | NUMBER(10) | NOT NULL (PK) | Surrogate key |
| DEPT_CODE | VARCHAR2(20) | NOT NULL (unique) | Short department code (e.g. 'IT') |
| DEPT_NAME | VARCHAR2(100) | NOT NULL | Full department name |
| PARENT_DEPT_ID | NUMBER(10) | nullable | Self-ref hierarchy parent — **no FK enforced** |
| COST_CENTER | VARCHAR2(20) | nullable | GL cost center code |
| MANAGER_EMP_ID | NUMBER(10) | nullable | Head of department — **no FK enforced** |
| LOCATION_CODE | VARCHAR2(10) | nullable | Primary office — **no FK enforced** |
| ACTIVE_FLAG | CHAR(1) | default 'Y' | Soft-delete flag |
| CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE | — | — | Standard audit columns |

## LOCATIONS
| Column | Type | Null? | Description |
|---|---|---|---|
| LOCATION_CODE | VARCHAR2(10) | NOT NULL (PK, natural key) | Site code (HQ/CHI/SF) |
| LOCATION_NAME | VARCHAR2(100) | NOT NULL | Site display name |
| ADDRESS_LINE1/2 | VARCHAR2(200) | nullable | Street address (PII-adjacent, business address) |
| CITY / STATE_PROVINCE / POSTAL_CODE / COUNTRY_CODE | — | nullable | Address components |
| PHONE_NUMBER | VARCHAR2(30) | nullable | Site phone. **Seed script writes to non-existent column `PHONE`** |
| TIMEZONE | VARCHAR2(50) | default 'America/New_York' | IANA-style timezone string |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | — | Standard |

## JOB_GRADES
| Column | Type | Null? | Description |
|---|---|---|---|
| GRADE_ID | NUMBER(5) | NOT NULL (PK) | Surrogate key |
| GRADE_CODE | VARCHAR2(10) | NOT NULL (unique) | Short grade code. **Seed script omits this required column entirely.** |
| GRADE_NAME | VARCHAR2(50) | NOT NULL | e.g. 'Senior Manager' |
| MIN_SALARY / MAX_SALARY | NUMBER(12,2) | NOT NULL | Salary band (MAX >= MIN enforced) |
| OVERTIME_ELIGIBLE | CHAR(1) | default 'N' | FLSA-adjacent flag |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | — | Standard |

## JOB_TITLES
| Column | Type | Null? | Description |
|---|---|---|---|
| JOB_ID | NUMBER(10) | NOT NULL (PK) | Surrogate key |
| JOB_CODE | VARCHAR2(20) | NOT NULL (unique) | e.g. 'SR-DEV' |
| JOB_TITLE | VARCHAR2(100) | NOT NULL | Display title |
| JOB_FAMILY | VARCHAR2(50) | nullable | Career-track grouping (unused in seed data) |
| GRADE_ID | NUMBER(5) | NOT NULL (FK→JOB_GRADES) | Compensation grade |
| EEO_CATEGORY | VARCHAR2(10) | nullable | EEOC job category code (US compliance reporting) |
| FLSA_STATUS | VARCHAR2(10) | default 'EXEMPT' | Fair Labor Standards Act overtime classification |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | — | Standard |

## EMPLOYEES (master entity)
| Column | Type | Null? | Description |
|---|---|---|---|
| EMP_ID | NUMBER(10) | NOT NULL (PK, no DEFAULT/sequence in DDL) | Surrogate key — must be supplied by caller |
| EMP_NUMBER | VARCHAR2(20) | NOT NULL (unique) | Business-facing employee number (EMP-000001 format) |
| FIRST_NAME / MIDDLE_NAME / LAST_NAME | VARCHAR2(50) | first/last NOT NULL | Name |
| DATE_OF_BIRTH | DATE | nullable | PII |
| GENDER | CHAR(1) | nullable, CHECK M/F/O | Sensitive demographic |
| MARITAL_STATUS | VARCHAR2(10) | nullable | Sensitive demographic |
| NATIONALITY | VARCHAR2(50) | nullable | Sensitive demographic |
| SSN_ENCRYPTED | VARCHAR2(200) | nullable | AES-256 encrypted SSN; decrypted only via PKG_SECURITY.decrypt_ssn |
| EMAIL | VARCHAR2(100) | nullable, **no unique constraint** | Uniqueness enforced only by trigger among active employees |
| PHONE_WORK / PHONE_MOBILE | VARCHAR2(30) | nullable | PII |
| ADDRESS_LINE1/2, CITY, STATE_PROVINCE, POSTAL_CODE, COUNTRY_CODE | — | nullable | Home address, PII |
| HIRE_DATE | DATE | NOT NULL | Employment start |
| TERMINATION_DATE / TERMINATION_REASON | DATE / VARCHAR2(50) | nullable | Set on separation |
| DEPT_ID | NUMBER(10) | NOT NULL (FK→DEPARTMENTS) | Current department |
| JOB_ID | NUMBER(10) | NOT NULL (FK→JOB_TITLES) | Current job title |
| MANAGER_EMP_ID | NUMBER(10) | nullable (FK→EMPLOYEES, self) | Direct manager |
| LOCATION_CODE | VARCHAR2(10) | nullable (FK→LOCATIONS) | Work site |
| EMPLOYMENT_TYPE | VARCHAR2(20) | default 'FULL_TIME', CHECK | FULL_TIME/PART_TIME/CONTRACT/INTERN |
| EMPLOYMENT_STATUS | VARCHAR2(20) | default 'ACTIVE', CHECK | ACTIVE/ON_LEAVE/SUSPENDED/TERMINATED |
| PHOTO_BLOB | BLOB | nullable | Employee photo, PII |
| NOTES | CLOB | nullable | Free-text HR notes |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | — | Standard |

## EMPLOYEE_HISTORY
| Column | Type | Description |
|---|---|---|
| HIST_ID | NUMBER(15) PK | Surrogate key |
| EMP_ID | NUMBER(10) FK→EMPLOYEES | Subject employee |
| CHANGE_TYPE | VARCHAR2(30), CHECK constrained to 10 named values | HIRE/TRANSFER/PROMOTION/DEMOTION/SALARY_CHANGE/TERMINATION/REHIRE/LEAVE_START/LEAVE_END/STATUS_CHANGE |
| EFFECTIVE_DATE | DATE NOT NULL | When the change took effect |
| OLD_DEPT_ID / NEW_DEPT_ID, OLD_JOB_ID / NEW_JOB_ID, OLD_MANAGER_ID / NEW_MANAGER_ID, OLD_SALARY / NEW_SALARY, OLD_LOCATION / NEW_LOCATION | typed pairs | Before/after snapshot per attribute |
| REASON_CODE, COMMENTS | VARCHAR2 | Free-text/coded reason |
| CREATED_BY, CREATED_DATE | — | Standard (no MODIFIED_* — history rows are immutable by design) |
| **Note** | | TRG_EMP_BEFORE_UPDATE writes to this table using a different, incompatible column set — see data-quality-report.md |

## EMPLOYEE_DEPENDENTS
| Column | Type | Description |
|---|---|---|
| DEPENDENT_ID | NUMBER(10) PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Parent employee |
| FIRST_NAME, LAST_NAME | NOT NULL | Dependent's name |
| RELATIONSHIP | VARCHAR2(20), CHECK | SPOUSE/CHILD/PARENT/DOMESTIC_PARTNER/OTHER |
| DATE_OF_BIRTH | DATE | PII |
| SSN_ENCRYPTED | VARCHAR2(200) | Third-party SPI |
| BENEFITS_ENROLLED | CHAR(1) default 'N' | Enrollment flag |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## EMERGENCY_CONTACTS
| Column | Type | Description |
|---|---|---|
| CONTACT_ID | NUMBER(10) PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Employee this contact belongs to |
| CONTACT_NAME | NOT NULL | Third-party PII |
| RELATIONSHIP | VARCHAR2(30) | Free text (not CHECK-constrained, unlike EMPLOYEE_DEPENDENTS) |
| PHONE_PRIMARY | NOT NULL | Third-party PII |
| PHONE_SECONDARY, EMAIL | nullable | Third-party PII |
| PRIORITY_ORDER | NUMBER(2) default 1 | Call order |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## SALARY_RECORDS
| Column | Type | Description |
|---|---|---|
| SALARY_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Subject employee |
| EFFECTIVE_DATE, END_DATE | DATE | Validity window (END_DATE null = currently in effect) |
| BASE_SALARY | NUMBER(12,2) NOT NULL | Sensitive financial PII |
| CURRENCY_CODE | default 'USD' | ISO currency |
| PAY_FREQUENCY | CHECK: WEEKLY/BIWEEKLY/SEMIMONTHLY/MONTHLY | Pay cadence |
| SALARY_BASIS | CHECK: ANNUAL/HOURLY | Rate basis |
| CHANGE_REASON, CHANGE_PCT | — | Reason/percent for this salary change |
| APPROVED_BY, APPROVAL_DATE | — | Approval metadata |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## PAY_ELEMENTS
| Column | Type | Description |
|---|---|---|
| ELEMENT_ID | PK | Surrogate key |
| ELEMENT_CODE | unique | e.g. 'FED_TAX', '401K_EE' |
| ELEMENT_NAME | NOT NULL | Display name |
| ELEMENT_TYPE | CHECK: EARNING/DEDUCTION/TAX/BENEFIT/REIMBURSEMENT | Category |
| CALCULATION_TYPE | CHECK: FLAT/PERCENTAGE/HOURS/FORMULA | How the amount is computed |
| DEFAULT_AMOUNT, DEFAULT_PERCENTAGE | — | Defaults for FLAT/PERCENTAGE types |
| TAXABLE_FLAG, PRETAX_FLAG, EMPLOYER_PAID | CHAR(1) | Tax treatment flags |
| GL_ACCOUNT_CODE | — | General ledger posting account |
| PRIORITY_ORDER | default 100 | Calculation/deduction ordering |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## EMPLOYEE_PAY_ELEMENTS
| Column | Type | Description |
|---|---|---|
| EMP_ELEMENT_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Subject employee |
| ELEMENT_ID | FK→PAY_ELEMENTS | Which element |
| EFFECTIVE_DATE, END_DATE | DATE | Validity window |
| AMOUNT, PERCENTAGE, OVERRIDE_AMOUNT | NUMBER | Employee-specific override values |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## PAY_PERIODS
| Column | Type | Description |
|---|---|---|
| PERIOD_ID | PK | Surrogate key |
| PERIOD_NAME | NOT NULL | Display label |
| PAY_FREQUENCY | NOT NULL | Cadence |
| PERIOD_START_DATE, PERIOD_END_DATE, PAY_DATE | DATE NOT NULL | Period boundaries and pay date |
| STATUS | CHECK: OPEN/PROCESSING/CLOSED/REVERSED | Lifecycle state |
| CLOSED_BY, CLOSED_DATE | — | Close metadata |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## PAYROLL_RUNS
| Column | Type | Description |
|---|---|---|
| RUN_ID | PK | Surrogate key |
| PERIOD_ID | FK→PAY_PERIODS | Which pay period |
| RUN_TYPE | CHECK: REGULAR/SUPPLEMENTAL/BONUS/FINAL | Run category |
| RUN_DATE | NOT NULL | Date the run was executed |
| STATUS | CHECK: PENDING/CALCULATING/CALCULATED/APPROVED/PAID/REVERSED/ERROR | Lifecycle |
| TOTAL_GROSS, TOTAL_DEDUCTIONS, TOTAL_NET, TOTAL_EMPLOYER_COST | NUMBER(15,2) | Aggregate financial totals |
| EMPLOYEE_COUNT, ERROR_COUNT | NUMBER(10) | Run metrics |
| SUBMITTED_BY, SUBMITTED_DATE, APPROVED_BY, APPROVED_DATE | — | Approval workflow metadata |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## PAYROLL_DETAILS
| Column | Type | Description |
|---|---|---|
| DETAIL_ID | PK | Surrogate key |
| RUN_ID | FK→PAYROLL_RUNS | Parent run |
| EMP_ID | FK→EMPLOYEES | Subject employee |
| ELEMENT_ID | FK→PAY_ELEMENTS | Which pay element this line represents |
| ELEMENT_TYPE | NOT NULL | Denormalized copy of PAY_ELEMENTS.ELEMENT_TYPE for fast aggregation |
| HOURS_WORKED, RATE | NUMBER | Hourly detail |
| AMOUNT | NUMBER(12,2) NOT NULL | Line amount (sign convention: earnings positive, taxes/deductions presumed negative — see VW_PAYROLL_LATEST NET_PAY logic) |
| YTD_AMOUNT | NUMBER(15,2) | Year-to-date running total |
| STATUS | default 'CALCULATED' | Line-level processing status |
| ERROR_MESSAGE | VARCHAR2(4000) | Calculation error detail |
| CREATED_BY, CREATED_DATE | — | Standard |

## TAX_BRACKETS
| Column | Type | Description |
|---|---|---|
| BRACKET_ID | PK | Surrogate key |
| TAX_YEAR | NUMBER(4) NOT NULL | Applicable tax year |
| FILING_STATUS | CHECK: SINGLE/MARRIED_JOINT/MARRIED_SEPARATE/HEAD_OF_HOUSEHOLD | Filing status this bracket applies to |
| BRACKET_MIN, BRACKET_MAX | NUMBER(12,2) | Income range |
| TAX_RATE | NUMBER(5,4) NOT NULL | Marginal rate |
| BASE_TAX | default 0 | Base tax for this bracket |
| STATE_CODE | nullable | NULL presumed = federal bracket |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE | — | Standard |

## EMPLOYEE_TAX_INFO
| Column | Type | Description |
|---|---|---|
| TAX_INFO_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Subject employee |
| TAX_YEAR | NUMBER(4) NOT NULL | Unique with EMP_ID (one profile per employee per year) |
| FILING_STATUS | NOT NULL | W-4 filing status |
| FEDERAL_ALLOWANCES, STATE_ALLOWANCES | default 0 | Withholding allowances |
| ADDITIONAL_FED_WH, ADDITIONAL_STATE_WH | default 0 | Extra withholding amounts |
| EXEMPT_FLAG | default 'N' | Tax-exempt status |
| STATE_CODE | — | State for state tax purposes |
| W4_RECEIVED_DATE | — | Compliance/documentation date |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## EMPLOYEE_BANK_ACCOUNTS
| Column | Type | Description |
|---|---|---|
| BANK_ACCT_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Subject employee |
| BANK_NAME | — | Financial PII |
| ROUTING_NUMBER | NOT NULL, plaintext | Financial PII |
| ACCOUNT_NUMBER_ENC | NOT NULL | Encrypted account number (mechanism unconfirmed) |
| ACCOUNT_TYPE | CHECK: CHECKING/SAVINGS | — |
| DEPOSIT_TYPE | CHECK: FULL/PARTIAL_AMOUNT/PARTIAL_PERCENT/REMAINDER | Split-deposit allocation model |
| DEPOSIT_AMOUNT, DEPOSIT_PERCENTAGE | — | Allocation values for PARTIAL types |
| PRIORITY_ORDER | default 1 | Waterfall ordering for multiple accounts |
| PRENOTE_SENT, PRENOTE_DATE | — | ACH pre-note verification tracking |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## LEAVE_TYPES
| Column | Type | Description |
|---|---|---|
| LEAVE_TYPE_ID | PK | Surrogate key |
| LEAVE_TYPE_CODE | unique | PTO/SICK/COMP/FMLA/JURY/BEREAVE |
| LEAVE_TYPE_NAME | NOT NULL | Display name |
| PAID_FLAG | default 'Y' | Whether time is paid |
| ACCRUAL_FLAG, ACCRUAL_RATE, ACCRUAL_FREQUENCY | — | Accrual rule configuration |
| MAX_BALANCE, CARRYOVER_MAX, CARRYOVER_EXPIRY | — | Balance caps/carryover rules |
| MIN_TENURE_DAYS | default 0 | Eligibility gate |
| REQUIRES_APPROVAL, REQUIRES_DOCUMENT | — | Workflow gates |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## LEAVE_BALANCES
| Column | Type | Description |
|---|---|---|
| BALANCE_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Subject employee |
| LEAVE_TYPE_ID | FK→LEAVE_TYPES | Which leave type |
| CALENDAR_YEAR | NOT NULL, unique with EMP_ID+LEAVE_TYPE_ID | Balance year |
| OPENING_BALANCE, ACCRUED, USED, ADJUSTMENT, PENDING | default 0 | Balance ledger components |
| AVAILABLE | **GENERATED ALWAYS AS** (OPENING_BALANCE+ACCRUED-USED+ADJUSTMENT-PENDING) VIRTUAL | Computed available balance — canonical formula |
| CARRYOVER_FROM_PREV, CARRYOVER_EXPIRY_DT | — | Carryover tracking |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## LEAVE_REQUESTS
| Column | Type | Description |
|---|---|---|
| REQUEST_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Requestor |
| LEAVE_TYPE_ID | FK→LEAVE_TYPES | Type requested |
| START_DATE, END_DATE | NOT NULL, CHECK END>=START | Leave window |
| TOTAL_DAYS | NUMBER(5,1) NOT NULL | Days requested |
| HALF_DAY_FLAG, HALF_DAY_PERIOD | CHECK AM/PM/NULL | Half-day support |
| STATUS | CHECK: PENDING/APPROVED/REJECTED/CANCELLED/TAKEN | Lifecycle |
| REASON | VARCHAR2(4000) | Free text |
| SUPPORTING_DOC_PATH | — | File reference for REQUIRES_DOCUMENT leave types |
| APPROVER_EMP_ID | FK→EMPLOYEES (self) | Who must approve |
| APPROVAL_DATE, APPROVAL_COMMENTS | — | Approval metadata |
| CANCEL_REASON, CANCELLED_DATE | — | Cancellation metadata |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## LEAVE_ACCRUAL_LOG
| Column | Type | Description |
|---|---|---|
| ACCRUAL_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Subject employee |
| LEAVE_TYPE_ID | FK→LEAVE_TYPES | Which leave type accrued |
| ACCRUAL_DATE | NOT NULL | When posted |
| ACCRUAL_AMOUNT | NUMBER(6,2) NOT NULL | Amount posted |
| BALANCE_AFTER | — | Resulting balance snapshot |
| RUN_ID | nullable, **no FK declared** | Presumed batch/payroll run reference — target table unconfirmed |
| CREATED_BY, CREATED_DATE | — | Standard |

## HOLIDAYS
| Column | Type | Description |
|---|---|---|
| HOLIDAY_ID | PK | Surrogate key |
| HOLIDAY_DATE | NOT NULL | Calendar date |
| HOLIDAY_NAME | NOT NULL | Display name |
| LOCATION_CODE | nullable, **no FK declared** | NULL = company-wide holiday (confirmed by seed: all 10 seeded holidays have NULL location) |
| FLOATING_FLAG | default 'N' | Floating holiday indicator |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE | — | Standard |

## REVIEW_CYCLES
| Column | Type | Description |
|---|---|---|
| CYCLE_ID | PK | Surrogate key |
| CYCLE_NAME, CYCLE_YEAR | NOT NULL | Identification |
| START_DATE, END_DATE | NOT NULL | Cycle window |
| SELF_REVIEW_DUE, MANAGER_REVIEW_DUE, CALIBRATION_DUE | — | Milestone due dates |
| STATUS | CHECK: DRAFT/OPEN/IN_PROGRESS/CALIBRATION/CLOSED | Lifecycle |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## PERFORMANCE_REVIEWS
| Column | Type | Description |
|---|---|---|
| REVIEW_ID | PK | Surrogate key |
| CYCLE_ID | FK→REVIEW_CYCLES | Parent cycle |
| EMP_ID | FK→EMPLOYEES | Reviewee |
| REVIEWER_EMP_ID | FK→EMPLOYEES (self) | Reviewer (manager) |
| REVIEW_TYPE | default 'ANNUAL' | Review category |
| STATUS | CHECK: NOT_STARTED/SELF_REVIEW/MANAGER_REVIEW/MEETING_SCHEDULED/COMPLETED/ACKNOWLEDGED | Lifecycle |
| OVERALL_RATING | NUMBER(2,1), CHECK 1.0-5.0 | Final rating |
| RATING_LABEL | VARCHAR2(50) | Text label for rating (Forms declares as a Display Item, not stored-derived — see data-quality-report.md) |
| SELF_ASSESSMENT, MANAGER_ASSESSMENT, STRENGTHS, AREAS_FOR_IMPROVEMENT, DEVELOPMENT_PLAN, EMPLOYEE_COMMENTS | CLOB | Free-text narrative fields |
| EMPLOYEE_ACK_DATE | — | Acknowledgement timestamp |
| CALIBRATED_RATING, CALIBRATION_NOTES | — | Post-calibration adjustment |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## PERFORMANCE_GOALS
| Column | Type | Description |
|---|---|---|
| GOAL_ID | PK | Surrogate key |
| REVIEW_ID | FK→PERFORMANCE_REVIEWS | Parent review |
| EMP_ID | FK→EMPLOYEES | Goal owner |
| GOAL_TITLE | NOT NULL | Short title |
| GOAL_DESCRIPTION | CLOB | Long description |
| GOAL_CATEGORY | CHECK: BUSINESS/DEVELOPMENT/LEADERSHIP/INNOVATION/COMPLIANCE | Forms UI only exposes 3 of these 5 — see hidden-business-rules.json |
| WEIGHT_PCT | default 0 | Relative weighting |
| TARGET_DATE | — | Due date |
| STATUS | CHECK: NOT_STARTED/IN_PROGRESS/COMPLETED/DEFERRED/CANCELLED | Lifecycle |
| PROGRESS_PCT | default 0 | Completion tracking |
| SELF_RATING, MANAGER_RATING | — | Goal-level ratings |
| COMMENTS | CLOB | Free text |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## AUDIT_LOG
| Column | Type | Description |
|---|---|---|
| AUDIT_ID | PK | Surrogate key |
| TABLE_NAME | VARCHAR2(60) NOT NULL | Polymorphic target table name |
| RECORD_ID | NUMBER(15) NOT NULL | Polymorphic target row id |
| ACTION_TYPE | CHECK: INSERT/UPDATE/DELETE only | See data-quality-report.md for STATUS_CHANGE conflict |
| OLD_VALUES, NEW_VALUES | CLOB | Hand-built JSON snapshots |
| CHANGED_BY | NOT NULL | Actor |
| CHANGED_DATE | default SYSDATE | Timestamp |
| IP_ADDRESS, SESSION_ID | — | Request metadata |

## SYSTEM_PARAMETERS
| Column | Type | Description |
|---|---|---|
| PARAM_ID | PK | Surrogate key |
| PARAM_GROUP, PARAM_CODE | NOT NULL, unique together | Namespaced key |
| PARAM_VALUE | VARCHAR2(4000) NOT NULL | Value (seed writes to non-existent `DESCRIPTION` column instead of `PARAM_DESCRIPTION` for the description field — see data-quality-report.md) |
| PARAM_DESCRIPTION | — | Human-readable description |
| DATA_TYPE | default 'VARCHAR2' | Type hint for value parsing |
| EDITABLE_FLAG | default 'Y' | UI edit permission |
| CREATED_BY, CREATED_DATE, MODIFIED_BY, MODIFIED_DATE | — | Standard |

## NOTIFICATION_QUEUE
| Column | Type | Description |
|---|---|---|
| NOTIFICATION_ID | PK | Surrogate key |
| RECIPIENT_EMP_ID | nullable, **no FK declared** | Internal recipient |
| RECIPIENT_EMAIL | — | External/direct email target |
| NOTIFICATION_TYPE | CHECK: EMAIL/IN_APP/SMS | Channel |
| SUBJECT, BODY | NOT NULL | Message content |
| STATUS | CHECK: PENDING/SENT/FAILED/CANCELLED | Delivery lifecycle |
| PRIORITY | default 5 | Queue priority |
| SENT_DATE, ERROR_MESSAGE, RETRY_COUNT | — | Delivery tracking |
| REFERENCE_TABLE, REFERENCE_ID | — | Polymorphic link to triggering record |
| CREATED_BY, CREATED_DATE | — | Standard |

## USER_SESSIONS
| Column | Type | Description |
|---|---|---|
| SESSION_ID | PK | Surrogate key |
| EMP_ID | FK→EMPLOYEES | Session owner |
| USERNAME | NOT NULL | Login identifier (PII) |
| LOGIN_TIME | NOT NULL | Session start |
| LOGOUT_TIME | — | Session end |
| IP_ADDRESS | — | PII |
| FORMS_MODULE | — | Which Forms module opened |
| SESSION_STATUS | default 'ACTIVE' | Lifecycle |
| CREATED_DATE | — | Standard |

## LOOKUP_VALUES
| Column | Type | Description |
|---|---|---|
| LOOKUP_ID | PK | Surrogate key |
| LOOKUP_TYPE, LOOKUP_CODE | NOT NULL, unique together | Namespaced classification key |
| LOOKUP_VALUE | NOT NULL | Display value |
| DISPLAY_ORDER | default 0 | UI ordering |
| PARENT_LOOKUP_ID | nullable, **no FK declared** | Self-referencing hierarchy (mirrors DEPARTMENTS.PARENT_DEPT_ID pattern) |
| ACTIVE_FLAG, CREATED_BY, CREATED_DATE | — | Standard |
