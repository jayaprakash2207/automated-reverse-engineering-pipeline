// Retired: see com/hrpayroll/audit/service/AuditLogServiceTest.java for why.
// This was a top-level duplicate of controller/AuditLogControllerTest.java,
// referencing a discarded com.hrpayroll.audit.web.AuditLogController that was
// never implemented -- it failed to compile and blocked the whole test run.
// Superseded by com.example.app.audit.controller.AuditControllerIntegrationTest
// (real endpoint: GET /api/v1/audit-entries, roles ADMIN/AUDIT_REVIEWER enforced
// in AuditService.search via @PreAuthorize, per Stack Mapping Contract row 6).
// This file is intentionally an empty compilation unit; safe to delete this file
// and the now-empty src/test/java/com/hrpayroll/** directory tree.
