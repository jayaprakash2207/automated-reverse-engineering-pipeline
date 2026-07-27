package com.example.app.payroll.dto;

import com.example.app.payroll.domain.PayPeriod;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Resource shape for the Pay Period contract slots (11_API_CONTRACT_SPECIFICATION.md
 * §4). No dedicated schema was given in the contract for this resource -- this is
 * the minimum shape implied by "Pay Period" as a date-range concept, deliberately
 * excluding any calculation/derived fields absent from all provided source layers.
 */
public record PayPeriodDto(
    Long id,
    LocalDate startDate,
    LocalDate endDate,
    Instant createdAt
) {

    public static PayPeriodDto from(PayPeriod payPeriod) {
        return new PayPeriodDto(
            payPeriod.getId(),
            payPeriod.getStartDate(),
            payPeriod.getEndDate(),
            payPeriod.getCreatedAt()
        );
    }
}
