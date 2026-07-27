package com.example.app.leave.dto;

import com.example.app.leave.domain.LeaveRequest;
import com.example.app.leave.domain.LeaveRequestStatus;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Resource shape for the manager inbox list (11_API_CONTRACT_SPECIFICATION.md
 * §3.5) -- no dedicated schema was given for this resource in the contract, so
 * this is the minimum shape a manager needs to review and act on a request:
 * who it's for, what's requested, and (once decided) who decided it and why.
 */
public record LeaveRequestDto(
    Long id,
    Long employeeId,
    String leaveType,
    LocalDate startDate,
    LocalDate endDate,
    String reason,
    LeaveRequestStatus status,
    String approverComment,
    String rejectionReason,
    String decidedBy,
    Instant decidedAt,
    Instant createdAt
) {

    public static LeaveRequestDto from(LeaveRequest leaveRequest) {
        return new LeaveRequestDto(
            leaveRequest.getId(),
            leaveRequest.getEmployeeId(),
            leaveRequest.getLeaveType(),
            leaveRequest.getStartDate(),
            leaveRequest.getEndDate(),
            leaveRequest.getReason(),
            leaveRequest.getStatus(),
            leaveRequest.getApproverComment(),
            leaveRequest.getRejectionReason(),
            leaveRequest.getDecidedBy(),
            leaveRequest.getDecidedAt(),
            leaveRequest.getCreatedAt()
        );
    }
}
