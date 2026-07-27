=== FILE: data/seed/01_reference_data.sql ===

**Type**: SQL seed/insert script (Oracle SQL*Plus, `SET DEFINE OFF`)
**Purpose**: Populates HRMS reference/lookup tables in a fixed run order (01, before employee data)

**Tables populated (INSERT statements) and full column sets:**

1. **LOCATIONS**
   Columns: LOCATION_CODE, LOCATION_NAME, ADDRESS_LINE1, CITY, STATE_PROVINCE, POSTAL_CODE, COUNTRY_CODE, PHONE, ACTIVE_FLAG, CREATED_BY, CREATED_DATE
   Rows inserted:
   - ('HQ', 'Corporate Headquarters', '100 Main Street', 'New York', 'NY', '10001', 'US', '212-555-1000', 'Y', 'SYSTEM', SYSDATE)
   - ('CHI', 'Chicago Regional Office', '200 Michigan Avenue', 'Chicago', 'IL', '60601', 'US', '312-555-2000', 'Y', 'SYSTEM', SYSDATE)
   - ('SF', 'San Francisco Branch', '50 California Street', 'San Francisco', 'CA', '94111', 'US', '415-555-3000', 'Y', 'SYSTEM', SYSDATE)
   - Note: column name here is `PHONE`, but the DDL in schema/tables/01_core_tables.sql defines the column as `PHONE_NUMBER` — **schema/seed mismatch / potential bug** (seed script would fail against the DDL as written, unless there's an undocumented `PHONE` column or synonym).

2. **JOB_GRADES**
   Columns: GRADE_ID, GRADE_NAME, GRADE_LEVEL, MIN_SALARY, MAX_SALARY, ACTIVE_FLAG, CREATED_BY, CREATED_DATE
   Rows: GRADE_ID 1–10, names Entry Level→C-Suite, GRADE_LEVEL 1–10, salary bands from (35000,55000) up to (300000,600000).
   - Note: seed uses `GRADE_LEVEL` and `GRADE_NAME` but DDL (schema/tables/01_core_tables.sql JOB_GRADES) has `GRADE_CODE`, `GRADE_NAME`, no `GRADE_LEVEL` column, and no `GRADE_CODE` value supplied here — **schema/seed mismatch**.

3. **DEPARTMENTS**
   Columns: DEPT_ID, DEPT_CODE, DEPT_NAME, COST_CENTER, PARENT_DEPT_ID, MANAGER_EMP_ID, LOCATION_CODE, ACTIVE_FLAG, CREATED_BY, CREATED_DATE
   Rows: DEPT_ID 1 (EXEC), 10 (HR), 20 (FIN), 30 (IT), 31 (ITDEV), 32 (ITOPS), 40 (SALES), 50 (MKT), 60 (OPS), 70 (LEGAL); each with cost center CC-1xxx, PARENT_DEPT_ID mostly 1 (except 31/32 parent=30), LOCATION_CODE one of HQ/CHI/SF.
   Later updated via UPDATE statements (see below).

4. **JOB_TITLES**
   Columns: JOB_ID, JOB_CODE, JOB_TITLE, GRADE_ID, EEO_CATEGORY, ACTIVE_FLAG, CREATED_BY, CREATED_DATE
   27 rows spanning JOB_ID 1–71: CEO/CFO/CIO (grade 10), VP-HR/VP-FIN/VP-SALES (grade 9), DIR-IT/DIR-HR (grade 8), MGR-DEV/MGR-OPS/MGR-PAY/MGR-SALES (grade 6), SR-DEV/SR-DBA/SR-ACCT/SR-SALES (grade 4), DEV/QA/ACCT/HR-SPEC/SALES-REP (grade 3), JR-DEV/HR-ASST/ACCT-CLK (grade 2), INTERN/RECEPT (grade 1). EEO_CATEGORY values: '1.1','1.2','2.0','5.0'.

5. **LEAVE_TYPES**
   Columns: LEAVE_TYPE_ID, LEAVE_TYPE_CODE, LEAVE_TYPE_NAME, ACCRUAL_FLAG, ACCRUAL_RATE, ACCRUAL_FREQUENCY, MAX_BALANCE, CARRYOVER_MAX, CARRYOVER_EXPIRY, REQUIRES_APPROVAL, MIN_TENURE_DAYS, ACTIVE_FLAG, CREATED_BY, CREATED_DATE
   Rows:
   - (1,'PTO','Paid Time Off','Y',1.25,'MONTHLY',20,5,3,'Y',0,'Y',...)
   - (2,'SICK','Sick Leave','Y',0.833,'MONTHLY',10,10,NULL,'Y',0,'Y',...)
   - (3,'COMP','Compensatory Time','N',NULL,NULL,NULL,0,NULL,'Y',90,'Y',...)
   - (4,'FMLA','Family Medical Leave','N',NULL,NULL,NULL,0,NULL,'Y',365,'Y',...)
   - (5,'JURY','Jury Duty','N',NULL,NULL,NULL,0,NULL,'N',0,'Y',...)
   - (6,'BEREAVE','Bereavement','N',NULL,NULL,NULL,0,NULL,'N',0,'Y',...)
   Business rules embedded: PTO accrues 1.25/month, max balance 20, carryover max 5 expiring after 3 (months, presumably); SICK accrues 0.833/month, max 10, full carryover (10), no expiry; COMP/FMLA/JURY/BEREAVE non-accrual with MIN_TENURE_DAYS gating (COMP requires 90 days tenure, FMLA requires 365 days).

6. **PAY_ELEMENTS**
   Columns: ELEMENT_ID, ELEMENT_CODE, ELEMENT_NAME, ELEMENT_TYPE, CALCULATION_TYPE, DEFAULT_AMOUNT, DEFAULT_PERCENTAGE, GL_ACCOUNT_CODE, PRIORITY_ORDER, PRETAX_FLAG, ACTIVE_FLAG, CREATED_BY, CREATED_DATE
   Rows:
   - (1,'BASE_PAY','Base Salary','EARNING','FLAT',NULL,NULL,'5100-100',1,'N',...)
   - (100,'FED_TAX','Federal Income Tax','TAX','FORMULA',NULL,NULL,'2100-100',10,'N',...)
   - (101,'STATE_TAX','State Income Tax','TAX','FORMULA',NULL,NULL,'2100-200',11,'N',...)
   - (102,'FICA','Social Security (FICA)','TAX','FORMULA',NULL,NULL,'2100-300',12,'N',...)
   - (103,'MEDICARE','Medicare','TAX','FORMULA',NULL,NULL,'2100-400',13,'N',...)
   - (200,'401K_EE','401(k) Employee Contribution','DEDUCTION','PERCENTAGE',NULL,6,'2200-100',20,'Y',...)
   - (201,'MED_EE','Medical Insurance (Employee)','BENEFIT','FLAT',250,NULL,'2200-200',21,'Y',...)
   - (202,'DENTAL_EE','Dental Insurance (Employee)','BENEFIT','FLAT',45,NULL,'2200-300',22,'Y',...)
   - (203,'VISION_EE','Vision Insurance (Employee)','BENEFIT','FLAT',15,NULL,'2200-400',23,'Y',...)
   - (204,'LIFE_INS','Life Insurance','BENEFIT','FLAT',25,NULL,'2200-500',24,'N',...)
   - (205,'HSA','Health Savings Account','DEDUCTION','FLAT',150,NULL,'2200-600',25,'Y',...)
   Priority order defines calculation sequence (1 base pay, 10-13 taxes, 20-25 deductions/benefits). PRETAX_FLAG marks pre-tax deductions (401K, MED, DENTAL, VISION, HSA) vs post-tax/taxable (LIFE_INS).

7. **HOLIDAYS** (2024)
   Columns: HOLIDAY_ID, HOLIDAY_NAME, HOLIDAY_DATE, LOCATION_CODE, ACTIVE_FLAG, CREATED_BY, CREATED_DATE
   10 holidays for 2024: New Year's Day (01-01), MLK Day (01-15), Presidents' Day (02-19), Memorial Day (05-27), Independence Day (07-04), Labor Day (09-02), Thanksgiving (11-28), Day After Thanksgiving (11-29), Christmas Eve (12-24), Christmas Day (12-25). All LOCATION_CODE NULL (company-wide).

8. **SYSTEM_PARAMETERS**
   Columns: PARAM_ID, PARAM_GROUP, PARAM_CODE, PARAM_VALUE, DESCRIPTION, EDITABLE_FLAG, CREATED_BY, CREATED_DATE
   Configuration keys set:
   - SYSTEM.APP_VERSION = '4.2.0' (not editable)
   - SYSTEM.COMPANY_NAME = 'Acme Corporation'
   - PAYROLL.DEFAULT_PAY_FREQUENCY = 'MONTHLY'
   - PAYROLL.FISCAL_YEAR_START = '10'
   - SECURITY.SESSION_TIMEOUT_MIN = '30'
   - SECURITY.PASSWORD_MIN_LENGTH = '8'
   - NOTIFICATION.SMTP_HOST = 'smtp.internal.company.com'
   - NOTIFICATION.FROM_ADDRESS = 'hrms-noreply@company.com'
   - INTEGRATION.GL_FEED_STATUS = 'ACTIVE'
   - INTEGRATION.BENEFITS_FEED_STATUS = 'ACTIVE'
   Note: seed uses column name `DESCRIPTION`, but DDL (04_performance_tables.sql SYSTEM_PARAMETERS) column is `PARAM_DESCRIPTION` and also has `DATA_TYPE` column not referenced in the INSERT column list — **schema/seed mismatch**.

Ends with `COMMIT;`. No PL/SQL logic, no exceptions, no external services. Pure static reference data.

=== FILE: data/seed/02_employee_data.sql ===

**Type**: SQL seed/insert script (run order 02, depends on 01)
**Purpose**: Loads 25 sample employees (incl. 1 terminated) plus current salary records, then patches department manager FKs.

**EMPLOYEES table inserts** — columns: EMP_ID, EMP_NUMBER, FIRST_NAME, LAST_NAME, EMAIL, PHONE_WORK, HIRE_DATE, DEPT_ID, JOB_ID, MANAGER_EMP_ID, LOCATION_CODE, EMPLOYMENT_TYPE, EMPLOYMENT_STATUS, [TERMINATION_DATE, TERMINATION_REASON for term'd emp], GENDER, DATE_OF_BIRTH, MARITAL_STATUS, ACTIVE_FLAG, CREATED_BY, CREATED_DATE

Employees by department:
- Executive (dept 1/20/30 top mgmt): EMP_ID 1 James Richardson (CEO, job 1, no manager, HQ, hired 2010-03-15), EMP_ID 2 Sarah Chen (job 2 CFO, dept 20, manager 1, HQ, 2012-06-01), EMP_ID 3 Michael O'Connor (job 3 CIO, dept 30, manager 1, CHI, 2011-09-12)
- HR (dept 10): EMP_ID 10 Patricia Williams (job 10 VP-HR, manager 1), EMP_ID 11 David Martinez (job 53 HR-SPEC, manager 10), EMP_ID 12 Emily Johnson (job 61 HR-ASST, manager 10)
- Finance (dept 20): EMP_ID 20 Robert Kumar (job 11 VP-FIN, manager 2), EMP_ID 21 Jennifer Park (job 32 MGR-PAY, manager 20), EMP_ID 22 Thomas Baker (job 42 SR-ACCT, manager 21), EMP_ID 23 Lisa Wong (job 52 ACCT, manager 21), EMP_ID 24 Andrew Patel (job 62 ACCT-CLK, manager 21)
- IT (dept 30/31): EMP_ID 30 Rachel Thompson (job 20 DIR-IT, manager 3), EMP_ID 31 Kevin Garcia (job 30 MGR-DEV, dept 31, manager 30), EMP_ID 32 Maria Rodriguez (job 40 SR-DEV, manager 31), EMP_ID 33 Daniel Lee (job 41 SR-DBA, manager 31), EMP_ID 34 Jessica Nguyen (job 50 DEV, manager 31), EMP_ID 35 Chris Anderson (job 50 DEV, manager 31), EMP_ID 36 Priya Sharma (job 51 QA, manager 31), EMP_ID 37 Alex Taylor (job 60 JR-DEV, manager 31)
- Sales (dept 40): EMP_ID 40 Mark Davis (job 12 VP-SALES, manager 1, SF), EMP_ID 41 Ashley Brown (job 33 MGR-SALES, manager 40), EMP_ID 42 Jason Wilson (job 43 SR-SALES, manager 41), EMP_ID 43 Samantha Moore (job 54 SALES-REP, manager 41)
- Terminated: EMP_ID 99 Brian Foster (job 50 DEV, dept 31, manager 31, CHI, hired 2018-04-02, TERMINATION_DATE 2023-06-30, TERMINATION_REASON 'VOLUNTARY', EMPLOYMENT_STATUS 'TERMINATED', ACTIVE_FLAG 'N') — used for historical/terminated-employee query testing.

All active employees: EMPLOYMENT_TYPE='FULL_TIME', EMPLOYMENT_STATUS='ACTIVE', ACTIVE_FLAG='Y', CREATED_BY='SYSTEM'.

**SALARY_RECORDS inserts** — columns: SALARY_ID, EMP_ID, EFFECTIVE_DATE, END_DATE, BASE_SALARY, CURRENCY_CODE, PAY_FREQUENCY, SALARY_BASIS, CHANGE_REASON, ACTIVE_FLAG, CREATED_BY, CREATED_DATE. One active record per employee (SALARY_ID matches EMP_ID for the 21 active employees, IDs 1,2,3,10-12,20-24,30-37,40-43), all CURRENCY_CODE='USD', PAY_FREQUENCY='MONTHLY', SALARY_BASIS='ANNUAL', END_DATE NULL, ACTIVE_FLAG='Y'. Salaries range from $48,000 (Andrew Patel) to $450,000 (CEO James Richardson). CHANGE_REASON values: 'Annual review', 'Promotion', 'New hire'.

**UPDATE statements** (post-insert, patches DEPARTMENTS.MANAGER_EMP_ID FK now that employees exist):
```sql
UPDATE DEPARTMENTS SET MANAGER_EMP_ID = 10 WHERE DEPT_ID = 10;
UPDATE DEPARTMENTS SET MANAGER_EMP_ID = 2  WHERE DEPT_ID = 20;
UPDATE DEPARTMENTS SET MANAGER_EMP_ID = 3  WHERE DEPT_ID = 30;
UPDATE DEPARTMENTS SET MANAGER_EMP_ID = 30 WHERE DEPT_ID = 30;  -- Dir IT manages IT (duplicate/overwriting update on same DEPT_ID=30 — likely a bug/redundant statement; second update overwrites the first for dept 30)
UPDATE DEPARTMENTS SET MANAGER_EMP_ID = 31 WHERE DEPT_ID = 31;
UPDATE DEPARTMENTS SET MANAGER_EMP_ID = 40 WHERE DEPT_ID = 40;
UPDATE DEPARTMENTS SET MANAGER_EMP_ID = 1  WHERE DEPT_ID = 1;
```
Note: two consecutive UPDATEs target DEPT_ID=30 (manager 3, then manager 30) — the final effective value is 30, making the first UPDATE dead/no-op. Flagged as an inline code comment noting intent ("Dir IT manages IT").

Ends with `COMMIT;`. No PL/SQL procedures/functions; pure DML.

=== FILE: forms/libraries/HRMS_COMMON_LIB.pll.sql ===

**Type**: Oracle Forms PL/SQL Library (source export of compiled .pll) — shared code attached to all HRMS forms.
**Dependencies**: None (standalone); attached by all HRMS forms via `ATTACH_LIBRARY`.

**Procedures/Functions:**

1. `PROCEDURE handle_error(p_module IN VARCHAR2, p_location IN VARCHAR2)`
   - Captures `v_errcode NUMBER := SQLCODE` and `v_errmsg VARCHAR2(500) := SQLERRM`.
   - Calls `PKG_COMMON.log_error(p_module, p_location, v_errmsg, NVL(:GLOBAL.current_user, USER))` inside a nested BEGIN/EXCEPTION block that swallows all exceptions (`WHEN OTHERS THEN NULL;`) to prevent recursive error loops.
   - Calls `MESSAGE(...)` **twice** with the same text (explicitly documented as intentional — Oracle Forms status bar requires two MESSAGE calls to force display).
   - Raises `FORM_TRIGGER_FAILURE` to abort the current Forms trigger/operation.
   - Dependency: `PKG_COMMON.log_error` (external package).
   - Uses Forms global `:GLOBAL.current_user`.

2. `PROCEDURE toolbar_save` — calls `COMMIT_FORM`.
3. `PROCEDURE toolbar_clear` — calls `CLEAR_FORM(ASK_COMMIT)`.
4. `PROCEDURE toolbar_query` — if `:SYSTEM.MODE = 'NORMAL'` calls `ENTER_QUERY`; if `:SYSTEM.MODE = 'ENTER-QUERY'` calls `EXECUTE_QUERY`.
5. `PROCEDURE toolbar_first` — `FIRST_RECORD`.
6. `PROCEDURE toolbar_prev` — `PREVIOUS_RECORD`.
7. `PROCEDURE toolbar_next` — `NEXT_RECORD`.
8. `PROCEDURE toolbar_last` — `LAST_RECORD`.
9. `PROCEDURE toolbar_insert` — `CREATE_RECORD`.
10. `PROCEDURE toolbar_delete` — `DELETE_RECORD`.
11. `PROCEDURE toolbar_exit` — `EXIT_FORM(ASK_COMMIT)`.

12. `FUNCTION format_date(p_date IN DATE) RETURN VARCHAR2` — `TO_CHAR(p_date, 'MM/DD/YYYY')`.
13. `FUNCTION format_datetime(p_date IN DATE) RETURN VARCHAR2` — `TO_CHAR(p_date, 'MM/DD/YYYY HH24:MI:SS')`.

14. `FUNCTION get_current_user RETURN VARCHAR2` — `NVL(:GLOBAL.current_user, USER)`.
15. `FUNCTION get_session_id RETURN NUMBER` — `TO_NUMBER(:GLOBAL.session_id)`; catches `VALUE_ERROR` and returns NULL (i.e., if global session_id isn't numeric/is null, returns NULL rather than raising).
16. `PROCEDURE check_session`
    - If `get_session_id IS NULL` → `MESSAGE('No active session. Please log in.')` then `RAISE FORM_TRIGGER_FAILURE`.
    - Else if `NOT PKG_SECURITY.is_session_valid(get_session_id)` → `MESSAGE('Session has expired. Please log in again.')` then `RAISE FORM_TRIGGER_FAILURE`.
    - Dependency: `PKG_SECURITY.is_session_valid` (external package, also used broadly in forms triggers).

17. `PROCEDURE refresh_lov(p_lov_name IN VARCHAR2)`
    - Derives record group name: `v_rg_name := 'RG_' || UPPER(REPLACE(p_lov_name, 'LOV_', ''))`.
    - If `NOT ID_NULL(FIND_GROUP(v_rg_name))` then `POPULATE_GROUP(v_rg_name)` — i.e., only refreshes if the record group already exists in the form.

**Business rules/constraints**: Naming convention coupling between LOV name and record group name (`LOV_X` → `RG_X`) is a hard-coded convention, not enforced elsewhere except by this function — fragile if naming diverges.

**External dependencies referenced**: `PKG_COMMON` (log_error), `PKG_SECURITY` (is_session_valid). No direct DB tables queried in this file. No exceptions thrown besides `FORM_TRIGGER_FAILURE` (Oracle Forms built-in exception).

=== FILE: forms/libraries/HRMS_VALIDATION_LIB.pll.sql ===

**Type**: Oracle Forms PL/SQL Library (client-side validation), source export of compiled .pll.
**Documented known issue**: Validations here duplicate server-side logic in `PKG_VALIDATION` package and can drift out of sync (explicitly called out in comments — this file is a known source of validation logic duplication/drift).

**Functions:**

1. `FUNCTION validate_email(p_email IN VARCHAR2) RETURN BOOLEAN`
   - If `p_email IS NULL` → returns TRUE (NULL treated as valid; not a required-field check).
   - `v_at_pos := INSTR(p_email, '@')`; if `v_at_pos = 0` OR `= 1` OR `= LENGTH(p_email)` → returns FALSE (rejects missing @, @ as first char, or @ as last char).
   - `v_dot_pos := INSTR(p_email, '.', v_at_pos)`; if `v_dot_pos = 0` OR `= v_at_pos + 1` OR `= LENGTH(p_email)` → returns FALSE.
   - **BUG (explicitly documented)**: Only checks for one dot after `@`; rejects valid subdomain emails like `user@mail.company.com` presumably because `INSTR` finds the *first* dot only... actually re-reading: it just checks a dot exists somewhere after `@` and isn't immediately after `@` or at the very end — the documented drift claim is that server-side `PKG_VALIDATION` uses a more permissive `REGEXP_LIKE` pattern, and this version is stricter/different, causing client/server validation mismatch. This is a **known validation-drift business risk**: an email could pass this client-side check but be handled differently server-side (or vice versa), since the two implementations are independent and not kept in sync.
   - Returns TRUE otherwise.

2. `FUNCTION validate_phone(p_phone IN VARCHAR2) RETURN BOOLEAN`
   - NULL → TRUE (valid/not required).
   - Strips non-digit characters via `TRANSLATE(p_phone, '0123456789()-. +x', '0123456789')` (this TRANSLATE call is actually a no-op filter since the replacement string only lists 10 digit chars for an 18-char source string — chars in source beyond the digits map to nothing, effectively stripping punctuation/letters, keeping only digits... TRANSLATE behavior: any source char without a corresponding replacement char is removed).
   - Valid if resulting digit count is 10 or 11 (`LENGTH(v_digits) NOT IN (10,11)` → FALSE); else TRUE.
   - Business rule: US phone number format only (10 digits, or 11 with leading country code 1).

3. `FUNCTION validate_ssn(p_ssn IN VARCHAR2) RETURN BOOLEAN`
   - NULL → TRUE.
   - Strips non-digits via `TRANSLATE(p_ssn, '0123456789-', '0123456789')`.
   - Must be exactly 9 digits else FALSE.
   - Rejects all-zero groups: first 3 digits ('000'), next 2 digits ('00'), last 4 digits ('0000') — standard SSN validity rule.
   - Returns TRUE otherwise.

4. `FUNCTION validate_date_not_future(p_date IN DATE) RETURN BOOLEAN`
   - Returns TRUE if `p_date IS NULL` or `TRUNC(p_date) <= TRUNC(SYSDATE)`; else implicitly FALSE (business rule: date must not be in the future).

5. `FUNCTION validate_salary_range(p_salary IN NUMBER, p_grade_id IN NUMBER) RETURN VARCHAR2`
   - Returns NULL if valid; otherwise an error message string.
   - If either param NULL → returns NULL (no validation performed).
   - **Documented bug/comment mismatch**: header comment claims "Checks salary against grade range using cached local data" and warns the cache is populated at form startup and never refreshed (stale-data bug) — but the actual code issues a **direct DB query** (`SELECT MIN_SALARY, MAX_SALARY INTO v_min, v_max FROM JOB_GRADES WHERE GRADE_ID = p_grade_id`), contradicting the comment. This is flagged in-code as "another common pattern: optimistic comment/code mismatch" — i.e., the comment is stale/wrong, not the code (or vice versa — ambiguous/misleading documentation is itself the defect).
   - If `p_salary < v_min` → returns `'Below minimum (' || TO_CHAR(v_min,'FM$999,999') || ')'`.
   - Elsif `p_salary > v_max` → returns `'Exceeds maximum (' || TO_CHAR(v_max,'FM$999,999') || ')'`.
   - Exception handler: `WHEN NO_DATA_FOUND THEN RETURN 'Invalid grade';` (grade_id not found in JOB_GRADES).
   - Dependency: table `JOB_GRADES` (columns `MIN_SALARY`, `MAX_SALARY`, `GRADE_ID`).

No external package calls in this file besides implicit Oracle builtins (INSTR, TRANSLATE, LENGTH, SUBSTR, TRUNC, SYSDATE, TO_CHAR). No exceptions thrown besides the NO_DATA_FOUND handler in validate_salary_range.

=== FILE: forms/menus/HRMS_MENU.mmb.sql ===

**Type**: Source representation of compiled Oracle Forms Menu Module binary (.mmb). Purely structural/comment documentation — no executable PL/SQL beyond referenced command bindings.

**Menu structure (MAIN_MENUBAR):**
- **File**: Save (`COMMIT_FORM`), Save & Exit (`COMMIT_FORM; EXIT_FORM`), Print (`RUN_PRODUCT`), Exit (`EXIT_FORM`)
- **Edit**: Clear Record (`CLEAR_RECORD`), Duplicate Record (`DUPLICATE_RECORD`), Delete Record (`DELETE_RECORD`), Insert Record (`CREATE_RECORD`)
- **Query**: Enter Query (`ENTER_QUERY`), Execute Query (`EXECUTE_QUERY`), Cancel Query (`EXIT_FORM`), Count Matching (`COUNT_QUERY`), Fetch Next Set (`SCROLL_DOWN`)
- **Navigate**: First/Previous/Next/Last Record (`FIRST_RECORD`/`PREVIOUS_RECORD`/`NEXT_RECORD`/`LAST_RECORD`), Previous/Next Block (`PREVIOUS_BLOCK`/`NEXT_BLOCK`)
- **Modules** (each via `OPEN_FORM`): Employee Management → `HRMS_EMPLOYEE`; Payroll Processing → `HRMS_PAYROLL`; Leave Management → `HRMS_LEAVE`; Performance Reviews → `HRMS_PERFORMANCE`; Reports & Analytics → `HRMS_REPORTS`; System Admin → `HRMS_ADMIN`
- **Admin**: Change Password (`SHOW_WINDOW('WIN_CHANGE_PWD')`), System Parameters (requires ADMIN permission — enforced elsewhere), User Management (requires ADMIN permission)
- **Help**: Contents (`WEB.SHOW_DOCUMENT`), About HRMS (`SHOW_ALERT('ALT_ABOUT')`), Support (`WEB.SHOW_DOCUMENT`)

**Security model note (documented)**: Menu items are enabled/disabled at runtime based on `PKG_SECURITY.has_permission()` checks inside each form's `WHEN-NEW-FORM-INSTANCE` trigger — i.e., authorization is enforced by the calling form, not centrally by the menu module itself. Dependency: `PKG_SECURITY.has_permission`.

=== FILE: forms/xml-exports/HRMS_EMPLOYEE.xml ===

**Type**: Oracle Forms XML export (source of compiled HRMS_EMPLOYEE.fmb) — Employee maintenance form.
**Form Module**: `HRMS_EMPLOYEE`, MenuModule=`HRMS_MENU`, Title="HRMS - Employee Maintenance", FirstNavigationBlock=`EMPLOYEE`.

**Attached Libraries**: `HRMS_COMMON_LIB`, `HRMS_VALIDATION_LIB` (both File-sourced).

**Form-level triggers:**

1. `WHEN-NEW-FORM-INSTANCE`:
   - `v_session_id := TO_NUMBER(GET_APPLICATION_PROPERTY(USERNAME))`.
   - Calls `PKG_SECURITY.is_session_valid(v_session_id)`; if false → `MESSAGE('Session expired. Please log in again.')` + `RAISE FORM_TRIGGER_FAILURE`.
   - Sets MDI window title to include `:GLOBAL.current_user`.
   - Permission check: `PKG_SECURITY.has_permission(:GLOBAL.current_emp_id, 'EMPLOYEE', 'EDIT')`; if false, disables INSERT_ALLOWED/UPDATE_ALLOWED/DELETE_ALLOWED on block `EMPLOYEE` (read-only mode for unauthorized users).
   - Sets block default WHERE clause: `EMPLOYMENT_STATUS = 'ACTIVE' AND ACTIVE_FLAG = 'Y'` (business rule: form only shows active employees by default).
   - Populates LOVs: `RG_DEPARTMENTS`, `RG_JOB_TITLES`, `RG_LOCATIONS`.
   - `GO_BLOCK('EMPLOYEE'); EXECUTE_QUERY;`

2. `ON-ERROR` (fires in enter-query mode too):
   - Captures `ERROR_CODE`, `ERROR_TYPE`, `ERROR_TEXT`.
   - Error code 40202 ("Field is protected against update") → suppressed (NULL).
   - Error code 40401 ("No changes to save") → `MESSAGE('No changes to save.')`.
   - Error code 40501 ("Oracle error: unable to reserve record") → `MESSAGE('Record is locked by another user. Please try again.')` — handles record-locking contention.
   - Else → displays generic `errtype-errcode: errmsg` and raises `FORM_TRIGGER_FAILURE`.

3. `KEY-EXIT`:
   - If `:SYSTEM.FORM_STATUS = 'CHANGED'` → shows `ALT_CONFIRM_EXIT` alert; Button1 (Save) → `COMMIT_FORM`; Button2 (Discard) → `CLEAR_FORM(NO_VALIDATE)`; else (Cancel) → `RAISE FORM_TRIGGER_FAILURE` (aborts exit).
   - Otherwise `EXIT_FORM`.
   - **Bug note**: `SHOW_ALERT` is called twice (once in the IF, once implicitly again in the ELSIF condition) — actually looking closer, the code calls `SHOW_ALERT('ALT_CONFIRM_EXIT')` in both the `IF` and `ELSIF` condition expressions, meaning the alert could be shown twice if the first evaluation returns something not equal to ALERT_BUTTON1 (undefined/duplicate dialog behavior risk).

**Data Block: EMPLOYEE** (master)
- QueryDataSourceType/DMLDataTarget: Table `HRMS.EMPLOYEES`
- QueryAllRecords=No, RecordsDisplayed=1, NavigationStyle="Same Record", KeyMode=Unique, EnforcePrimaryKey=Yes
- Insert/Update/Delete/Query all Allowed=Yes (at block-definition level; runtime may restrict via trigger above)

Items (all `DatabaseItem="Yes"` unless noted):
- `EMP_ID`: Number(10), Required, Visible=No, PrimaryKey=Yes, Insert/UpdateAllowed=No (system-generated)
- `EMP_NUMBER`: Char(20), Required, Visible=Yes (Personal tab), Insert/UpdateAllowed=No (system-generated, display only)
- `FIRST_NAME`: Char(50), Required, CaseRestriction=Upper
- `LAST_NAME`: Char(50), Required, CaseRestriction=Upper
- `DATE_OF_BIRTH`: Date, format MM/DD/YYYY
- `GENDER`: List Item (Poplist) Char(1): Male=M, Female=F, Other=O
- `MARITAL_STATUS`: List Item Char(10): Single/Married/Divorced/Widowed
- `EMAIL`: Char(100), CaseRestriction=Lower
- `PHONE_WORK`: Char(30)
- `PHONE_MOBILE`: Char(30)
- `ADDRESS_LINE1`, `ADDRESS_LINE2`: Char(200)
- `CITY`: Char(100)
- `STATE_PROVINCE`: Char(100)
- `POSTAL_CODE`: Char(20)
- Job tab: `HIRE_DATE` Date Required; `DEPT_ID` Number(10) Required, LOV=LOV_DEPARTMENTS; `DEPT_NAME_DISP` non-DB display item; `JOB_ID` Number(10) Required, LOV=LOV_JOB_TITLES; `JOB_TITLE_DISP` non-DB display; `MANAGER_EMP_ID` Number(10), LOV=LOV_MANAGERS; `MANAGER_NAME_DISP` non-DB display; `LOCATION_CODE` Char(10), LOV=LOV_LOCATIONS
- `EMPLOYMENT_TYPE`: List Item Char(20): Full-Time/Part-Time/Contract/Intern
- `EMPLOYMENT_STATUS`: List Item Char(20), UpdateAllowed=No (must go through separate process, not directly editable): Active/On Leave/Suspended/Terminated
- `TERMINATION_DATE`: Date, UpdateAllowed=No
- Hidden audit columns: `ACTIVE_FLAG` Char(1) Visible=No; `CREATED_BY` Char(30) Visible=No, InsertAllowed=Yes/UpdateAllowed=No; `CREATED_DATE` Date, Insert=Yes/Update=No; `MODIFIED_BY`/`MODIFIED_DATE` Visible=No

**Block-level triggers on EMPLOYEE:**
- `PRE-INSERT`: `:EMP_ID := SEQ_EMPLOYEE.NEXTVAL`; `:EMP_NUMBER := PKG_EMPLOYEE.generate_emp_number`; `:ACTIVE_FLAG := 'Y'`; `:EMPLOYMENT_STATUS := 'ACTIVE'`; `:CREATED_BY := :GLOBAL.current_user`; `:CREATED_DATE := SYSDATE`.
  - Dependencies: sequence `SEQ_EMPLOYEE`, function `PKG_EMPLOYEE.generate_emp_number`.
- `PRE-UPDATE`: `:MODIFIED_BY := :GLOBAL.current_user`; `:MODIFIED_DATE := SYSDATE`.
- `POST-QUERY`: Looks up and populates display items via 3 separate implicit-cursor SELECTs, each wrapped with its own `EXCEPTION WHEN NO_DATA_FOUND` that sets the display field to NULL:
  - `DEPT_NAME_DISP` ← `SELECT DEPT_NAME FROM DEPARTMENTS WHERE DEPT_ID = :EMPLOYEE.DEPT_ID`
  - `JOB_TITLE_DISP` ← `SELECT JOB_TITLE FROM JOB_TITLES WHERE JOB_ID = :EMPLOYEE.JOB_ID`
  - `MANAGER_NAME_DISP` ← `SELECT FIRST_NAME||' '||LAST_NAME FROM EMPLOYEES WHERE EMP_ID = :EMPLOYEE.MANAGER_EMP_ID`
- `WHEN-VALIDATE-ITEM` (does NOT fire in enter-query mode): dispatches on `:SYSTEM.TRIGGER_ITEM`:
  - `EMPLOYEE.EMAIL`: if not null and `NOT PKG_VALIDATION.validate_email_format(:EMPLOYEE.EMAIL)` → `MESSAGE('Invalid email format')` + `RAISE FORM_TRIGGER_FAILURE`. **Note**: this calls server-side `PKG_VALIDATION.validate_email_format`, a *different* named function than the client-side `HRMS_VALIDATION_LIB.validate_email` — consistent with the documented client/server validation-drift risk noted in that library file.
  - `EMPLOYEE.HIRE_DATE`: if `> SYSDATE + 90` → `MESSAGE('Hire date cannot be more than 90 days in the future')` + `RAISE FORM_TRIGGER_FAILURE`. **Note**: this is a *different* threshold (90 days) than the DB trigger `TRG_EMP_BEFORE_INSERT` in plsql/triggers/trg_employees.sql, which enforces 180 days — **inconsistent business rule between form-level and DB-level validation** (a real defect/drift, not just documented — this one isn't called out in comments).
  - `EMPLOYEE.DEPT_ID`: looks up `DEPT_NAME` from `DEPARTMENTS WHERE DEPT_ID=... AND ACTIVE_FLAG='Y'`; on `NO_DATA_FOUND` → `MESSAGE('Invalid department')` + `RAISE FORM_TRIGGER_FAILURE`.
  - `EMPLOYEE.JOB_ID`: looks up `JOB_TITLE` from `JOB_TITLES WHERE JOB_ID=... AND ACTIVE_FLAG='Y'`; on `NO_DATA_FOUND` → `MESSAGE('Invalid job title')` + `RAISE FORM_TRIGGER_FAILURE`.

**Detail Block: SALARY** (read-only in this form: Insert/Update/DeleteAllowed=No)
- Table `HRMS.SALARY_RECORDS`, RecordsDisplayed=5, NavigationStyle="Change Block"
- Items: `SALARY_ID` (PK, hidden), `EMP_ID` (hidden), `EFFECTIVE_DATE` (Date, UpdateAllowed=No), `END_DATE` (Date), `BASE_SALARY` (Number, format $999,999,990.00), `CHANGE_REASON` (Char), `CHANGE_PCT` (Number, format 990.00%)
- Relation `EMP_SALARY_REL`: `SALARY.EMP_ID = EMPLOYEE.EMP_ID`, DeleteRecordBehavior=Cascading, AutoQuery=Yes.

**LOVs:**
- `LOV_DEPARTMENTS` → RecordGroup `RG_DEPARTMENTS`: `SELECT DEPT_ID, DEPT_CODE, DEPT_NAME, COST_CENTER FROM HRMS.DEPARTMENTS WHERE ACTIVE_FLAG='Y' ORDER BY DEPT_NAME`; maps DEPT_ID→EMPLOYEE.DEPT_ID, DEPT_NAME→EMPLOYEE.DEPT_NAME_DISP.
- `LOV_JOB_TITLES` → RecordGroup `RG_JOB_TITLES`: joins `JOB_TITLES j JOIN JOB_GRADES g ON j.GRADE_ID=g.GRADE_ID WHERE j.ACTIVE_FLAG='Y' ORDER BY j.JOB_TITLE`; maps JOB_ID→EMPLOYEE.JOB_ID, JOB_TITLE→EMPLOYEE.JOB_TITLE_DISP.
- `LOV_MANAGERS` → RecordGroup `RG_MANAGERS`: `SELECT EMP_ID, EMP_NUMBER, FIRST_NAME||' '||LAST_NAME AS MANAGER_NAME FROM HRMS.EMPLOYEES WHERE EMPLOYMENT_STATUS='ACTIVE' ORDER BY LAST_NAME`; maps EMP_ID→EMPLOYEE.MANAGER_EMP_ID, MANAGER_NAME→EMPLOYEE.MANAGER_NAME_DISP.
- `LOV_LOCATIONS` → RecordGroup `RG_LOCATIONS`: `SELECT LOCATION_CODE, LOCATION_NAME, CITY, STATE_PROVINCE FROM HRMS.LOCATIONS WHERE ACTIVE_FLAG='Y' ORDER BY LOCATION_NAME`; maps LOCATION_CODE→EMPLOYEE.LOCATION_CODE.

**Canvases**: `CVS_MAIN` (Tab, 4 pages: TP_PERSONAL "Personal Information", TP_JOB "Job & Compensation", TP_DEPENDENTS "Dependents", TP_HISTORY "Employment History"); `CVS_TOOLBAR` (Horizontal Toolbar).
**Window**: `WIN_EMPLOYEE`, Document style, 720x550, PrimaryCanvas=CVS_MAIN.
**Alerts**: `ALT_CONFIRM_EXIT` (Caution, Save/Discard/Cancel buttons), `ALT_CONFIRM_DELETE` (Stop, Yes/No) — note ALT_CONFIRM_DELETE is defined but no trigger in this file appears to invoke it (DELETE_RECORD is bound via menu/toolbar without an explicit confirmation trigger shown here — possible dead/unused alert or confirmation logic lives elsewhere not shown).

**Dependencies summary**: Packages `PKG_SECURITY` (is_session_valid, has_permission), `PKG_EMPLOYEE` (generate_emp_number), `PKG_VALIDATION` (validate_email_format); Sequence `SEQ_EMPLOYEE`; Tables `EMPLOYEES`, `DEPARTMENTS`, `JOB_TITLES`, `JOB_GRADES`, `LOCATIONS`, `SALARY_RECORDS`.

=== FILE: forms/xml-exports/HRMS_LEAVE.xml ===

**Type**: Oracle Forms XML export — Leave Management form.
**Form Module**: `HRMS_LEAVE`, MenuModule=`HRMS_MENU`, FirstNavigationBlock=`LEAVE_REQUEST`.
**Attached Library**: `HRMS_COMMON_LIB`.

**Form-level trigger `WHEN-NEW-FORM-INSTANCE`:**
- Session validation via `PKG_SECURITY.is_session_valid(TO_NUMBER(GET_APPLICATION_PROPERTY(USERNAME)))`; fails → `MESSAGE('Session expired.')` + `FORM_TRIGGER_FAILURE`.
- Sets window title with `:GLOBAL.current_user`.
- Sets `LEAVE_REQUEST` block default WHERE: `EMP_ID = :GLOBAL.current_emp_id ORDER BY CREATED_DATE DESC` (business rule: users see only their own leave requests).
- Populates `RG_LEAVE_TYPES` LOV.
- `GO_BLOCK('LEAVE_REQUEST'); EXECUTE_QUERY;`
- `GO_BLOCK('LEAVE_BALANCE'); EXECUTE_QUERY;` then returns focus: `GO_BLOCK('LEAVE_REQUEST')`.

**Block: LEAVE_REQUEST** (table `HRMS.LEAVE_REQUESTS`, RecordsDisplayed=8, read-only: Insert/Update/DeleteAllowed=No)
- Items: `REQUEST_ID` (PK hidden), `EMP_ID` (hidden), `LEAVE_TYPE_NAME_DISP` (non-DB display), `START_DATE`/`END_DATE` (Date MM/DD/YYYY), `TOTAL_DAYS` (Number 990.0), `STATUS` (Char), `REASON` (Char)
- Button `BTN_CANCEL_REQUEST` (`WHEN-BUTTON-PRESSED`):
  - Business rule: only requests with `STATUS IN ('PENDING','APPROVED')` may be cancelled; else `MESSAGE('Only pending or approved requests can be cancelled.')` + `FORM_TRIGGER_FAILURE`.
  - Confirms via `ALT_CONFIRM_CANCEL`; on Button1 (Yes) → `PKG_LEAVE.cancel_leave_request(:LEAVE_REQUEST.REQUEST_ID, 'Cancelled by employee', :GLOBAL.current_user)`; message; `EXECUTE_QUERY`.
  - Dependency: `PKG_LEAVE.cancel_leave_request`.
- `POST-QUERY` trigger: `SELECT lt.LEAVE_TYPE_NAME INTO :LEAVE_REQUEST.LEAVE_TYPE_NAME_DISP FROM LEAVE_TYPES lt JOIN LEAVE_REQUESTS lr ON lt.LEAVE_TYPE_ID=lr.LEAVE_TYPE_ID WHERE lr.REQUEST_ID=:LEAVE_REQUEST.REQUEST_ID`; `WHEN NO_DATA_FOUND` → sets display to `'Unknown'`.

**Block: NEW_REQUEST** (control block, QueryDataSourceType=None, InsertAllowed=Yes)
- Items: `NR_LEAVE_TYPE_ID` (Number, LOV=LOV_LEAVE_TYPES), `NR_LEAVE_TYPE_DISP` (display), `NR_START_DATE`/`NR_END_DATE` (Date), `NR_HALF_DAY` (Check Box Y/N), `NR_REASON` (Char 500, MultiLine), `NR_CALC_DAYS` (display Number), `NR_BALANCE_DISP` (display Number)
- Button `BTN_SUBMIT` (`WHEN-BUTTON-PRESSED`):
  - Validation: `NR_LEAVE_TYPE_ID` required → 'Please select a leave type.'; `NR_START_DATE` required → 'Please enter a start date.'; `NR_END_DATE` required → 'Please enter an end date.' — each raises `FORM_TRIGGER_FAILURE` on failure.
  - Calls `PKG_LEAVE.submit_leave_request(p_emp_id=>:GLOBAL.current_emp_id, p_leave_type_id=>:NEW_REQUEST.NR_LEAVE_TYPE_ID, p_start_date=>:NEW_REQUEST.NR_START_DATE, p_end_date=>:NEW_REQUEST.NR_END_DATE, p_half_day_flag=>NVL(:NEW_REQUEST.NR_HALF_DAY,'N'), p_reason=>:NEW_REQUEST.NR_REASON, p_user=>:GLOBAL.current_user)` → returns `v_request_id`.
  - Success message includes request ID; `CLEAR_BLOCK(NO_VALIDATE)`; refreshes `LEAVE_REQUEST` block (`GO_BLOCK` + `EXECUTE_QUERY`).
  - Dependency: `PKG_LEAVE.submit_leave_request`.

**Block: LEAVE_BALANCE** (table `HRMS.LEAVE_BALANCES`, read-only, RecordsDisplayed=6)
- Display items: `LEAVE_TYPE_NAME_DISP`, `OPENING_BALANCE`, `ACCRUED`, `USED`, `PENDING`, `AVAILABLE` (all Number 990.0 format except type name).

**LOV**: `LOV_LEAVE_TYPES` → RecordGroup `RG_LEAVE_TYPES`: `SELECT LEAVE_TYPE_ID, LEAVE_TYPE_CODE, LEAVE_TYPE_NAME FROM HRMS.LEAVE_TYPES WHERE ACTIVE_FLAG='Y' ORDER BY LEAVE_TYPE_NAME`; maps to `NEW_REQUEST.NR_LEAVE_TYPE_ID` / `NR_LEAVE_TYPE_DISP`.

**Canvas**: `CVS_MAIN` (Tab, 4 pages: My Requests, Submit Request, Pending Approvals, Team Calendar) — note: "Pending Approvals" and "Team Calendar" tab pages are declared but no corresponding data blocks (`PENDING_APPROVAL`, `TEAM_CAL` mentioned in the file's header comment) are actually defined in this XML — **incomplete/stub implementation**, consistent with header comment listing 5 data blocks but only 3 (`LEAVE_REQUEST`, `NEW_REQUEST`, `LEAVE_BALANCE`) are present.
**Window**: `WIN_LEAVE`, Document, 720x520.
**Alert**: `ALT_CONFIRM_CANCEL` (Caution, Yes/No).

**Dependencies summary**: `PKG_SECURITY.is_session_valid`, `PKG_LEAVE.cancel_leave_request`, `PKG_LEAVE.submit_leave_request`; Tables `LEAVE_REQUESTS`, `LEAVE_TYPES`, `LEAVE_BALANCES`.

=== FILE: forms/xml-exports/HRMS_LOGIN.xml ===

**Type**: Oracle Forms XML export — Login form (authenticates and opens main menu).
**Form Module**: `HRMS_LOGIN`, FirstNavigationBlock=`LOGIN`.
**Documented known issues (security)**:
- Password field transmitted in cleartext (Forms applet limitation)
- No account lockout after failed attempts
- No CAPTCHA or 2FA support

**Form-level trigger `WHEN-NEW-FORM-INSTANCE`**: sets MDI window title 'HRMS Login'; sets `WIN_LOGIN` window state NORMAL; `GO_ITEM('LOGIN.USERNAME')`.

**Block: LOGIN** (control block, QueryDataSourceType=None, RecordsDisplayed=1)
- `COMPANY_LOGO`: Image item (GIF).
- `USERNAME`: Char(100), Required.
- `PASSWORD`: Char(100), Required, `ConcealData="Yes"` (masked input).
- `ERROR_MSG`: Display item Char(200), red bold text.
- Button `BTN_LOGIN` (`WHEN-BUTTON-PRESSED`):
  - Clears `:LOGIN.ERROR_MSG`.
  - Validates username/password not null → else 'Please enter username and password.' + `FORM_TRIGGER_FAILURE`.
  - Calls `PKG_SECURITY.authenticate(:LOGIN.USERNAME, :LOGIN.PASSWORD, GET_APPLICATION_PROPERTY(CLIENT_HOST))` → `v_session_id`.
  - On success: sets `:GLOBAL.session_id := TO_CHAR(v_session_id)`; `:GLOBAL.current_user := :LOGIN.USERNAME`.
  - Looks up employee: `SELECT EMP_ID INTO :GLOBAL.current_emp_id FROM EMPLOYEES WHERE UPPER(EMAIL)=UPPER(:LOGIN.USERNAME) AND EMPLOYMENT_STATUS='ACTIVE' AND ROWNUM=1` — **business rule**: username is matched against employee EMAIL (case-insensitive), only ACTIVE employees can resolve to an emp_id; `ROWNUM=1` silently picks an arbitrary row if duplicates exist (masking potential data integrity issues rather than raising an error).
  - `OPEN_FORM('HRMS_MENU', ACTIVATE, SESSION)`.
  - `EXCEPTION WHEN OTHERS THEN` → generic `'Invalid username or password.'` (deliberately vague to avoid leaking whether username exists — reasonable security practice), clears password field, refocuses password, raises `FORM_TRIGGER_FAILURE`. **Note**: this catch-all also swallows the `SELECT ... INTO` NO_DATA_FOUND/TOO_MANY_ROWS from the EMP_ID lookup and any error from `PKG_SECURITY.authenticate` uniformly.
- `KEY-NEXT-ITEM` trigger: if cursor on `LOGIN.PASSWORD`, triggers `DO_KEY('WHEN-BUTTON-PRESSED')` (Enter key submits login); else `NEXT_ITEM`.

**Canvas**: `CVS_LOGIN` (Content, white background). **Window**: `WIN_LOGIN` (Dialog, 700x320, not closeable/minimizable/maximizable, movable, not resizable).

**Dependencies summary**: `PKG_SECURITY.authenticate`; Table `EMPLOYEES` (EMP_ID, EMAIL, EMPLOYMENT_STATUS); Global vars `:GLOBAL.session_id`, `:GLOBAL.current_user`, `:GLOBAL.current_emp_id`.

=== FILE: forms/xml-exports/HRMS_MENU.xml ===

**Type**: Oracle Forms XML export — MDI parent/main navigation form (application shell post-login).
**Form Module**: `HRMS_MENU`, FirstNavigationBlock=`MENU_CONTROL`.
**Attached Library**: `HRMS_COMMON_LIB`.

**`WHEN-NEW-FORM-INSTANCE` trigger:**
- Sets window title: `'Human Resource Management System (HRMS) v4.2 - ' || :GLOBAL.current_user || ' - Session: ' || :GLOBAL.session_id`.
- Permission-based menu item disabling:
  - `PKG_SECURITY.has_permission(:GLOBAL.current_emp_id,'PAYROLL','VIEW')` false → disables `MENU_MAIN.MI_PAYROLL`.
  - `...'ADMIN','VIEW'` false → disables `MENU_MAIN.MI_ADMIN`.
  - `...'REPORTS','VIEW'` false → disables `MENU_MAIN.MI_REPORTS`.
- `GO_BLOCK('MENU_CONTROL')`.

**Block: MENU_CONTROL** (control block, no query source)
- `WELCOME_TEXT`, `USER_INFO`: display items.
- Push buttons, each with `WHEN-BUTTON-PRESSED`:
  - `BTN_EMPLOYEES` → `OPEN_FORM('HRMS_EMPLOYEE', ACTIVATE, SESSION)` (no permission check at button level — relies on target form's own `WHEN-NEW-FORM-INSTANCE` check).
  - `BTN_PAYROLL` → checks `PKG_SECURITY.has_permission(:GLOBAL.current_emp_id,'PAYROLL','VIEW')`; if false → `MESSAGE('Access denied.')` + `FORM_TRIGGER_FAILURE`; else `OPEN_FORM('HRMS_PAYROLL', ACTIVATE, SESSION)`.
  - `BTN_LEAVE` → `OPEN_FORM('HRMS_LEAVE', ACTIVATE, SESSION)` (no button-level check).
  - `BTN_PERFORMANCE` → `OPEN_FORM('HRMS_PERFORMANCE', ACTIVATE, SESSION)` (no button-level check).
  - `BTN_REPORTS` → checks `PKG_SECURITY.has_permission(...,'REPORTS','VIEW')`; denied → message + failure; else `OPEN_FORM('HRMS_REPORTS', ACTIVATE, SESSION)`.
  - `BTN_LOGOUT` → `PKG_SECURITY.logout(TO_NUMBER(:GLOBAL.session_id))`; `EXIT_FORM`.

**MenuModule Name="MENU_MAIN"** (actual menu bar definition):
- File menu: `MI_LOGOUT` → `PKG_SECURITY.logout(...); EXIT_FORM;`
- Modules menu: `MI_EMPLOYEES`, `MI_PAYROLL`, `MI_LEAVE`, `MI_PERFORMANCE`, `MI_REPORTS` → respective `OPEN_FORM` calls (again, `MI_PAYROLL`/`MI_REPORTS` menu items don't appear to embed a permission check at the CommandText level, unlike their button counterparts — a possible inconsistency: `SET_MENU_ITEM_PROPERTY(...,ENABLED,PROPERTY_FALSE)` in the form trigger is the only gate for the menu path, whereas the button path has both the disabled state AND an explicit runtime check — differing depth of defense between two access paths to the same forms).
- Admin menu: `MI_ADMIN` → `OPEN_FORM('HRMS_ADMIN',...)`; `MI_CHANGE_PWD` → `SHOW_WINDOW('WIN_CHANGE_PWD')`.
- Help menu: `MI_ABOUT` → `MESSAGE('HRMS v4.2 - Build 2024.03.15')`.

**Canvas**: `CVS_MAIN` (Content, 740x400). **Window**: `WIN_MAIN` (Document, 760x420).

**Dependencies summary**: `PKG_SECURITY` (has_permission, logout); Global vars `:GLOBAL.current_user`, `:GLOBAL.session_id`, `:GLOBAL.current_emp_id`.

=== FILE: forms/xml-exports/HRMS_PAYROLL.xml ===

**Type**: Oracle Forms XML export — Payroll Processing form.
**Form Module**: `HRMS_PAYROLL`, MenuModule=`HRMS_MENU`, FirstNavigationBlock=`PAY_PERIOD`.
**Attached Library**: `HRMS_COMMON_LIB`.

**`WHEN-NEW-FORM-INSTANCE` trigger:**
- Session validation via `PKG_SECURITY.is_session_valid` (same pattern as other forms); fail → message + `FORM_TRIGGER_FAILURE`.
- **Module-level authorization**: `PKG_SECURITY.has_permission(:GLOBAL.current_emp_id,'PAYROLL','VIEW')`; if false → `MESSAGE('You do not have permission to access the Payroll module.')` + `FORM_TRIGGER_FAILURE` (blocks the entire form from loading — stronger gate than Employee form, which only restricts CRUD but still lets unauthorized users view).
- Sets window title.
- `GO_BLOCK('PAY_PERIOD')`; sets default WHERE: `STATUS = 'OPEN' ORDER BY PERIOD_START_DATE DESC`; `EXECUTE_QUERY`.

**Block: PAY_PERIOD** (table `HRMS.PAY_PERIODS`, RecordsDisplayed=10, read-only)
- Items: `PERIOD_ID` (PK hidden), `PERIOD_NAME`, `PERIOD_START_DATE`, `PERIOD_END_DATE`, `PAY_DATE` (all Date MM/DD/YYYY where applicable), `STATUS`.

**Block: PAYROLL_RUN** (table `HRMS.PAYROLL_RUNS`, RecordsDisplayed=5, read-only for CRUD but has action buttons)
- Items: `RUN_ID` (PK hidden), `PERIOD_ID` (hidden), `RUN_TYPE`, `RUN_DATE` (MM/DD/YYYY HH24:MI), `STATUS`, `EMPLOYEE_COUNT`, `TOTAL_GROSS`/`TOTAL_NET` (format $999,999,990.00).
- Button `BTN_CREATE_RUN` (`WHEN-BUTTON-PRESSED`):
  - `v_run_id := PKG_PAYROLL.create_payroll_run(:PAY_PERIOD.PERIOD_ID, 'REGULAR', :GLOBAL.current_user)`.
  - Message with new run ID; `GO_BLOCK('PAYROLL_RUN')`; `EXECUTE_QUERY`.
  - **No permission check at this button** (relies solely on form-level VIEW permission checked at open — meaning any user who can view Payroll can also create a run; no separate CREATE/EDIT permission gate here).
  - Dependency: `PKG_PAYROLL.create_payroll_run`.
- Button `BTN_CALCULATE` (`WHEN-BUTTON-PRESSED`):
  - Business rule: `:PAYROLL_RUN.STATUS != 'PENDING'` → `MESSAGE('Can only calculate runs in PENDING status.')` + `FORM_TRIGGER_FAILURE`.
  - `MESSAGE('Calculating payroll... Please wait.'); SYNCHRONIZE;` (forces UI repaint before long-running call).
  - `PKG_PAYROLL.calculate_payroll(:PAYROLL_RUN.RUN_ID, :GLOBAL.current_user)`.
  - Message complete; `EXECUTE_QUERY`.
  - Dependency: `PKG_PAYROLL.calculate_payroll`. No explicit permission check here either.
- Button `BTN_APPROVE` (`WHEN-BUTTON-PRESSED`):
  - **Explicit permission check**: `PKG_SECURITY.has_permission(:GLOBAL.current_emp_id,'PAYROLL','APPROVE')`; false → `MESSAGE('You do not have permission to approve payroll.')` + `FORM_TRIGGER_FAILURE`.
  - `PKG_PAYROLL.approve_payroll(:PAYROLL_RUN.RUN_ID, :GLOBAL.current_user)`; message; `EXECUTE_QUERY`.
  - Dependency: `PKG_PAYROLL.approve_payroll`.
- Relation `PERIOD_RUN_REL`: `PAYROLL_RUN.PERIOD_ID = PAY_PERIOD.PERIOD_ID`, AutoQuery=Yes.

**Canvas**: `CVS_MAIN` (Tab, 3 pages: Pay Periods, Payroll Runs, Pay Details). Note: "Pay Details" tab page and corresponding `PAYROLL_DETAIL`/`PAYSLIP_SUMMARY` blocks (mentioned in header comment as 4 data blocks total) are **not actually defined** in this XML — only `PAY_PERIOD` and `PAYROLL_RUN` blocks exist; stub/incomplete tab.
**Window**: `WIN_PAYROLL` (Document, 770x560).

**Dependencies summary**: `PKG_SECURITY` (is_session_valid, has_permission); `PKG_PAYROLL` (create_payroll_run, calculate_payroll, approve_payroll); Tables `PAY_PERIODS`, `PAYROLL_RUNS`.

**Business rules embedded**: Payroll run lifecycle — PENDING → (Calculate) → CALCULATED → (Approve, requires PAYROLL/APPROVE permission) → APPROVED; runs can only be calculated when in PENDING status; only OPEN pay periods shown by default.

=== FILE: forms/xml-exports/HRMS_PERFORMANCE.xml ===

**Type**: Oracle Forms XML export — Performance Review Management form.
**Form Module**: `HRMS_PERFORMANCE`, MenuModule=`HRMS_MENU`, FirstNavigationBlock=`REVIEW_CYCLE`.
**Attached Library**: `HRMS_COMMON_LIB`.

**`WHEN-NEW-FORM-INSTANCE` trigger:**
- Session validation via `PKG_SECURITY.is_session_valid`; fail → message + `FORM_TRIGGER_FAILURE`. **No module-level permission check** (`PKG_SECURITY.has_permission`) here unlike Payroll form — any authenticated user can open this form.
- Sets window title.
- `GO_BLOCK('REVIEW_CYCLE')`; default WHERE: `STATUS IN ('OPEN','DRAFT') ORDER BY CYCLE_YEAR DESC`; `EXECUTE_QUERY`.

**Block: REVIEW_CYCLE** (table `HRMS.REVIEW_CYCLES`, RecordsDisplayed=5, read-only)
- Items: `CYCLE_ID` (PK hidden), `CYCLE_NAME`, `CYCLE_YEAR` (Number), `START_DATE`/`END_DATE` (Date), `STATUS`.

**Block: PERFORMANCE_REVIEW** (table `HRMS.PERFORMANCE_REVIEWS`, RecordsDisplayed=8, UpdateAllowed=Yes, Insert/DeleteAllowed=No)
- Items: `REVIEW_ID` (PK hidden), `CYCLE_ID` (hidden), `EMP_ID` (hidden), `EMP_NAME_DISP` (non-DB display), `STATUS` (UpdateAllowed=No — status transitions must happen through another mechanism not shown in this form), `OVERALL_RATING` (Number 9.0, editable), `RATING_LABEL` (display, though marked DatabaseItem=Yes oddly for a "Display Item" type — inconsistent typing: declared as `ItemType="Display Item"` yet `DatabaseItem="Yes"`), `SELF_ASSESSMENT`/`MANAGER_ASSESSMENT` (Char 300x80, MultiLine, editable).
- `POST-QUERY` trigger: `SELECT FIRST_NAME||' '||LAST_NAME INTO :PERFORMANCE_REVIEW.EMP_NAME_DISP FROM EMPLOYEES WHERE EMP_ID=:PERFORMANCE_REVIEW.EMP_ID`; `WHEN NO_DATA_FOUND` → `'Unknown'`.
- Relation `CYCLE_REVIEW_REL`: `PERFORMANCE_REVIEW.CYCLE_ID = REVIEW_CYCLE.CYCLE_ID`, AutoQuery=Yes.
- **No explicit authorization check restricting who can edit `OVERALL_RATING`/assessments** — any user who can open this form and navigate to a review record can update ratings/assessments at the Forms layer (relies entirely on DB-level constraints/UpdateAllowed flags, no `PKG_SECURITY.has_permission` gate visible for edit vs. view distinction, unlike Employee/Payroll forms).

**Block: PERFORMANCE_GOAL** (table `HRMS.PERFORMANCE_GOALS`, RecordsDisplayed=5, Insert/UpdateAllowed=Yes, DeleteAllowed=No)
- Items: `GOAL_ID` (PK hidden), `REVIEW_ID` (hidden), `GOAL_TITLE` (Char 250), `GOAL_CATEGORY` (List Item Poplist: Business/Development/Leadership), `WEIGHT_PCT` (Number 990), `PROGRESS_PCT` (Number 990), `STATUS` (Char).
- Relation `REVIEW_GOAL_REL`: `PERFORMANCE_GOAL.REVIEW_ID = PERFORMANCE_REVIEW.REVIEW_ID`, AutoQuery=Yes.

**Canvas**: `CVS_MAIN` (Tab, 3 pages: Review Cycles, My Reviews, Goals). Note header comment mentions 4 data blocks including `REVIEW_DETAIL`, but only 3 blocks (`REVIEW_CYCLE`, `PERFORMANCE_REVIEW`, `PERFORMANCE_GOAL`) are defined — another stub/incomplete block, same pattern as HRMS_LEAVE and HRMS_PAYROLL.
**Window**: `WIN_PERFORMANCE` (Document, 770x560).

**Dependencies summary**: `PKG_SECURITY.is_session_valid`; Tables `REVIEW_CYCLES`, `PERFORMANCE_REVIEWS`, `PERFORMANCE_GOALS`, `EMPLOYEES`.

=== FILE: plsql/triggers/trg_audit.sql ===

**Type**: Database trigger DDL — generic audit triggers for change tracking (compliance).

1. **`HRMS.TRG_SALARY_AUDIT`** — `AFTER INSERT OR UPDATE OR DELETE ON HRMS.SALARY_RECORDS`, `FOR EACH ROW`
   - Declares `v_action VARCHAR2(10)`, `v_old_json CLOB`, `v_new_json CLOB`.
   - `INSERTING`: `v_action:='INSERT'`; builds `v_new_json` = `{"emp_id":<NEW.EMP_ID>,"salary":<NEW.BASE_SALARY>,"effective":"<NEW.EFFECTIVE_DATE formatted YYYY-MM-DD>"}` (manual string concatenation, not a JSON-safe builder — risk of malformed JSON if values contain quotes, though numeric/date fields here are relatively safe).
   - `UPDATING`: `v_action:='UPDATE'`; `v_old_json`={"salary":OLD.BASE_SALARY,"active":"OLD.ACTIVE_FLAG"}; `v_new_json`={"salary":NEW.BASE_SALARY,"active":"NEW.ACTIVE_FLAG"} — **note**: only captures salary+active_flag deltas, not effective_date/change_reason/etc.
   - `DELETING`: `v_action:='DELETE'`; `v_old_json`={"emp_id":OLD.EMP_ID,"salary":OLD.BASE_SALARY}.
   - Calls `PKG_AUDIT.log_action('SALARY_RECORDS', NVL(:NEW.SALARY_ID,:OLD.SALARY_ID), v_action, NVL(:NEW.MODIFIED_BY,USER), v_old_json, v_new_json)`.
   - Dependency: `PKG_AUDIT.log_action`.

2. **`HRMS.TRG_LEAVE_REQUEST_AUDIT`** — `AFTER UPDATE OF STATUS ON HRMS.LEAVE_REQUESTS`, `FOR EACH ROW`
   - Fires only when `STATUS` column changes.
   - Calls `PKG_AUDIT.log_action('LEAVE_REQUESTS', :NEW.REQUEST_ID, 'STATUS_CHANGE', NVL(:NEW.MODIFIED_BY,USER), '{"status":"<OLD.STATUS>"}', '{"status":"<NEW.STATUS>"}')`.

3. **`HRMS.TRG_DEPARTMENT_AUDIT`** — `AFTER INSERT OR UPDATE OR DELETE ON HRMS.DEPARTMENTS`, `FOR EACH ROW`
   - Sets `v_action` based on operation (INSERT/UPDATE/DELETE).
   - Calls `PKG_AUDIT.log_action('DEPARTMENTS', NVL(:NEW.DEPT_ID,:OLD.DEPT_ID), v_action, USER)` — **note**: this call has only 4 arguments (table, record_id, action, user) vs. the 6-argument call used for SALARY_RECORDS and LEAVE_REQUESTS (which also pass old/new JSON) — implies `PKG_AUDIT.log_action` must be overloaded or have optional/default parameters for old_values/new_values; department changes are NOT capturing old/new value deltas at all, just the fact that a change occurred.

**External dependency**: `PKG_AUDIT.log_action` (used by all 3 triggers; must support both 4-arg and 6-arg call signatures).
**Business rule**: Salary, leave status, and department changes are all audited for compliance; audit granularity varies by table (salary/leave capture before/after values as JSON strings, department changes do not).

=== FILE: plsql/triggers/trg_employees.sql ===

**Type**: Database trigger DDL — EMPLOYEES table triggers enforcing business rules at DB level (explicitly documented as duplicating logic also present in `PKG_EMPLOYEE` and Forms triggers — a known anti-pattern/technical debt).

1. **`HRMS.TRG_EMP_BEFORE_INSERT`** — `BEFORE INSERT ON HRMS.EMPLOYEES`, `FOR EACH ROW`
   - Sets `:NEW.CREATED_BY := USER` if null.
   - Sets `:NEW.CREATED_DATE := SYSDATE` if null.
   - Defaults `:NEW.ACTIVE_FLAG := 'Y'` if null.
   - Defaults `:NEW.EMPLOYMENT_STATUS := 'ACTIVE'` if null.
   - **Validation**: `:NEW.HIRE_DATE > SYSDATE + 180` → `RAISE_APPLICATION_ERROR(-20501, 'Hire date cannot be more than 180 days in the future')`. **Business-rule drift**: contrasts with the Forms-level `WHEN-VALIDATE-ITEM` check in HRMS_EMPLOYEE.xml which uses a 90-day threshold — the DB and UI enforce different limits, meaning a hire date between 91–180 days out would fail client-side (Forms) validation before it could ever reach this DB check, but if inserted via any other path (batch job, direct SQL, another app), only the 180-day rule applies. Real inconsistency, not just a comment artifact.
   - **Validation**: Email uniqueness check via `SELECT COUNT(*) FROM EMPLOYEES WHERE UPPER(EMAIL)=UPPER(:NEW.EMAIL) AND ACTIVE_FLAG='Y'`; if count > 0 → `RAISE_APPLICATION_ERROR(-20502, 'Email address already in use: ' || :NEW.EMAIL)`. Noted as redundant-but-clearer-message alongside an actual unique constraint (though re-reading the DDL for EMPLOYEES in schema/tables/01_core_tables.sql, there is **no unique constraint on EMAIL** defined — only `UK_EMP_NUMBER` on EMP_NUMBER — so this trigger-based check is actually the *only* enforcement of email uniqueness among active employees, contradicting the comment's claim of a backing unique constraint; and note it only checks `ACTIVE_FLAG='Y'` rows, so a terminated employee's email could be reused by a new employee without conflict).

2. **`HRMS.TRG_EMP_BEFORE_UPDATE`** — `BEFORE UPDATE ON HRMS.EMPLOYEES`, `FOR EACH ROW`
   - `:NEW.MODIFIED_BY := NVL(:NEW.MODIFIED_BY, USER)`; `:NEW.MODIFIED_DATE := SYSDATE`.
   - **Business rule**: Prevents direct reactivation — `:OLD.EMPLOYMENT_STATUS='TERMINATED' AND :NEW.EMPLOYMENT_STATUS='ACTIVE'` → `RAISE_APPLICATION_ERROR(-20503, 'Cannot directly reactivate a terminated employee. Use the rehire process.')`.
   - **Audit/history logging** into `EMPLOYEE_HISTORY` table for three change types (each a separate INSERT using `SEQ_EMP_HISTORY.NEXTVAL`):
     - Status change (`:OLD.EMPLOYMENT_STATUS != :NEW.EMPLOYMENT_STATUS`): CHANGE_TYPE='STATUS_CHANGE', OLD_VALUE/NEW_VALUE = old/new status strings, CHANGE_REASON='Triggered by status update'.
     - Department transfer (`NVL(:OLD.DEPT_ID,-1) != NVL(:NEW.DEPT_ID,-1)`): CHANGE_TYPE='DEPARTMENT_CHANGE', OLD_VALUE/NEW_VALUE=TO_CHAR(dept ids), CHANGE_REASON='Department transfer'.
     - Job change (`NVL(:OLD.JOB_ID,-1) != NVL(:NEW.JOB_ID,-1)`): CHANGE_TYPE='JOB_CHANGE', OLD_VALUE/NEW_VALUE=TO_CHAR(job ids), CHANGE_REASON='Job title change'.
   - **Schema mismatch note**: This trigger inserts into `EMPLOYEE_HISTORY` with columns `HISTORY_ID, EMP_ID, CHANGE_TYPE, CHANGE_DATE, OLD_VALUE, NEW_VALUE, CHANGED_BY, CHANGE_REASON`, but the DDL for `EMPLOYEE_HISTORY` in schema/tables/01_core_tables.sql defines columns `HIST_ID, EMP_ID, CHANGE_TYPE, EFFECTIVE_DATE, OLD_DEPT_ID, NEW_DEPT_ID, OLD_JOB_ID, NEW_JOB_ID, OLD_MANAGER_ID, NEW_MANAGER_ID, OLD_SALARY, NEW_SALARY, OLD_LOCATION, NEW_LOCATION, REASON_CODE, COMMENTS, CREATED_BY, CREATED_DATE` — **completely different column names/shape** (`HISTORY_ID` vs `HIST_ID`, `CHANGE_DATE` vs `EFFECTIVE_DATE`, generic `OLD_VALUE`/`NEW_VALUE` vs typed old/new columns per attribute, `CHANGED_BY`/`CHANGE_REASON` vs `CREATED_BY`/`REASON_CODE`/`COMMENTS`). This INSERT would fail against the actual table DDL as documented — a genuine cross-file schema defect.
   - Also note the `CHK_CHANGE_TYPE` constraint on `EMPLOYEE_HISTORY` only allows values `HIRE, TRANSFER, PROMOTION, DEMOTION, SALARY_CHANGE, TERMINATION, REHIRE, LEAVE_START, LEAVE_END, STATUS_CHANGE` — this trigger uses `'DEPARTMENT_CHANGE'` and `'JOB_CHANGE'`, neither of which is in the allowed constraint list (closest allowed value is `'TRANSFER'`) — would violate `CHK_CHANGE_TYPE` even if the column-shape mismatch were fixed.

3. **`HRMS.TRG_EMP_INSTEAD_OF_DELETE`** (named as before-delete, comment block above mislabels it "TRG_EMP_AFTER_DELETE") — `BEFORE DELETE ON HRMS.EMPLOYEES`, `FOR EACH ROW`
   - Unconditionally raises `RAISE_APPLICATION_ERROR(-20504, 'Direct deletion not allowed. Use termination process or set ACTIVE_FLAG to N.')` — blocks all physical deletes.
   - **Documented bug**: comment explicitly notes this actually *prevents* deletion (contrary to what "instead of soft delete" implies) and that Oracle Forms expects DELETE to succeed — the documented workaround is for Forms to set `ACTIVE_FLAG='N'` then `CLEAR_RECORD` instead of calling `DELETE_RECORD`. This is a known UX/maintenance trap: any code path (Forms `DELETE_RECORD`, ad hoc SQL) that issues a real DELETE against EMPLOYEES will always fail with ORA error -20504.

**Dependencies**: Table `EMPLOYEE_HISTORY`, sequence `SEQ_EMP_HISTORY`. Exceptions raised: -20501 (hire date), -20502 (duplicate email), -20503 (reactivate terminated), -20504 (delete blocked).

=== FILE: README.md ===

**Type**: Project documentation (Markdown), not executable code.

**Key facts extracted:**
- Application: "Oracle Forms Legacy HR System" / HRMS — modernization/migration workshop reference codebase.
- Modules: Employee Records, Department & Organization, Payroll Processing, Leave Management, Performance Reviews, Reporting.
- History: built in Oracle Forms 6i (~2002), upgraded to Forms 11g (2012), currently Forms 12c + Oracle DB 19c. ~200 concurrent users, 3 regional offices.
- Architecture diagram: Oracle Forms 12c App Server → Oracle WebLogic 12c Server → three downstream layers: Forms Modules (.fmb/.fmx, 18 forms), PL/SQL Packages & Procedures (12 packages), Oracle Reports (.rdf/.rep, 8 reports) → all backed by Oracle Database 19c (HRMS schema: 42 tables, 15 views, 200+ triggers).
- Directory structure documents intended layout: `forms/xml-exports/` (10 forms listed: HRMS_EMPLOYEE, HRMS_DEPARTMENT, HRMS_PAYROLL, HRMS_LEAVE, HRMS_PERFORMANCE, HRMS_LOGIN, HRMS_MENU, HRMS_REPORTS, HRMS_LOV, HRMS_TOOLBAR — note only 7 of these 10 were provided/scanned: HRMS_EMPLOYEE, HRMS_LEAVE, HRMS_LOGIN, HRMS_MENU, HRMS_PAYROLL, HRMS_PERFORMANCE exist among scanned files, plus HRMS_MENU.mmb.sql; HRMS_DEPARTMENT, HRMS_REPORTS, HRMS_LOV, HRMS_TOOLBAR, HRMS_ADMIN were referenced by other files — e.g. OPEN_FORM('HRMS_ADMIN',...), OPEN_FORM('HRMS_REPORTS',...) — but not present in the scanned set); `plsql/packages/` lists 12 packages: PKG_EMPLOYEE, PKG_DEPARTMENT, PKG_PAYROLL, PKG_LEAVE, PKG_PERFORMANCE, PKG_SECURITY, PKG_AUDIT, PKG_NOTIFICATION, PKG_REPORTING, PKG_COMMON, PKG_VALIDATION, PKG_INTEGRATION (each with .pks/.pkb) — **none of these package spec/body files were included in the scanned file set**, meaning all package dependencies referenced throughout the forms/triggers (PKG_SECURITY, PKG_EMPLOYEE, PKG_LEAVE, PKG_PAYROLL, PKG_VALIDATION, PKG_AUDIT, PKG_COMMON) are unresolved/external to this scan.
- Also references `schema/tables/`, `schema/views/`, `schema/sequences/`, `schema/indexes/`, `schema/constraints/`, `data/`, `config/`, `docs/` directories — indexes/constraints subdirectories not present in scanned files (constraints appear inline in table DDL instead).

**Documented Oracle Forms specifics**: trigger types used (`WHEN-NEW-FORM-INSTANCE`, `WHEN-VALIDATE-ITEM`, `WHEN-BUTTON-PRESSED`, `POST-QUERY`, `PRE-INSERT`, `PRE-UPDATE`); LOV record groups w/ dynamic WHERE; canvas/block master-detail; PLL shared libraries; menu modules with role-based security.

**Documented PL/SQL patterns**: `DBMS_OUTPUT`, `UTL_FILE`, `UTL_MAIL` built-ins; row-by-row cursor processing; custom exception codes -20000 to -20999 (consistent with -20501..-20504 seen in trg_employees.sql); `EXECUTE IMMEDIATE` dynamic SQL in "several procedures" (none scanned here); package-level global variables for session state; `%ROWTYPE`/`%TYPE`.

**Documented DB patterns**: surrogate keys via sequence + BEFORE INSERT trigger (matches SEQ_EMPLOYEE/TRG_EMP_BEFORE_INSERT pattern observed); soft deletes via `ACTIVE_FLAG`; audit columns on every table; `_HIST` suffix history tables (though actual table found is named `EMPLOYEE_HISTORY`, not `EMPLOYEE_HIST` — naming convention described doesn't exactly match); denormalized reporting tables refreshed nightly by batch jobs (no batch job scripts scanned).

**Explicitly documented technical debt** (self-reported known issues):
- No unit tests — manual testing only via Forms.
- Business logic split between Forms triggers and DB packages with no clear boundary (confirmed by observed duplication: email/hire-date validation exists in both HRMS_EMPLOYEE.xml WHEN-VALIDATE-ITEM and TRG_EMP_BEFORE_INSERT, with differing thresholds).
- Packages exceeding 3,000 lines (not verifiable from scanned files — no package bodies scanned).
- Hard-coded configuration values in package bodies.
- `VARCHAR2(4000)` used as catch-all text field type (matches REASON, COMMENTS, ERROR_MESSAGE, APPROVAL_COMMENTS, CANCEL_REASON columns seen in schema files).
- Mixed naming conventions (CAMELCASE vs UNDERSCORE_CASE) — not strongly evidenced in scanned SQL (mostly UNDERSCORE_CASE throughout), possibly more visible in unscanned package bodies.
- Dead code from decommissioned modules still present.
- Circular package dependencies between `PKG_EMPLOYEE` and `PKG_PAYROLL` (both unscanned, so relationship not directly verifiable here but documented as fact).

**License**: MIT.

=== FILE: schema/sequences/hrms_sequences.sql ===

**Type**: DDL — sequence definitions (surrogate key generators). No UUID/GUID usage (explicitly noted as typical for this application era).

**Sequences defined** (all `NOCACHE` except two noted):
- Core: `SEQ_DEPARTMENT` (START 100), `SEQ_LOCATION` (START 100), `SEQ_JOB_GRADE` (START 100), `SEQ_JOB_TITLE` (START 100), `SEQ_EMPLOYEE` (START 10000), `SEQ_EMP_HISTORY` (START 1), `SEQ_DEPENDENT` (START 1), `SEQ_EMERGENCY_CONTACT` (START 1)
- `SEQ_EMP_NUMBER` (START 1000) — **documented bug**: NOCACHE means sequence value gaps are expected/normal, but the actual employee-number generator `PKG_EMPLOYEE.generate_emp_number` (referenced in HRMS_EMPLOYEE.xml PRE-INSERT trigger, not scanned directly) reportedly uses `MAX()+1` logic instead of this sequence, which the comment states **creates a race condition** (two concurrent inserts could compute the same MAX()+1 value before either commits, producing duplicate EMP_NUMBER values) — a genuine concurrency defect, and it also means this sequence may be entirely unused/orphaned if generate_emp_number doesn't call NEXTVAL on it.
- Payroll: `SEQ_SALARY`, `SEQ_PAY_ELEMENT`, `SEQ_EMP_PAY_ELEMENT`, `SEQ_PAY_PERIOD`, `SEQ_PAYROLL_RUN`, `SEQ_PAYROLL_DETAIL`, `SEQ_TAX_BRACKET` (all START 1, NOCACHE)
- Leave: `SEQ_LEAVE_TYPE`, `SEQ_LEAVE_BALANCE`, `SEQ_LEAVE_REQUEST`, `SEQ_LEAVE_ACCRUAL`, `SEQ_HOLIDAY` (all START 1, NOCACHE)
- Performance: `SEQ_REVIEW_CYCLE`, `SEQ_PERF_REVIEW`, `SEQ_PERF_GOAL` (START 1, NOCACHE)
- System: `SEQ_AUDIT` (START 1, **CACHE 100** — the only cached sequence, presumably for high-volume audit insert performance), `SEQ_NOTIFICATION`, `SEQ_USER_SESSION`, `SEQ_SYSTEM_PARAM`, `SEQ_LOOKUP` (all START 1, NOCACHE)

No PL/SQL logic; pure DDL. No exceptions. Dependency note: `SEQ_EMPLOYEE` is used by `TRG_EMP_BEFORE_INSERT`... actually re-checking: `SEQ_EMPLOYEE.NEXTVAL` is used in HRMS_EMPLOYEE.xml's block-level `PRE-INSERT` trigger, not in `TRG_EMP_BEFORE_INSERT` (the DB trigger doesn't set EMP_ID itself — it relies on the Forms PRE-INSERT trigger already having done so, meaning **direct SQL inserts into EMPLOYEES bypassing Forms would not get an auto-generated EMP_ID** unless something else in the unscanned DB layer also defaults it — a possible gap, though EMP_ID is NOT NULL with no DEFAULT clause in the DDL, so any non-Forms insert must supply EMP_ID explicitly or fail).

=== FILE: schema/tables/01_core_tables.sql ===

**Type**: DDL — core HRMS tables (Departments, Locations, Job Grades, Job Titles, Employees, Employee History, Dependents, Emergency Contacts). Schema: HRMS, Oracle Database 19c.

**Table: HRMS.DEPARTMENTS**
- Columns: DEPT_ID NUMBER(10) NOT NULL, DEPT_CODE VARCHAR2(20) NOT NULL, DEPT_NAME VARCHAR2(100) NOT NULL, PARENT_DEPT_ID NUMBER(10), COST_CENTER VARCHAR2(20), MANAGER_EMP_ID NUMBER(10), LOCATION_CODE VARCHAR2(10), ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY VARCHAR2(30) NOT NULL, CREATED_DATE DATE DEFAULT SYSDATE NOT NULL, MODIFIED_BY VARCHAR2(30), MODIFIED_DATE DATE.
- Constraints: `PK_DEPARTMENTS` PK(DEPT_ID); `UK_DEPT_CODE` UNIQUE(DEPT_CODE); `CHK_DEPT_ACTIVE` CHECK (ACTIVE_FLAG IN ('Y','N')).
- **No FK constraint defined** for `PARENT_DEPT_ID` (self-referencing hierarchy) despite comment describing it as "Self-referencing FK for department hierarchy" — comment claims FK semantics but no actual `FOREIGN KEY` constraint is declared; similarly `MANAGER_EMP_ID` and `LOCATION_CODE` have no FK constraints here either (unlike EMPLOYEES which does declare FKs to DEPARTMENTS/JOB_TITLES/LOCATIONS/self) — inconsistent FK enforcement across tables referencing the same conceptual relationships.
- Comments: table comment "Organization departments and cost centers"; column comments on PARENT_DEPT_ID and COST_CENTER as noted.

**Table: HRMS.LOCATIONS**
- Columns: LOCATION_CODE VARCHAR2(10) NOT NULL (PK), LOCATION_NAME VARCHAR2(100) NOT NULL, ADDRESS_LINE1/2 VARCHAR2(200), CITY VARCHAR2(100), STATE_PROVINCE VARCHAR2(100), POSTAL_CODE VARCHAR2(20), COUNTRY_CODE VARCHAR2(3), **PHONE_NUMBER** VARCHAR2(30), TIMEZONE VARCHAR2(50) DEFAULT 'America/New_York', ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraint: `PK_LOCATIONS` PK(LOCATION_CODE).
- Cross-reference defect: seed script `data/seed/01_reference_data.sql` inserts into a column named `PHONE` (not `PHONE_NUMBER`) for this table — column name mismatch between DDL and seed data.

**Table: HRMS.JOB_GRADES**
- Columns: GRADE_ID NUMBER(5) NOT NULL, GRADE_CODE VARCHAR2(10) NOT NULL, GRADE_NAME VARCHAR2(50) NOT NULL, MIN_SALARY NUMBER(12,2) NOT NULL, MAX_SALARY NUMBER(12,2) NOT NULL, OVERTIME_ELIGIBLE CHAR(1) DEFAULT 'N', ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_JOB_GRADES` PK(GRADE_ID); `UK_GRADE_CODE` UNIQUE(GRADE_CODE); `CHK_SALARY_RANGE` CHECK (MAX_SALARY >= MIN_SALARY).
- Cross-reference defect: seed script inserts GRADE_ID/GRADE_NAME/**GRADE_LEVEL**/MIN_SALARY/MAX_SALARY/ACTIVE_FLAG/CREATED_BY/CREATED_DATE — omits required NOT NULL `GRADE_CODE`, and references nonexistent `GRADE_LEVEL` column. This INSERT would fail against this DDL as written.

**Table: HRMS.JOB_TITLES**
- Columns: JOB_ID NUMBER(10) NOT NULL, JOB_CODE VARCHAR2(20) NOT NULL, JOB_TITLE VARCHAR2(100) NOT NULL, JOB_FAMILY VARCHAR2(50), GRADE_ID NUMBER(5) NOT NULL, EEO_CATEGORY VARCHAR2(10), FLSA_STATUS VARCHAR2(10) DEFAULT 'EXEMPT', ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_JOB_TITLES` PK(JOB_ID); `UK_JOB_CODE` UNIQUE(JOB_CODE); `FK_JOB_GRADE` FK(GRADE_ID)→JOB_GRADES(GRADE_ID).
- Matches seed script column usage (JOB_ID, JOB_CODE, JOB_TITLE, GRADE_ID, EEO_CATEGORY, ACTIVE_FLAG, CREATED_BY, CREATED_DATE) — no mismatch here (JOB_FAMILY/FLSA_STATUS simply left to defaults/null).

**Table: HRMS.EMPLOYEES** (master entity)
- Columns: EMP_ID NUMBER(10) NOT NULL (PK, no default/sequence), EMP_NUMBER VARCHAR2(20) NOT NULL (unique), FIRST_NAME VARCHAR2(50) NOT NULL, MIDDLE_NAME VARCHAR2(50), LAST_NAME VARCHAR2(50) NOT NULL, DATE_OF_BIRTH DATE, GENDER CHAR(1), MARITAL_STATUS VARCHAR2(10), NATIONALITY VARCHAR2(50), SSN_ENCRYPTED VARCHAR2(200), EMAIL VARCHAR2(100) (nullable, **no unique constraint**), PHONE_WORK/PHONE_MOBILE VARCHAR2(30), ADDRESS_LINE1/2 VARCHAR2(200), CITY VARCHAR2(100), STATE_PROVINCE VARCHAR2(100), POSTAL_CODE VARCHAR2(20), COUNTRY_CODE VARCHAR2(3), HIRE_DATE DATE NOT NULL, TERMINATION_DATE DATE, TERMINATION_REASON VARCHAR2(50), DEPT_ID NUMBER(10) NOT NULL, JOB_ID NUMBER(10) NOT NULL, MANAGER_EMP_ID NUMBER(10), LOCATION_CODE VARCHAR2(10), EMPLOYMENT_TYPE VARCHAR2(20) DEFAULT 'FULL_TIME', EMPLOYMENT_STATUS VARCHAR2(20) DEFAULT 'ACTIVE', PHOTO_BLOB BLOB, NOTES CLOB, ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY VARCHAR2(30) NOT NULL, CREATED_DATE DATE DEFAULT SYSDATE NOT NULL, MODIFIED_BY VARCHAR2(30), MODIFIED_DATE DATE.
- Constraints: `PK_EMPLOYEES` PK(EMP_ID); `UK_EMP_NUMBER` UNIQUE(EMP_NUMBER); `FK_EMP_DEPT`→DEPARTMENTS(DEPT_ID); `FK_EMP_JOB`→JOB_TITLES(JOB_ID); `FK_EMP_MANAGER`→EMPLOYEES(EMP_ID) (self-ref); `FK_EMP_LOCATION`→LOCATIONS(LOCATION_CODE); `CHK_EMP_STATUS` CHECK (EMPLOYMENT_STATUS IN ('ACTIVE','ON_LEAVE','SUSPENDED','TERMINATED')); `CHK_EMP_TYPE` CHECK (EMPLOYMENT_TYPE IN ('FULL_TIME','PART_TIME','CONTRACT','INTERN')); `CHK_EMP_GENDER` CHECK (GENDER IN ('M','F','O')).
- Comments: table "Master employee records - core entity of the HRMS system"; SSN_ENCRYPTED "AES-256 encrypted SSN - decrypted only in PKG_SECURITY" (implies `PKG_SECURITY` has decrypt logic, not scanned); EMPLOYMENT_STATUS comment lists valid values.
- **Security-sensitive field**: SSN_ENCRYPTED, PHOTO_BLOB, NOTES (CLOB) — PII/large object storage directly on the master table.
- **No unique constraint on EMAIL** despite `TRG_EMP_BEFORE_INSERT` DB trigger enforcing uniqueness only among ACTIVE_FLAG='Y' rows via application logic — confirmed cross-file finding from trg_employees.sql review.

**Table: HRMS.EMPLOYEE_HISTORY**
- Columns: HIST_ID NUMBER(15) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, CHANGE_TYPE VARCHAR2(30) NOT NULL, EFFECTIVE_DATE DATE NOT NULL, OLD_DEPT_ID/NEW_DEPT_ID NUMBER(10), OLD_JOB_ID/NEW_JOB_ID NUMBER(10), OLD_MANAGER_ID/NEW_MANAGER_ID NUMBER(10), OLD_SALARY/NEW_SALARY NUMBER(12,2), OLD_LOCATION/NEW_LOCATION VARCHAR2(10), REASON_CODE VARCHAR2(30), COMMENTS VARCHAR2(4000), CREATED_BY VARCHAR2(30) NOT NULL, CREATED_DATE DATE DEFAULT SYSDATE NOT NULL.
- Constraints: `PK_EMP_HISTORY` PK(HIST_ID); `FK_HIST_EMP`→EMPLOYEES(EMP_ID); `CHK_CHANGE_TYPE` CHECK (CHANGE_TYPE IN ('HIRE','TRANSFER','PROMOTION','DEMOTION','SALARY_CHANGE','TERMINATION','REHIRE','LEAVE_START','LEAVE_END','STATUS_CHANGE')).
- **Confirmed defect** (cross-referenced from trg_employees.sql): `TRG_EMP_BEFORE_UPDATE` inserts into this table using column names (`HISTORY_ID`, `CHANGE_DATE`, `OLD_VALUE`, `NEW_VALUE`, `CHANGED_BY`, `CHANGE_REASON`) that do not exist here, and CHANGE_TYPE values (`DEPARTMENT_CHANGE`, `JOB_CHANGE`) that violate `CHK_CHANGE_TYPE`. This table's actual DDL would reject those trigger-generated inserts entirely.

**Table: HRMS.EMPLOYEE_DEPENDENTS**
- Columns: DEPENDENT_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, FIRST_NAME/LAST_NAME VARCHAR2(50) NOT NULL, RELATIONSHIP VARCHAR2(20) NOT NULL, DATE_OF_BIRTH DATE, SSN_ENCRYPTED VARCHAR2(200), BENEFITS_ENROLLED CHAR(1) DEFAULT 'N', ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_EMP_DEPENDENTS`; `FK_DEP_EMP`→EMPLOYEES(EMP_ID); `CHK_RELATIONSHIP` CHECK (RELATIONSHIP IN ('SPOUSE','CHILD','PARENT','DOMESTIC_PARTNER','OTHER')).

**Table: HRMS.EMERGENCY_CONTACTS**
- Columns: CONTACT_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, CONTACT_NAME VARCHAR2(100) NOT NULL, RELATIONSHIP VARCHAR2(30), PHONE_PRIMARY VARCHAR2(30) NOT NULL, PHONE_SECONDARY VARCHAR2(30), EMAIL VARCHAR2(100), PRIORITY_ORDER NUMBER(2) DEFAULT 1, ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_EMERGENCY_CONTACTS`; `FK_EC_EMP`→EMPLOYEES(EMP_ID).

=== FILE: schema/tables/02_payroll_tables.sql ===

**Type**: DDL — Payroll domain tables. Schema: HRMS.

**Table: HRMS.SALARY_RECORDS**
- Columns: SALARY_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, EFFECTIVE_DATE DATE NOT NULL, END_DATE DATE, BASE_SALARY NUMBER(12,2) NOT NULL, CURRENCY_CODE VARCHAR2(3) DEFAULT 'USD', PAY_FREQUENCY VARCHAR2(20) DEFAULT 'MONTHLY', SALARY_BASIS VARCHAR2(20) DEFAULT 'ANNUAL', CHANGE_REASON VARCHAR2(50), CHANGE_PCT NUMBER(5,2), APPROVED_BY NUMBER(10), APPROVAL_DATE DATE, ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_SALARY_RECORDS`; `FK_SAL_EMP`→EMPLOYEES(EMP_ID); `CHK_PAY_FREQ` CHECK (IN 'WEEKLY','BIWEEKLY','SEMIMONTHLY','MONTHLY'); `CHK_SAL_BASIS` CHECK (IN 'ANNUAL','HOURLY').
- Consumed by trigger `TRG_SALARY_AUDIT` (plsql/triggers/trg_audit.sql) and Forms detail block `SALARY` in HRMS_EMPLOYEE.xml.

**Table: HRMS.PAY_ELEMENTS**
- Columns: ELEMENT_ID NUMBER(10) NOT NULL (PK), ELEMENT_CODE VARCHAR2(30) NOT NULL (unique), ELEMENT_NAME VARCHAR2(100) NOT NULL, ELEMENT_TYPE VARCHAR2(20) NOT NULL, CALCULATION_TYPE VARCHAR2(20) NOT NULL, DEFAULT_AMOUNT NUMBER(12,2), DEFAULT_PERCENTAGE NUMBER(5,2), TAXABLE_FLAG CHAR(1) DEFAULT 'Y', PRETAX_FLAG CHAR(1) DEFAULT 'N', EMPLOYER_PAID CHAR(1) DEFAULT 'N', GL_ACCOUNT_CODE VARCHAR2(30), PRIORITY_ORDER NUMBER(5) DEFAULT 100, ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_PAY_ELEMENTS`; `UK_PAY_ELEM_CODE`; `CHK_ELEM_TYPE` CHECK (IN 'EARNING','DEDUCTION','TAX','BENEFIT','REIMBURSEMENT'); `CHK_CALC_TYPE` CHECK (IN 'FLAT','PERCENTAGE','HOURS','FORMULA').
- Matches seed script column usage exactly (ELEMENT_ID, ELEMENT_CODE, ELEMENT_NAME, ELEMENT_TYPE, CALCULATION_TYPE, DEFAULT_AMOUNT, DEFAULT_PERCENTAGE, GL_ACCOUNT_CODE, PRIORITY_ORDER, PRETAX_FLAG, ACTIVE_FLAG, CREATED_BY, CREATED_DATE).

**Table: HRMS.EMPLOYEE_PAY_ELEMENTS**
- Columns: EMP_ELEMENT_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, ELEMENT_ID NUMBER(10) NOT NULL, EFFECTIVE_DATE DATE NOT NULL, END_DATE DATE, AMOUNT NUMBER(12,2), PERCENTAGE NUMBER(5,2), OVERRIDE_AMOUNT NUMBER(12,2), ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_EMP_PAY_ELEMENTS`; `FK_EPE_EMP`→EMPLOYEES; `FK_EPE_ELEMENT`→PAY_ELEMENTS. (No seed data provided for this table.)

**Table: HRMS.PAY_PERIODS**
- Columns: PERIOD_ID NUMBER(10) NOT NULL (PK), PERIOD_NAME VARCHAR2(50) NOT NULL, PAY_FREQUENCY VARCHAR2(20) NOT NULL, PERIOD_START_DATE/PERIOD_END_DATE/PAY_DATE DATE NOT NULL, STATUS VARCHAR2(20) DEFAULT 'OPEN', CLOSED_BY VARCHAR2(30), CLOSED_DATE DATE, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_PAY_PERIODS`; `CHK_PERIOD_STATUS` CHECK (IN 'OPEN','PROCESSING','CLOSED','REVERSED').
- Consumed by HRMS_PAYROLL.xml `PAY_PERIOD` block (default WHERE `STATUS='OPEN'`).

**Table: HRMS.PAYROLL_RUNS**
- Columns: RUN_ID NUMBER(10) NOT NULL (PK), PERIOD_ID NUMBER(10) NOT NULL, RUN_TYPE VARCHAR2(20) DEFAULT 'REGULAR', RUN_DATE DATE NOT NULL, STATUS VARCHAR2(20) DEFAULT 'PENDING', TOTAL_GROSS/TOTAL_DEDUCTIONS/TOTAL_NET/TOTAL_EMPLOYER_COST NUMBER(15,2), EMPLOYEE_COUNT NUMBER(10), ERROR_COUNT NUMBER(10) DEFAULT 0, SUBMITTED_BY VARCHAR2(30), SUBMITTED_DATE DATE, APPROVED_BY VARCHAR2(30), APPROVED_DATE DATE, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_PAYROLL_RUNS`; `FK_PR_PERIOD`→PAY_PERIODS; `CHK_RUN_TYPE` CHECK (IN 'REGULAR','SUPPLEMENTAL','BONUS','FINAL'); `CHK_RUN_STATUS` CHECK (IN 'PENDING','CALCULATING','CALCULATED','APPROVED','PAID','REVERSED','ERROR').
- Business rule (lifecycle): PENDING→CALCULATING/CALCULATED→APPROVED→PAID, or REVERSED/ERROR — matches HRMS_PAYROLL.xml button logic (`BTN_CALCULATE` requires STATUS='PENDING'; `BTN_APPROVE` requires permission).
- Consumed by `PKG_PAYROLL.create_payroll_run/calculate_payroll/approve_payroll` (unscanned bodies) and view `VW_PAYROLL_LATEST`.

**Table: HRMS.PAYROLL_DETAILS**
- Columns: DETAIL_ID NUMBER(15) NOT NULL (PK), RUN_ID NUMBER(10) NOT NULL, EMP_ID NUMBER(10) NOT NULL, ELEMENT_ID NUMBER(10) NOT NULL, ELEMENT_TYPE VARCHAR2(20) NOT NULL, HOURS_WORKED NUMBER(6,2), RATE NUMBER(12,4), AMOUNT NUMBER(12,2) NOT NULL, YTD_AMOUNT NUMBER(15,2), STATUS VARCHAR2(20) DEFAULT 'CALCULATED', ERROR_MESSAGE VARCHAR2(4000), CREATED_BY/CREATED_DATE.
- Constraints: `PK_PAYROLL_DETAILS`; `FK_PD_RUN`→PAYROLL_RUNS; `FK_PD_EMP`→EMPLOYEES; `FK_PD_ELEMENT`→PAY_ELEMENTS.
- Consumed by view `VW_PAYROLL_LATEST` (STATUS != 'ERROR' filter, ELEMENT_TYPE grouping for gross/tax/deduction/net).

**Table: HRMS.TAX_BRACKETS**
- Columns: BRACKET_ID NUMBER(10) NOT NULL (PK), TAX_YEAR NUMBER(4) NOT NULL, FILING_STATUS VARCHAR2(30) NOT NULL, BRACKET_MIN NUMBER(12,2) NOT NULL, BRACKET_MAX NUMBER(12,2), TAX_RATE NUMBER(5,4) NOT NULL, BASE_TAX NUMBER(12,2) DEFAULT 0, STATE_CODE VARCHAR2(3), ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE.
- Constraints: `PK_TAX_BRACKETS`; `CHK_FILING_STATUS` CHECK (IN 'SINGLE','MARRIED_JOINT','MARRIED_SEPARATE','HEAD_OF_HOUSEHOLD'). (No seed data provided.)

**Table: HRMS.EMPLOYEE_TAX_INFO**
- Columns: TAX_INFO_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, TAX_YEAR NUMBER(4) NOT NULL, FILING_STATUS VARCHAR2(30) NOT NULL, FEDERAL_ALLOWANCES/STATE_ALLOWANCES NUMBER(3) DEFAULT 0, ADDITIONAL_FED_WH/ADDITIONAL_STATE_WH NUMBER(12,2) DEFAULT 0, EXEMPT_FLAG CHAR(1) DEFAULT 'N', STATE_CODE VARCHAR2(3), W4_RECEIVED_DATE DATE, ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_EMP_TAX_INFO`; `FK_ETI_EMP`→EMPLOYEES; `UK_EMP_TAX_YEAR` UNIQUE(EMP_ID, TAX_YEAR) (business rule: one tax profile per employee per year).

**Table: HRMS.EMPLOYEE_BANK_ACCOUNTS** (Direct Deposit)
- Columns: BANK_ACCT_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, BANK_NAME VARCHAR2(100), ROUTING_NUMBER VARCHAR2(20) NOT NULL, ACCOUNT_NUMBER_ENC VARCHAR2(200) NOT NULL (encrypted, PII-sensitive), ACCOUNT_TYPE VARCHAR2(20) DEFAULT 'CHECKING', DEPOSIT_TYPE VARCHAR2(20) DEFAULT 'FULL', DEPOSIT_AMOUNT NUMBER(12,2), DEPOSIT_PERCENTAGE NUMBER(5,2), PRIORITY_ORDER NUMBER(2) DEFAULT 1, PRENOTE_SENT CHAR(1) DEFAULT 'N', PRENOTE_DATE DATE, ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_EMP_BANK_ACCTS`; `FK_BA_EMP`→EMPLOYEES; `CHK_ACCT_TYPE` CHECK (IN 'CHECKING','SAVINGS'); `CHK_DEPOSIT_TYPE` CHECK (IN 'FULL','PARTIAL_AMOUNT','PARTIAL_PERCENT','REMAINDER').
- Business rule: multiple bank accounts per employee supported (PRIORITY_ORDER for split-deposit ordering), with FULL/PARTIAL_AMOUNT/PARTIAL_PERCENT/REMAINDER deposit allocation types (implies a waterfall allocation algorithm elsewhere, unscanned).

=== FILE: schema/tables/03_leave_tables.sql ===

**Type**: DDL — Leave Management domain tables. Schema: HRMS.

**Table: HRMS.LEAVE_TYPES**
- Columns: LEAVE_TYPE_ID NUMBER(5) NOT NULL (PK), LEAVE_TYPE_CODE VARCHAR2(20) NOT NULL (unique), LEAVE_TYPE_NAME VARCHAR2(50) NOT NULL, PAID_FLAG CHAR(1) DEFAULT 'Y', ACCRUAL_FLAG CHAR(1) DEFAULT 'Y', ACCRUAL_RATE NUMBER(6,2), ACCRUAL_FREQUENCY VARCHAR2(20), MAX_BALANCE NUMBER(6,2), CARRYOVER_MAX NUMBER(6,2), CARRYOVER_EXPIRY NUMBER(3), MIN_TENURE_DAYS NUMBER(5) DEFAULT 0, REQUIRES_APPROVAL CHAR(1) DEFAULT 'Y', REQUIRES_DOCUMENT CHAR(1) DEFAULT 'N', ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_LEAVE_TYPES`; `UK_LEAVE_TYPE_CODE`; `CHK_ACCRUAL_FREQ` CHECK (IN 'MONTHLY','BIWEEKLY','ANNUAL', NULL).
- Matches seed script columns exactly (LEAVE_TYPE_ID, LEAVE_TYPE_CODE, LEAVE_TYPE_NAME, ACCRUAL_FLAG, ACCRUAL_RATE, ACCRUAL_FREQUENCY, MAX_BALANCE, CARRYOVER_MAX, CARRYOVER_EXPIRY, REQUIRES_APPROVAL, MIN_TENURE_DAYS, ACTIVE_FLAG, CREATED_BY, CREATED_DATE) — no mismatch. Note seed's `ACCRUAL_FREQUENCY='MONTHLY'` for PTO/SICK is valid per CHK constraint; NULL for COMP/FMLA/JURY/BEREAVE also valid per constraint's explicit NULL allowance.

**Table: HRMS.LEAVE_BALANCES**
- Columns: BALANCE_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, LEAVE_TYPE_ID NUMBER(5) NOT NULL, CALENDAR_YEAR NUMBER(4) NOT NULL, OPENING_BALANCE/ACCRUED/USED/ADJUSTMENT/PENDING NUMBER(6,2) DEFAULT 0, **AVAILABLE NUMBER(6,2) GENERATED ALWAYS AS (OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT - PENDING) VIRTUAL** (computed column — business formula for available leave balance), CARRYOVER_FROM_PREV NUMBER(6,2) DEFAULT 0, CARRYOVER_EXPIRY_DT DATE, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_LEAVE_BALANCES`; `FK_LB_EMP`→EMPLOYEES; `FK_LB_TYPE`→LEAVE_TYPES; `UK_LEAVE_BAL` UNIQUE(EMP_ID, LEAVE_TYPE_ID, CALENDAR_YEAR) (business rule: one balance row per employee/leave-type/year).
- **Note**: the view `VW_LEAVE_SUMMARY` (schema/views/hrms_views.sql) manually recomputes `AVAILABLE` as `OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT` (omitting `PENDING`) rather than reading the generated column directly — a **formula inconsistency**: the table's own virtual column definition subtracts PENDING, but the view's hand-rolled version does not, so `VW_LEAVE_SUMMARY.AVAILABLE` and `LEAVE_BALANCES.AVAILABLE` can diverge whenever PENDING != 0.

**Table: HRMS.LEAVE_REQUESTS**
- Columns: REQUEST_ID NUMBER(10) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, LEAVE_TYPE_ID NUMBER(5) NOT NULL, START_DATE/END_DATE DATE NOT NULL, TOTAL_DAYS NUMBER(5,1) NOT NULL, HALF_DAY_FLAG CHAR(1) DEFAULT 'N', HALF_DAY_PERIOD VARCHAR2(10), STATUS VARCHAR2(20) DEFAULT 'PENDING', REASON VARCHAR2(4000), SUPPORTING_DOC_PATH VARCHAR2(500), APPROVER_EMP_ID NUMBER(10), APPROVAL_DATE DATE, APPROVAL_COMMENTS VARCHAR2(4000), CANCEL_REASON VARCHAR2(4000), CANCELLED_DATE DATE, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_LEAVE_REQUESTS`; `FK_LR_EMP`→EMPLOYEES; `FK_LR_TYPE`→LEAVE_TYPES; `FK_LR_APPROVER`→EMPLOYEES (self-ref, approver); `CHK_LR_STATUS` CHECK (IN 'PENDING','APPROVED','REJECTED','CANCELLED','TAKEN'); `CHK_LR_DATES` CHECK (END_DATE >= START_DATE); `CHK_HALF_DAY` CHECK (HALF_DAY_PERIOD IN ('AM','PM',NULL)).
- Consumed by: HRMS_LEAVE.xml (`LEAVE_REQUEST` block, `BTN_CANCEL_REQUEST` gate on STATUS IN PENDING/APPROVED), `TRG_LEAVE_REQUEST_AUDIT` (fires AFTER UPDATE OF STATUS), `PKG_LEAVE.submit_leave_request`/`cancel_leave_request` (unscanned), view `VW_PENDING_APPROVALS` (filters STATUS='PENDING').

**Table: HRMS.LEAVE_ACCRUAL_LOG**
- Columns: ACCRUAL_ID NUMBER(15) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, LEAVE_TYPE_ID NUMBER(5) NOT NULL, ACCRUAL_DATE DATE NOT NULL, ACCRUAL_AMOUNT NUMBER(6,2) NOT NULL, BALANCE_AFTER NUMBER(6,2), RUN_ID NUMBER(10), CREATED_BY/CREATED_DATE.
- Constraints: `PK_LEAVE_ACCRUAL_LOG`; `FK_LAL_EMP`→EMPLOYEES; `FK_LAL_TYPE`→LEAVE_TYPES. (RUN_ID has no FK declared, though presumably meant to link to a batch/payroll run — ambiguous, no FK enforcement.)

**Table: HRMS.HOLIDAYS**
- Columns: HOLIDAY_ID NUMBER(5) NOT NULL (PK), HOLIDAY_DATE DATE NOT NULL, HOLIDAY_NAME VARCHAR2(100) NOT NULL, LOCATION_CODE VARCHAR2(10) (no FK declared to LOCATIONS despite conceptual relationship), FLOATING_FLAG CHAR(1) DEFAULT 'N', ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE.
- Constraint: `PK_HOLIDAYS` only.
- Matches seed script column usage (HOLIDAY_ID, HOLIDAY_NAME, HOLIDAY_DATE, LOCATION_CODE, ACTIVE_FLAG, CREATED_BY, CREATED_DATE) — no mismatch.

=== FILE: schema/tables/04_performance_tables.sql ===

**Type**: DDL — Performance Management + cross-cutting system tables. Schema: HRMS.

**Table: HRMS.REVIEW_CYCLES**
- Columns: CYCLE_ID NUMBER(10) NOT NULL (PK), CYCLE_NAME VARCHAR2(100) NOT NULL, CYCLE_YEAR NUMBER(4) NOT NULL, START_DATE/END_DATE DATE NOT NULL, SELF_REVIEW_DUE/MANAGER_REVIEW_DUE/CALIBRATION_DUE DATE, STATUS VARCHAR2(20) DEFAULT 'DRAFT', CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_REVIEW_CYCLES`; `CHK_CYCLE_STATUS` CHECK (IN 'DRAFT','OPEN','IN_PROGRESS','CALIBRATION','CLOSED').
- Consumed by HRMS_PERFORMANCE.xml (`REVIEW_CYCLE` block, default WHERE `STATUS IN ('OPEN','DRAFT')`).

**Table: HRMS.PERFORMANCE_REVIEWS**
- Columns: REVIEW_ID NUMBER(10) NOT NULL (PK), CYCLE_ID NUMBER(10) NOT NULL, EMP_ID NUMBER(10) NOT NULL, REVIEWER_EMP_ID NUMBER(10) NOT NULL, REVIEW_TYPE VARCHAR2(20) DEFAULT 'ANNUAL', STATUS VARCHAR2(20) DEFAULT 'NOT_STARTED', OVERALL_RATING NUMBER(2,1), RATING_LABEL VARCHAR2(50), SELF_ASSESSMENT/MANAGER_ASSESSMENT/STRENGTHS/AREAS_FOR_IMPROVEMENT/DEVELOPMENT_PLAN/EMPLOYEE_COMMENTS CLOB, EMPLOYEE_ACK_DATE DATE, CALIBRATED_RATING NUMBER(2,1), CALIBRATION_NOTES VARCHAR2(4000), CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_PERFORMANCE_REVIEWS`; `FK_PR_CYCLE`→REVIEW_CYCLES; `FK_PR_EMP`→EMPLOYEES; `FK_PR_REVIEWER`→EMPLOYEES (self-ref); `CHK_REVIEW_STATUS` CHECK (IN 'NOT_STARTED','SELF_REVIEW','MANAGER_REVIEW','MEETING_SCHEDULED','COMPLETED','ACKNOWLEDGED'); `CHK_RATING_RANGE` CHECK (OVERALL_RATING BETWEEN 1.0 AND 5.0).
- Consumed by HRMS_PERFORMANCE.xml `PERFORMANCE_REVIEW` block (matches field list closely, though as noted the XML declares `RATING_LABEL` as `ItemType="Display Item"` while DDL shows it as a regular stored VARCHAR2(50) column — Forms-side type declaration inconsistency, not a DB defect).

**Table: HRMS.PERFORMANCE_GOALS**
- Columns: GOAL_ID NUMBER(10) NOT NULL (PK), REVIEW_ID NUMBER(10) NOT NULL, EMP_ID NUMBER(10) NOT NULL, GOAL_TITLE VARCHAR2(200) NOT NULL, GOAL_DESCRIPTION CLOB, GOAL_CATEGORY VARCHAR2(30), WEIGHT_PCT NUMBER(5,2) DEFAULT 0, TARGET_DATE DATE, STATUS VARCHAR2(20) DEFAULT 'NOT_STARTED', PROGRESS_PCT NUMBER(5,2) DEFAULT 0, SELF_RATING/MANAGER_RATING NUMBER(2,1), COMMENTS CLOB, CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_PERF_GOALS`; `FK_PG_REVIEW`→PERFORMANCE_REVIEWS; `FK_PG_EMP`→EMPLOYEES; `CHK_GOAL_STATUS` CHECK (IN 'NOT_STARTED','IN_PROGRESS','COMPLETED','DEFERRED','CANCELLED'); `CHK_GOAL_CATEGORY` CHECK (IN 'BUSINESS','DEVELOPMENT','LEADERSHIP','INNOVATION','COMPLIANCE').
- **Note**: HRMS_PERFORMANCE.xml's `PERFORMANCE_GOAL` block LOV for `GOAL_CATEGORY` only offers 3 poplist choices (Business, Development, Leadership) — omitting `INNOVATION` and `COMPLIANCE`, both of which are valid per `CHK_GOAL_CATEGORY` — a **UI/DB constraint mismatch**: the DB permits 5 categories but the Forms UI can only ever set 3 of them via the poplist (existing rows with INNOVATION/COMPLIANCE would display but couldn't be *set* to those values through this form).

**Table: HRMS.AUDIT_LOG** (cross-cutting)
- Columns: AUDIT_ID NUMBER(15) NOT NULL (PK), TABLE_NAME VARCHAR2(60) NOT NULL, RECORD_ID NUMBER(15) NOT NULL, ACTION_TYPE VARCHAR2(10) NOT NULL, OLD_VALUES/NEW_VALUES CLOB, CHANGED_BY VARCHAR2(30) NOT NULL, CHANGED_DATE DATE DEFAULT SYSDATE NOT NULL, IP_ADDRESS VARCHAR2(50), SESSION_ID VARCHAR2(100).
- Constraints: `PK_AUDIT_LOG`; `CHK_AUDIT_ACTION` CHECK (IN 'INSERT','UPDATE','DELETE').
- This is presumably the backing table for `PKG_AUDIT.log_action` calls seen in trg_audit.sql triggers (table name matches conceptually: TABLE_NAME/RECORD_ID/ACTION_TYPE/OLD_VALUES/NEW_VALUES/CHANGED_BY align with the log_action call signature `(table, record_id, action, user, old_json, new_json)`), though `PKG_AUDIT` body itself is unscanned so the mapping is inferred, not confirmed. Also note ACTION_TYPE VARCHAR2(10) NOT NULL has no default and CHK_AUDIT_ACTION doesn't include 'STATUS_CHANGE' — yet `TRG_LEAVE_REQUEST_AUDIT` passes `'STATUS_CHANGE'` as the action value to `PKG_AUDIT.log_action`, which — if that value is written directly into `ACTION_TYPE` — **would violate `CHK_AUDIT_ACTION`** (only INSERT/UPDATE/DELETE allowed). This is a real inferred defect assuming PKG_AUDIT.log_action's 3rd parameter maps straight to ACTION_TYPE.

**Table: HRMS.SYSTEM_PARAMETERS**
- Columns: PARAM_ID NUMBER(5) NOT NULL (PK), PARAM_GROUP VARCHAR2(50) NOT NULL, PARAM_CODE VARCHAR2(50) NOT NULL, PARAM_VALUE VARCHAR2(4000) NOT NULL, **PARAM_DESCRIPTION** VARCHAR2(200), DATA_TYPE VARCHAR2(20) DEFAULT 'VARCHAR2', EDITABLE_FLAG CHAR(1) DEFAULT 'Y', CREATED_BY/CREATED_DATE/MODIFIED_BY/MODIFIED_DATE.
- Constraints: `PK_SYSTEM_PARAMS`; `UK_PARAM_CODE` UNIQUE(PARAM_GROUP, PARAM_CODE).
- **Confirmed cross-file defect**: seed script `01_reference_data.sql` inserts using column name `DESCRIPTION` (not `PARAM_DESCRIPTION`) and omits `DATA_TYPE` — would fail against this DDL.

**Table: HRMS.NOTIFICATION_QUEUE**
- Columns: NOTIFICATION_ID NUMBER(15) NOT NULL (PK), RECIPIENT_EMP_ID NUMBER(10), RECIPIENT_EMAIL VARCHAR2(100), NOTIFICATION_TYPE VARCHAR2(30) NOT NULL, SUBJECT VARCHAR2(200) NOT NULL, BODY CLOB NOT NULL, STATUS VARCHAR2(20) DEFAULT 'PENDING', PRIORITY NUMBER(2) DEFAULT 5, SENT_DATE DATE, ERROR_MESSAGE VARCHAR2(4000), RETRY_COUNT NUMBER(3) DEFAULT 0, REFERENCE_TABLE VARCHAR2(60), REFERENCE_ID NUMBER(15), CREATED_BY/CREATED_DATE.
- Constraints: `PK_NOTIF_QUEUE`; `CHK_NOTIF_STATUS` CHECK (IN 'PENDING','SENT','FAILED','CANCELLED'); `CHK_NOTIF_TYPE` CHECK (IN 'EMAIL','IN_APP','SMS'). No FK on RECIPIENT_EMP_ID despite conceptual link to EMPLOYEES. Implies external notification dispatch mechanism (presumably `PKG_NOTIFICATION`, unscanned) polls this queue.

**Table: HRMS.USER_SESSIONS** (Forms-specific session tracking)
- Columns: SESSION_ID NUMBER(15) NOT NULL (PK), EMP_ID NUMBER(10) NOT NULL, USERNAME VARCHAR2(30) NOT NULL, LOGIN_TIME DATE NOT NULL, LOGOUT_TIME DATE, IP_ADDRESS VARCHAR2(50), FORMS_MODULE VARCHAR2(100), SESSION_STATUS VARCHAR2(20) DEFAULT 'ACTIVE', CREATED_DATE DATE DEFAULT SYSDATE NOT NULL.
- Constraints: `PK_USER_SESSIONS`; `FK_US_EMP`→EMPLOYEES.
- This is presumably the backing table for `PKG_SECURITY.is_session_valid`/`authenticate`/`logout` (unscanned), referenced throughout every form's `WHEN-NEW-FORM-INSTANCE` trigger and HRMS_LOGIN.xml.

**Table: HRMS.LOOKUP_VALUES** (generic lookup table)
- Columns: LOOKUP_ID NUMBER(10) NOT NULL (PK), LOOKUP_TYPE VARCHAR2(50) NOT NULL, LOOKUP_CODE VARCHAR2(50) NOT NULL, LOOKUP_VALUE VARCHAR2(200) NOT NULL, DISPLAY_ORDER NUMBER(5) DEFAULT 0, PARENT_LOOKUP_ID NUMBER(10) (no FK declared, presumably self-referencing hierarchy like DEPARTMENTS.PARENT_DEPT_ID), ACTIVE_FLAG CHAR(1) DEFAULT 'Y' NOT NULL, CREATED_BY/CREATED_DATE.
- Constraints: `PK_LOOKUP_VALUES`; `UK_LOOKUP` UNIQUE(LOOKUP_TYPE, LOOKUP_CODE). No seed data provided for this table.

=== FILE: schema/views/hrms_views.sql ===

**Type**: DDL — Views used by Oracle Reports, Forms LOVs, and external reporting tools.

**View: HRMS.VW_ACTIVE_EMPLOYEES**
- Joins: EMPLOYEES e JOIN DEPARTMENTS d ON e.DEPT_ID=d.DEPT_ID; JOIN JOB_TITLES j ON e.JOB_ID=j.JOB_ID; JOIN JOB_GRADES g ON j.GRADE_ID=g.GRADE_ID; LEFT JOIN EMPLOYEES m ON e.MANAGER_EMP_ID=m.EMP_ID; LEFT JOIN LOCATIONS l ON e.LOCATION_CODE=l.LOCATION_CODE; LEFT JOIN SALARY_RECORDS sr ON e.EMP_ID=sr.EMP_ID AND sr.ACTIVE_FLAG='Y' AND sr.EFFECTIVE_DATE<=SYSDATE AND (sr.END_DATE IS NULL OR sr.END_DATE>SYSDATE).
- Filter: `WHERE e.EMPLOYMENT_STATUS='ACTIVE' AND e.ACTIVE_FLAG='Y'`.
- Computed columns: `FULL_NAME` = FIRST_NAME||' '||LAST_NAME; `TENURE_YEARS` = `TRUNC(MONTHS_BETWEEN(SYSDATE, HIRE_DATE)/12, 1)`; `MANAGER_NAME` = manager's concatenated name.
- Selected columns: EMP_ID, EMP_NUMBER, FIRST_NAME, LAST_NAME, FULL_NAME, EMAIL, PHONE_WORK, PHONE_MOBILE, HIRE_DATE, TENURE_YEARS, EMPLOYMENT_TYPE, EMPLOYMENT_STATUS, DEPT_ID, DEPT_NAME, DEPT_CODE, COST_CENTER, JOB_ID, JOB_TITLE, JOB_CODE, GRADE_ID, GRADE_NAME, MANAGER_EMP_ID, MANAGER_NAME, LOCATION_CODE, LOCATION_NAME, CITY, STATE_PROVINCE, COUNTRY_CODE, CURRENT_SALARY (aliased from sr.BASE_SALARY), CURRENCY_CODE, PAY_FREQUENCY.
- Comment: "Denormalized view of active employees with department, job, manager, location, and salary".

**View: HRMS.VW_ORG_HIERARCHY**
- Hierarchical query via `CONNECT BY`: `START WITH MANAGER_EMP_ID IS NULL CONNECT BY PRIOR EMP_ID = MANAGER_EMP_ID`, filtered `WHERE EMPLOYMENT_STATUS='ACTIVE'`, `ORDER SIBLINGS BY LAST_NAME`.
- Columns: EMP_ID, EMP_NUMBER, EMP_NAME (concatenated), MANAGER_EMP_ID, DEPT_ID, ORG_LEVEL (`LEVEL` pseudocolumn), ORG_PATH (`SYS_CONNECT_BY_PATH(name,' > ')`), IS_LEAF (`CONNECT_BY_ISLEAF`).
- **Documented performance warning**: "Performance degrades significantly with >500 employees" — explicit known scalability limitation of this CONNECT BY hierarchical query.

**View: HRMS.VW_EMPLOYEE_COMPENSATION**
- Joins: EMPLOYEES e JOIN DEPARTMENTS d, JOIN JOB_TITLES j, JOIN JOB_GRADES g, JOIN SALARY_RECORDS sr ON e.EMP_ID=sr.EMP_ID AND sr.ACTIVE_FLAG='Y'. Filter: `WHERE e.EMPLOYMENT_STATUS='ACTIVE'`.
- Computed: `GRADE_MIDPOINT` = (MIN_SALARY+MAX_SALARY)/2; `COMPA_RATIO` = `ROUND(BASE_SALARY / GRADE_MIDPOINT * 100, 1)` (standard compensation-analysis metric: salary as % of grade midpoint).
- **Potential defect**: unlike `VW_ACTIVE_EMPLOYEES`, the join to SALARY_RECORDS here does **not** filter on `EFFECTIVE_DATE<=SYSDATE AND (END_DATE IS NULL OR END_DATE>SYSDATE)` — only `ACTIVE_FLAG='Y'`. If an employee has more than one salary row flagged ACTIVE_FLAG='Y' (e.g., a future-dated raise not yet in effect, or historical data not properly end-dated/deactivated), this join could produce duplicate employee rows or pick up a not-yet-effective salary, unlike the more carefully date-scoped VW_ACTIVE_EMPLOYEES.
- Columns: EMP_ID, EMP_NUMBER, EMP_NAME, DEPT_NAME, JOB_TITLE, GRADE_NAME, BASE_SALARY, GRADE_MIN, GRADE_MAX, GRADE_MIDPOINT, COMPA_RATIO, SALARY_EFFECTIVE_DATE, LAST_CHANGE_REASON, LAST_CHANGE_PCT.

**View: HRMS.VW_LEAVE_SUMMARY**
- Joins: LEAVE_BALANCES lb JOIN EMPLOYEES e, JOIN DEPARTMENTS d, JOIN LEAVE_TYPES lt. Filter: `lb.CALENDAR_YEAR = EXTRACT(YEAR FROM SYSDATE) AND e.EMPLOYMENT_STATUS='ACTIVE'`.
- Computed: `AVAILABLE` = `OPENING_BALANCE + ACCRUED - USED + ADJUSTMENT` (**omits PENDING** — divergence from the table's own virtual column formula noted above); `UTILIZATION_PCT` = `ROUND(USED*100/NULLIF(OPENING_BALANCE+ACCRUED,0), 1)` (division-by-zero guarded via NULLIF).
- Columns: EMP_ID, EMP_NUMBER, EMP_NAME, DEPT_NAME, LEAVE_TYPE_NAME, OPENING_BALANCE, ACCRUED, USED, ADJUSTMENT, PENDING, AVAILABLE, UTILIZATION_PCT.

**View: HRMS.VW_PAYROLL_LATEST**
- Joins: PAYROLL_DETAILS pd JOIN EMPLOYEES e, JOIN PAYROLL_RUNS pr, JOIN PAY_PERIODS pp.
- Filter: `pr.RUN_ID = (SELECT MAX(pr2.RUN_ID) FROM PAYROLL_RUNS pr2 WHERE pr2.STATUS='APPROVED')` — **business rule/potential defect**: "latest" is determined by MAX(RUN_ID) among APPROVED runs, which assumes RUN_ID is monotonically increasing with time (true given NOCACHE sequence generation) AND assumes there's a single global "latest payroll run" rather than one per pay period/frequency — if the company ever runs payroll for different employee subsets in parallel (e.g., different pay frequencies or off-cycle/supplemental runs), this view would only reflect the single highest-ID approved run, potentially excluding many employees entirely from the "latest payroll" view. Also `pd.STATUS != 'ERROR'` filters out error rows.
- Aggregates (GROUP BY EMP_ID, EMP_NUMBER, name, PERIOD_NAME): `GROSS_PAY` = SUM(AMOUNT WHERE ELEMENT_TYPE='EARNING'); `TOTAL_TAXES` = SUM(ABS(AMOUNT) WHERE ELEMENT_TYPE='TAX'); `TOTAL_DEDUCTIONS` = SUM(ABS(AMOUNT) WHERE ELEMENT_TYPE IN ('DEDUCTION','BENEFIT')); `NET_PAY` = SUM(AMOUNT) (unconditional sum of signed amounts across all element types — relies on earnings being stored positive and taxes/deductions negative for this to equal true net pay).

**View: HRMS.VW_PENDING_APPROVALS**
- UNION ALL of two sources:
  1. LEAVE: `LEAVE_REQUESTS lr JOIN EMPLOYEES e JOIN LEAVE_TYPES lt WHERE lr.STATUS='PENDING'` → APPROVAL_TYPE='LEAVE', ITEM_ID=REQUEST_ID, APPROVER_ID=APPROVER_EMP_ID, REQUESTOR_NAME, ITEM_DESCRIPTION=leave type name, REQUEST_DATE=CREATED_DATE, DETAILS = `TOTAL_DAYS || ' day(s) ' || TO_CHAR(START_DATE,'MM/DD') || '-' || TO_CHAR(END_DATE,'MM/DD')`.
  2. PERFORMANCE: `PERFORMANCE_REVIEWS pr JOIN EMPLOYEES e JOIN REVIEW_CYCLES rc WHERE pr.STATUS='MANAGER_REVIEW'` → APPROVAL_TYPE='PERFORMANCE', ITEM_ID=REVIEW_ID, APPROVER_ID=REVIEWER_EMP_ID, REQUESTOR_NAME, ITEM_DESCRIPTION='Performance Review - '||CYCLE_NAME, REQUEST_DATE=CREATED_DATE, DETAILS=STATUS.
- Purpose: unified cross-module approval-queue view (matches HRMS_LEAVE.xml's stubbed-out "Pending Approvals" tab, which has no data block defined in that form — this view is likely intended to back that missing block, supporting the earlier finding that HRMS_LEAVE.xml is incomplete relative to its own header comment).


