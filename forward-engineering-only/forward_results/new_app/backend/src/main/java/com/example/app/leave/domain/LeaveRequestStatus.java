package com.example.app.leave.domain;

/**
 * Vocabulary evidenced directly by 11_API_CONTRACT_SPECIFICATION.md §3's request/
 * response bodies (PENDING at submission, CANCELLED on self-cancel, APPROVED/
 * REJECTED as the [NEW - GAP CLOSURE] manager decision outcomes).
 */
public enum LeaveRequestStatus {
    PENDING,
    APPROVED,
    REJECTED,
    CANCELLED
}
