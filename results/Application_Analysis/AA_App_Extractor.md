## Application Architecture extraction completed.

**Output location:** `AA_App_Extractor.md` (repo root)

Since only Layer 1 summary JSON + a deep scan of ~10 specific files (not the full package bodies) was provided, I consolidated all 13 stages into this single file rather than the full `D1-application-architecture/` folder tree, embedding the required JSON artifacts and Mermaid diagrams inline.

**Top 5 architecture findings:**
1. Classic Oracle Forms 2-tier client-server **Layered Monolith** with anemic domain model — no HTTP/API tier, single Forms client + single Oracle DB schema (`HRMS`).
2. Business rules are duplicated across 2-3 layers with confirmed **drift**: hire-date limit is 90 days in the Forms UI but 180 days in the DB trigger — a real inconsistency, not just a comment artifact.
3. A **critical, broken code path**: `TRG_EMP_BEFORE_UPDATE` inserts into `EMPLOYEE_HISTORY` using column names and `CHANGE_TYPE` values that don't exist/aren't permitted by the actual DDL — any employee dept/job/status change will raise a runtime Oracle error.
4. `PKG_SECURITY` and the `EMPLOYEES` table are the system's highest-coupling components — nearly every form and module depends on them directly.
5. **10 of the system's PL/SQL packages (20 spec/body files) — including all core business logic for auth, payroll, and leave — were not available in the deep scan.** This is the single biggest blind spot in the extraction.

**Top 5 risks:**
1. Unread package bodies (`PKG_SECURITY`, `PKG_PAYROLL`, `PKG_LEAVE`, etc.) — no confident migration planning possible until read.
2. `HRMS_REPORTS` and `HRMS_ADMIN` forms (referenced everywhere in the menu) were never scanned — two modules are entirely unknown.
3. The broken `EMPLOYEE_HISTORY` audit trail (Critical) — likely means historical dept/job/status change data is missing or the feature has never worked.
4. Shared toolbar `DELETE_RECORD` handler will always fail on `EMPLOYEES` due to an unconditional instead-of-delete trigger, with no compensating soft-delete logic in the shared library.
5. `HRMS_PERFORMANCE` has no authorization gate for editing ratings/assessments, unlike sibling modules — a likely oversight with HR-compliance implications.

**Open questions needing human review** (full list of 10 is in the file, Section 16) — most urgent: which hire-date rule (90 vs 180 days) is correct, whether the `EMPLOYEE_HISTORY` defect is already known in production, and whether the 10 missing package bodies and 2 missing forms can be supplied for a follow-up pass.
