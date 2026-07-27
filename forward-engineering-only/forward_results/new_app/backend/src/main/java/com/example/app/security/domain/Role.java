package com.example.app.security.domain;

/**
 * RBAC roles derived from confirmed functional value streams (Security Architecture §3).
 * MEDIUM confidence - no source-confirmed roles table existed to migrate; validate against the
 * real schema once available.
 *
 * <p>ADMIN was missing from this enum even though every {@code @PreAuthorize} check across
 * Employee, Payroll, Leave, and Audit ({@code hasRole('ADMIN')} / {@code hasAnyRole('ADMIN', ...)})
 * targets it -- meaning no credential could ever satisfy any of those checks. Added here rather
 * than left for each caller to work around, since the role vocabulary is cross-cutting.
 */
public enum Role {
    ADMIN,
    EMPLOYEE,
    MANAGER,
    HR_ADMIN,
    PAYROLL_ADMIN,
    AUDIT_REVIEWER
}
