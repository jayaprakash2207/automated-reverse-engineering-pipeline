package com.example.app.employee.dto;

import com.example.app.employee.domain.ChangeType;
import com.example.app.employee.domain.EmployeeHistory;

import java.time.Instant;

/** 11_API_CONTRACT_SPECIFICATION.md §2.5. */
public record EmployeeHistoryDto(
    Long id,
    Long employeeId,
    ChangeType changeType,
    String oldValue,
    String newValue,
    String changedBy,
    Instant changedAt
) {

    public static EmployeeHistoryDto from(EmployeeHistory history) {
        return new EmployeeHistoryDto(
            history.getId(),
            history.getEmployeeId(),
            history.getChangeType(),
            history.getOldValue(),
            history.getNewValue(),
            history.getChangedBy(),
            history.getChangedAt()
        );
    }
}
