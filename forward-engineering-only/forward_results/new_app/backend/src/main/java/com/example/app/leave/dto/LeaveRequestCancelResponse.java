package com.example.app.leave.dto;

import com.example.app.leave.domain.LeaveRequestStatus;

/** 11_API_CONTRACT_SPECIFICATION.md §3.2: {@code { id, status: "CANCELLED" } }. */
public record LeaveRequestCancelResponse(
    Long id,
    LeaveRequestStatus status
) {
}
