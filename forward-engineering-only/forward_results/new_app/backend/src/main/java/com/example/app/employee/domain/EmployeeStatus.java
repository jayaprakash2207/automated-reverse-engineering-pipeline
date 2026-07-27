package com.example.app.employee.domain;

/**
 * Minimum status vocabulary implied by PKG-EMPLOYEE's terminate_employee /
 * rehire_employee procedures (11_API_CONTRACT_SPECIFICATION.md §2.1) — the
 * legacy schema's exact vocabulary is unconfirmed (OQ-006).
 */
public enum EmployeeStatus {
    ACTIVE,
    TERMINATED,
    ON_LEAVE
}
