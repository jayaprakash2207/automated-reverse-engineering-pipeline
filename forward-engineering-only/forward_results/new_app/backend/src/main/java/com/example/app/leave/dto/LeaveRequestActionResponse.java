package com.example.app.leave.dto;

import com.example.app.leave.domain.LeaveRequestStatus;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §3.3/§3.4: {@code { id, status, audit_entry_id }}.
 * auditEntryId lets the caller verify the audit write actually happened, closing
 * DISC-006's silent-failure mode the same way UpdateEmployeeResponse does for
 * the Employee Management Context.
 */
public record LeaveRequestActionResponse(
    Long id,
    LeaveRequestStatus status,
    Long auditEntryId
) {
}
