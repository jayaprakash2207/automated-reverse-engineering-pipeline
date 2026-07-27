// Retired: see com/hrpayroll/audit/service/AuditLogServiceTest.java for why.
// This was a top-level duplicate of aspect/AuditAspectTest.java, referencing the
// same discarded com.hrpayroll.audit.* AOP design (AuditAspect, AuditLogService)
// with no matching main-source classes -- it failed to compile and blocked the
// whole test run. Real unit coverage of the fail-closed audit write lives in
// com.example.app.audit.service.AuditServiceTest. This file is intentionally an
// empty compilation unit; safe to delete this file and the now-empty
// src/test/java/com/hrpayroll/** directory tree.
