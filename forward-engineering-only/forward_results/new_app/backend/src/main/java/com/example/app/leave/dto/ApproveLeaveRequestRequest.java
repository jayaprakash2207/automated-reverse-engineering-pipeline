package com.example.app.leave.dto;

/** Approval body (11_API_CONTRACT_SPECIFICATION.md §3.3): comment is optional. */
public record ApproveLeaveRequestRequest(String comment) {

    public static ApproveLeaveRequestRequest empty() {
        return new ApproveLeaveRequestRequest(null);
    }
}
