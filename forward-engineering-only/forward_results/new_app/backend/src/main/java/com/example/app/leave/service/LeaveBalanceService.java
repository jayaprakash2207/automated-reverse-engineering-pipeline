package com.example.app.leave.service;

import java.time.LocalDate;
import java.util.Optional;

/**
 * Single seam for the leave-balance formula (11_API_CONTRACT_SPECIFICATION.md
 * §3.1, BR-leave-balance-formula / DISC-002). The source system has two
 * diverging formulas and the business has not reconciled which is authoritative,
 * so no caller may inline either legacy formula -- every caller routes through
 * this interface so the eventual decision is a one-place fix, the same pattern
 * HireDatePolicy uses for DISC-001 in the Employee Management Context.
 */
public interface LeaveBalanceService {

    /**
     * Returns the projected balance after the requested leave is taken, or
     * empty when the formula is not yet resolved (DISC-002) -- callers must
     * surface empty as a null balance_after with meta.source_confidence LOW,
     * per the contract, rather than guessing a number.
     */
    Optional<Integer> calculateBalanceAfter(Long employeeId, String leaveType, LocalDate startDate, LocalDate endDate);
}
