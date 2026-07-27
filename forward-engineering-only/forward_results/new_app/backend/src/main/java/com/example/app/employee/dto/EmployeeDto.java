package com.example.app.employee.dto;

import com.example.app.employee.domain.Employee;
import com.example.app.employee.domain.EmployeeStatus;

import java.time.LocalDate;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §2.6. salary_band is included even though it is
 * absent from the contract's partial resource schema, because §2.4's PATCH body
 * treats it as a first-class patchable field — omitting it here would make it
 * impossible to read back what was just written. ssn/ssnEncrypted is deliberately
 * NOT included: this DTO backs the general list/get/create/update responses, none
 * of which has a contract-evidenced need to return SSN data (plaintext or cipher),
 * and reflecting the ciphertext back on every read is needless exposure of a
 * Security Architecture Doc 13 §4-listed PII field. If a dedicated,
 * access-logged "view SSN" capability is ever required, it must be its own
 * endpoint/DTO, not a field on the general employee resource.
 */
public record EmployeeDto(
    Long id,
    String firstName,
    String lastName,
    String email,
    LocalDate hireDate,
    String department,
    String jobRole,
    String salaryBand,
    EmployeeStatus status
) {

    public static EmployeeDto from(Employee employee) {
        return new EmployeeDto(
            employee.getId(),
            employee.getFirstName(),
            employee.getLastName(),
            employee.getEmail(),
            employee.getHireDate(),
            employee.getDepartment(),
            employee.getJobRole(),
            employee.getSalaryBand(),
            employee.getStatus()
        );
    }
}
