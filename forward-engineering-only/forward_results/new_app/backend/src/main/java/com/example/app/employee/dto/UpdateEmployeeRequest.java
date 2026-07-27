package com.example.app.employee.dto;

/**
 * Partial update body (11_API_CONTRACT_SPECIFICATION.md §2.4): department, job
 * role, and salary band are all independently optional. EmployeeService rejects a
 * request where all three are null (nothing to change).
 */
public record UpdateEmployeeRequest(
    String department,
    String jobRole,
    String salaryBand
) {
}
