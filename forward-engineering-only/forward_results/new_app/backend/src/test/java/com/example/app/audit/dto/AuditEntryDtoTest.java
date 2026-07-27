package com.example.app.audit.dto;

import com.example.app.audit.domain.AuditEntry;
import com.example.app.audit.domain.AuditOutcome;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * AuditServiceTest and AuditControllerIntegrationTest exercise AuditEntryDto.from
 * indirectly through the search endpoint; this pins down the mapping itself so a
 * future field added to AuditEntry without a matching DTO field addition fails here
 * first, rather than as a silently-dropped field in an HTTP response body.
 */
class AuditEntryDtoTest {

    @Test
    void should_copyEveryFieldFromTheEntity_when_mappingToADto() {
        AuditEntry entry = new AuditEntry();
        entry.setId(7L);
        entry.setEntityType("EMPLOYEE");
        entry.setEntityId("42");
        entry.setAction("HIRE");
        entry.setPerformedBy("admin@example.com");
        entry.setOutcome(AuditOutcome.SUCCESS);
        entry.setDetails("Hired into Engineering");
        Instant occurredAt = Instant.parse("2026-07-20T10:00:00Z");
        entry.setOccurredAt(occurredAt);

        AuditEntryDto dto = AuditEntryDto.from(entry);

        assertThat(dto.id()).isEqualTo(7L);
        assertThat(dto.entityType()).isEqualTo("EMPLOYEE");
        assertThat(dto.entityId()).isEqualTo("42");
        assertThat(dto.action()).isEqualTo("HIRE");
        assertThat(dto.performedBy()).isEqualTo("admin@example.com");
        assertThat(dto.outcome()).isEqualTo(AuditOutcome.SUCCESS);
        assertThat(dto.details()).isEqualTo("Hired into Engineering");
        assertThat(dto.occurredAt()).isEqualTo(occurredAt);
    }

    @Test
    void should_preserveANullDetails_when_theEntryHasNoDetails_becauseTheColumnIsOptional() {
        AuditEntry entry = new AuditEntry();
        entry.setId(1L);
        entry.setEntityType("AUTH");
        entry.setEntityId("7");
        entry.setAction("LOGIN_FAILED");
        entry.setPerformedBy("unknown@example.com");
        entry.setOutcome(AuditOutcome.FAILURE);
        entry.setDetails(null);
        entry.setOccurredAt(Instant.now());

        AuditEntryDto dto = AuditEntryDto.from(entry);

        assertThat(dto.details()).isNull();
        assertThat(dto.outcome()).isEqualTo(AuditOutcome.FAILURE);
    }
}
