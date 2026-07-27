package com.example.app.audit.dto;

import com.example.app.audit.domain.AuditEntry;
import com.example.app.audit.domain.AuditOutcome;

import java.time.Instant;

/** 11_API_CONTRACT_SPECIFICATION.md §7.1. */
public record AuditEntryDto(
    Long id,
    String entityType,
    String entityId,
    String action,
    String performedBy,
    AuditOutcome outcome,
    String details,
    Instant occurredAt
) {

    public static AuditEntryDto from(AuditEntry entry) {
        return new AuditEntryDto(
            entry.getId(),
            entry.getEntityType(),
            entry.getEntityId(),
            entry.getAction(),
            entry.getPerformedBy(),
            entry.getOutcome(),
            entry.getDetails(),
            entry.getOccurredAt()
        );
    }
}
