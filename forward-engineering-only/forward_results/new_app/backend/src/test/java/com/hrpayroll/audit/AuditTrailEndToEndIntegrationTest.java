// Retired: see com/hrpayroll/audit/service/AuditLogServiceTest.java for why.
// This was a top-level duplicate of e2e/AuditLogE2ETest.java, referencing a
// discarded com.hrpayroll.audit.* AOP/entity design with no matching main-source
// classes -- it failed to compile and blocked the whole test run. Real
// end-to-end atomicity coverage (audit write in the same transaction as the
// action it records, rolling back on AUDIT_WRITE_FAILED) lives in
// com.example.app.audit.AuditAtomicityIntegrationTest. This file is
// intentionally an empty compilation unit; safe to delete this file and the
// now-empty src/test/java/com/hrpayroll/** directory tree.
