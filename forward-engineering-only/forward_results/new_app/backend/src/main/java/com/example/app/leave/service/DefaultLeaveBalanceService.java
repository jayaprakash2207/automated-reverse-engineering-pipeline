package com.example.app.leave.service;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Optional;

/**
 * DISC-002 is unresolved: one source's leave-balance formula diverges from
 * another and the business has not said which is authoritative
 * (Business Requirements Document §3). Fabricating either legacy formula here
 * would violate the anti-hallucination rule the rest of this forward
 * engineering effort follows, so this implementation always returns empty --
 * once the business reconciles the formula, it lands in this one class.
 */
@Service
public class DefaultLeaveBalanceService implements LeaveBalanceService {

    @Override
    public Optional<Integer> calculateBalanceAfter(Long employeeId, String leaveType, LocalDate startDate, LocalDate endDate) {
        return Optional.empty();
    }
}
