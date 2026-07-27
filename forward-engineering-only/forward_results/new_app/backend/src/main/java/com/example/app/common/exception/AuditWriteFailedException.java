package com.example.app.common.exception;

/**
 * Thrown when AuditService.logAction's write fails -- the direct remediation for
 * DISC-006 (PKG_AUDIT.log_action swallowing exactly this class of failure).
 * Always surfaces as a 500 with error.code AUDIT_WRITE_FAILED
 * (11_API_CONTRACT_SPECIFICATION.md §3.3), and because logAction runs inside the
 * caller's own transaction, throwing this rolls that transaction back instead of
 * letting the parent action "succeed silently."
 */
public class AuditWriteFailedException extends ApplicationException {

    public AuditWriteFailedException(String message, Throwable cause) {
        super("AUDIT_WRITE_FAILED", message, cause);
    }
}
