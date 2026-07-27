package com.example.app.payroll.dto;

import jakarta.validation.constraints.NotNull;

/**
 * POST /payroll-runs body (11_API_CONTRACT_SPECIFICATION.md §4). The contract does
 * not specify a request schema for this stubbed endpoint; pay_period_id is the
 * minimum field a "run" can be initiated against without inventing calculation
 * inputs (pay rates, employee rosters, etc.) that have no evidence anywhere in the
 * source material.
 */
public record CreatePayrollRunRequest(
    @NotNull Long payPeriodId
) {
}
