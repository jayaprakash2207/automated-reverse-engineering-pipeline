package com.example.app.leave.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Rejection body (11_API_CONTRACT_SPECIFICATION.md §3.4): same shape as
 * approval but reason is required, not optional.
 */
public record RejectLeaveRequestRequest(@NotBlank String reason) {
}
