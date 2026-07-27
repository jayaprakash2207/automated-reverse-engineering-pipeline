package com.example.app.payroll.dto;

import com.example.app.payroll.domain.PayrollRun;

import java.time.Instant;

/**
 * Resource shape for the Payroll Run contract slots (11_API_CONTRACT_SPECIFICATION.md
 * §4). No calculation/derived fields are included -- see PayrollRun's class-level
 * note on why those are out of scope for this sprint.
 */
public record PayrollRunDto(
    Long id,
    Long payPeriodId,
    String initiatedBy,
    Instant initiatedAt,
    Instant createdAt
) {

    public static PayrollRunDto from(PayrollRun payrollRun) {
        return new PayrollRunDto(
            payrollRun.getId(),
            payrollRun.getPayPeriodId(),
            payrollRun.getInitiatedBy(),
            payrollRun.getInitiatedAt(),
            payrollRun.getCreatedAt()
        );
    }
}
