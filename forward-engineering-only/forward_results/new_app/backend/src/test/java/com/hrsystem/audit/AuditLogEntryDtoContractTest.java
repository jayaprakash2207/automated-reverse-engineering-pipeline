package com.hrsystem.audit;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the JSON contract for audit log entries so downstream consumers
 * (audit reviewer UI, exports) can rely on a stable field set.
 */
class AuditLogEntryDtoContractTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void auditLogEntryDto_serializesAllRequiredFields() throws Exception {
        AuditLogEntryDto dto = new AuditLogEntryDto(
                1L,
                "hr.admin@example.com",
                "EMPLOYEE_TRANSFER",
                "EMPLOYEE",
                "1042",
                AuditOutcome.SUCCESS,
                Instant.parse("2026-07-01T12:00:00Z"),
                null);

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(dto));

        assertThat(json.hasNonNull("id")).isTrue();
        assertThat(json.hasNonNull("actorEmail")).isTrue();
        assertThat(json.hasNonNull("action")).isTrue();
        assertThat(json.hasNonNull("entityType")).isTrue();
        assertThat(json.hasNonNull("entityId")).isTrue();
        assertThat(json.hasNonNull("outcome")).isTrue();
        assertThat(json.hasNonNull("timestamp")).isTrue();
    }

    @Test
    void auditLogEntryDto_neverExposesRawClientSuppliedActorField() throws Exception {
        AuditLogEntryDto dto = new AuditLogEntryDto(
                1L, "hr.admin@example.com", "EMPLOYEE_TRANSFER", "EMPLOYEE", "1042",
                AuditOutcome.SUCCESS, Instant.parse("2026-07-01T12:00:00Z"), null);

        JsonNode json = objectMapper.readTree(objectMapper.writeValueAsString(dto));

        // guards against a field being (re)added later that would let a
        // caller-supplied identity leak into the audit-trail contract
        assertThat(json.has("actorId")).isFalse();
        assertThat(json.has("requestedBy")).isFalse();
    }
}
