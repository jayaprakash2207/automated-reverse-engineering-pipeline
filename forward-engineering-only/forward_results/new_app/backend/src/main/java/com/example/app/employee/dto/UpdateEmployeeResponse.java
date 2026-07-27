package com.example.app.employee.dto;

import java.util.List;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §2.4 shows a singular history_entry_id, but a
 * single PATCH call can change department, job_role, and salary_band together;
 * EmployeeService writes one history row per changed field (not one row hiding a
 * composite change) so each field-level change is independently auditable. This
 * returns every id written so the caller can verify each write actually happened,
 * per the contract's requirement to close TD-11/TD-12's silent-failure mode.
 */
public record UpdateEmployeeResponse(
    EmployeeDto employee,
    List<Long> historyEntryIds
) {
}
