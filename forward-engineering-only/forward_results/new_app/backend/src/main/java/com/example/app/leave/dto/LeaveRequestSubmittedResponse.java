package com.example.app.leave.dto;

import com.example.app.common.dto.ResponseMeta;
import com.example.app.leave.domain.LeaveRequestStatus;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §3.1: {@code { id, status, balance_after }}
 * plus the transitional meta.source_confidence scaffold (§1) -- balanceAfter is
 * null with source_confidence LOW until DISC-002 is resolved (see
 * LeaveBalanceService).
 */
public record LeaveRequestSubmittedResponse(
    Long id,
    LeaveRequestStatus status,
    Integer balanceAfter,
    ResponseMeta meta
) {
}
