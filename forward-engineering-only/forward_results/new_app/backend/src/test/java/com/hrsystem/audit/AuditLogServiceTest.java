package com.hrsystem.audit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuditLogServiceTest {

    @Mock
    private AuditLogRepository auditLogRepository;

    @Mock
    private Authentication authentication;

    private AuditLogServiceImpl auditLogService;

    @BeforeEach
    void setUp() {
        auditLogService = new AuditLogServiceImpl(auditLogRepository);

        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void recordAction_persistsEntryWithAuthenticatedPrincipalAsActor_notClientSuppliedActor() {
        when(authentication.getName()).thenReturn("jane.doe@example.com");
        when(auditLogRepository.save(any(AuditLogEntry.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        // client-supplied actor is deliberately wrong/forged; the service must
        // ignore it and use the authenticated principal instead, since UC-01
        // shows the login layer can be spoofed and audit trails must not
        // inherit that weakness.
        AuditEvent event = new AuditEvent(
                "forged.actor@example.com",
                "EMPLOYEE_TRANSFER",
                "EMPLOYEE",
                "1042",
                AuditOutcome.SUCCESS,
                null);

        auditLogService.recordAction(event);

        ArgumentCaptor<AuditLogEntry> captor = ArgumentCaptor.forClass(AuditLogEntry.class);
        verify(auditLogRepository).save(captor.capture());
        assertThat(captor.getValue().getActorEmail()).isEqualTo("jane.doe@example.com");
        assertThat(captor.getValue().getAction()).isEqualTo("EMPLOYEE_TRANSFER");
        assertThat(captor.getValue().getOutcome()).isEqualTo(AuditOutcome.SUCCESS);
        assertThat(captor.getValue().getTimestamp()).isBeforeOrEqualTo(Instant.now());
    }

    @Test
    void recordAction_missingAction_throwsBeforePersisting() {
        when(authentication.getName()).thenReturn("jane.doe@example.com");

        AuditEvent event = new AuditEvent(
                "jane.doe@example.com", null, "EMPLOYEE", "1042", AuditOutcome.SUCCESS, null);

        assertThatThrownBy(() -> auditLogService.recordAction(event))
                .isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void recordAction_missingEntityReference_throwsBeforePersisting() {
        when(authentication.getName()).thenReturn("jane.doe@example.com");

        AuditEvent event = new AuditEvent(
                "jane.doe@example.com", "EMPLOYEE_TRANSFER", "EMPLOYEE", null, AuditOutcome.SUCCESS, null);

        assertThatThrownBy(() -> auditLogService.recordAction(event))
                .isInstanceOf(IllegalArgumentException.class);

        verifyNoInteractions(auditLogRepository);
    }

    @Test
    void recordAction_repositoryFailure_propagatesException_failClosedPerNfrR2() {
        when(authentication.getName()).thenReturn("jane.doe@example.com");
        when(auditLogRepository.save(any(AuditLogEntry.class)))
                .thenThrow(new DataAccessException("write failed") {});

        AuditEvent event = new AuditEvent(
                "jane.doe@example.com", "EMPLOYEE_TRANSFER", "EMPLOYEE", "1042", AuditOutcome.SUCCESS, null);

        // NFR-R2 requires audit writes to be fail-closed: a persistence failure
        // must not be swallowed, so the caller (and its enclosing transaction)
        // can fail instead of completing silently without an audit trail.
        assertThatThrownBy(() -> auditLogService.recordAction(event))
                .isInstanceOf(DataAccessException.class);
    }

    @Test
    void recordAction_noAuthenticatedPrincipal_throwsRatherThanRecordingAnonymousActor() {
        SecurityContext emptyContext = mock(SecurityContext.class);
        when(emptyContext.getAuthentication()).thenReturn(null);
        SecurityContextHolder.setContext(emptyContext);

        AuditEvent event = new AuditEvent(
                "someone@example.com", "EMPLOYEE_TRANSFER", "EMPLOYEE", "1042", AuditOutcome.SUCCESS, null);

        assertThatThrownBy(() -> auditLogService.recordAction(event))
                .isInstanceOf(IllegalStateException.class);

        verifyNoInteractions(auditLogRepository);
    }
}
