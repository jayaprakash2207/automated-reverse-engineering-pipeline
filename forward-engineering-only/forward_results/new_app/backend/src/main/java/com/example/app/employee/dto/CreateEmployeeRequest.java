package com.example.app.employee.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/**
 * Hire body (11_API_CONTRACT_SPECIFICATION.md §2.3). salary_band and ssn are
 * optional: neither is listed as required in the contract's "fields TBD pending
 * OQ-006" hire body, and ssn in particular may not be captured at hire time in
 * every onboarding flow.
 */
public record CreateEmployeeRequest(
    @NotBlank String firstName,
    @NotBlank String lastName,
    @NotBlank @Email String email,
    @NotNull LocalDate hireDate,
    @NotBlank String department,
    @NotBlank String jobRole,
    String salaryBand,
    String ssn
) {
}
