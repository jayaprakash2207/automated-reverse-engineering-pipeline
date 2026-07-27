package com.example.app.leave.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

/** Submission body (11_API_CONTRACT_SPECIFICATION.md §3.1). */
public record CreateLeaveRequestRequest(
    @NotNull Long employeeId,
    @NotBlank String leaveType,
    @NotNull LocalDate startDate,
    @NotNull LocalDate endDate,
    String reason
) {
}
