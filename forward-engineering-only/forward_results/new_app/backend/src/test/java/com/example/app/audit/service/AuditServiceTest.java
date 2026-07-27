package com.example.app.audit.service;

import com.example.app.audit.domain.AuditEntry;
import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.repository.AuditEntryRepository;
import com.example.app.common.dto.PageResponse;
import com.example.app.common.exception.AuditWriteFailedException;
import com.example.app.common.exception.ValidationException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit-level coverage for AuditService. Complements AuditControllerIntegrationTest
 * (real HTTP + real Postgres) and AuditEntrySpecificationsIT (real Criteria
 * predicates) by pinning down the pure business logic AuditService owns itself:
 * page-size clamping and cursor parsing (11_API_CONTRACT_SPECIFICATION.md §7.1),
 * and the fail-closed write contract (DISC-006).
 */
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private AuditEntryRepository auditEntryRepository;

    private AuditService auditService;

    @BeforeEach
    void setUp() {
        auditService = new AuditService(auditEntryRepository);
    }

    @Test
    void should_persistAnAuditEntry_when_logActionSucceeds() {
        when(auditEntryRepository.saveAndFlush(any(AuditEntry.class))).thenAnswer(invocation -> {
            AuditEntry saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });

        AuditEntry result = auditService.logAction("EMPLOYEE", "42", "HIRE", "admin@example.com",
            AuditOutcome.SUCCESS, "Hired into Engineering");

        assertThat(result.getId()).isEqualTo(1L);
        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditEntryRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getEntityType()).isEqualTo("EMPLOYEE");
        assertThat(captor.getValue().getEntityId()).isEqualTo("42");
        assertThat(captor.getValue().getAction()).isEqualTo("HIRE");
        assertThat(captor.getValue().getPerformedBy()).isEqualTo("admin@example.com");
        assertThat(captor.getValue().getOutcome()).isEqualTo(AuditOutcome.SUCCESS);
    }

    @Test
    void should_persistAFailureOutcome_when_theCallerReportsAFailedAction() {
        when(auditEntryRepository.saveAndFlush(any(AuditEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        auditService.logAction("AUTH", "7", "LOGIN_FAILED", "unknown@example.com",
            AuditOutcome.FAILURE, "Unknown email");

        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditEntryRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getOutcome()).isEqualTo(AuditOutcome.FAILURE);
    }

    @Test
    void should_persistANullDetails_when_theCallerOmitsDetails_becauseTheColumnIsOptional() {
        when(auditEntryRepository.saveAndFlush(any(AuditEntry.class))).thenAnswer(invocation -> invocation.getArgument(0));

        auditService.logAction("EMPLOYEE", "42", "HIRE", "admin@example.com", AuditOutcome.SUCCESS, null);

        ArgumentCaptor<AuditEntry> captor = ArgumentCaptor.forClass(AuditEntry.class);
        verify(auditEntryRepository).saveAndFlush(captor.capture());
        assertThat(captor.getValue().getDetails()).isNull();
    }

    @Test
    void should_throwAuditWriteFailedException_when_repositoryRaisesAConstraintViolation_regressionForDISC006() {
        when(auditEntryRepository.saveAndFlush(any(AuditEntry.class)))
            .thenThrow(new DataIntegrityViolationException("constraint violation"));

        assertThatThrownBy(() ->
            auditService.logAction("EMPLOYEE", "42", "HIRE", "admin@example.com", AuditOutcome.SUCCESS, null))
            .isInstanceOf(AuditWriteFailedException.class);
    }

    @Test
    void should_throwValidation_when_searchCursorIsNotANumber() {
        assertThatThrownBy(() -> auditService.search(null, null, "not-a-number", null))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void should_throwValidation_when_searchCursorIsNegative() {
        assertThatThrownBy(() -> auditService.search(null, null, "-1", null))
            .isInstanceOf(ValidationException.class);
    }

    @Test
    void should_returnMappedPage_when_searchingByEntityTypeAndEntityId() {
        AuditEntry entry = new AuditEntry();
        entry.setId(1L);
        entry.setEntityType("EMPLOYEE");
        entry.setEntityId("42");
        entry.setAction("HIRE");
        entry.setPerformedBy("admin@example.com");
        entry.setOutcome(AuditOutcome.SUCCESS);
        Page<AuditEntry> page = new PageImpl<>(List.of(entry));
        when(auditEntryRepository.findAll(any(Specification.class), any(Pageable.class))).thenReturn(page);

        PageResponse<com.example.app.audit.dto.AuditEntryDto> result = auditService.search("EMPLOYEE", "42", null, null);

        assertThat(result.data()).hasSize(1);
        assertThat(result.data().get(0).entityId()).isEqualTo("42");
        assertThat(result.data().get(0).action()).isEqualTo("HIRE");
    }

    @Test
    void should_defaultToPageSize20_when_limitIsNotProvided() {
        when(auditEntryRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));

        auditService.search(null, null, null, null);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditEntryRepository).findAll(any(Specification.class), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageableCaptor.getValue().getPageNumber()).isZero();
    }

    @Test
    void should_clampLimitUpTo1_when_aNonPositiveLimitIsRequested() {
        when(auditEntryRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));

        auditService.search(null, null, null, -5);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditEntryRepository).findAll(any(Specification.class), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(1);
    }

    @Test
    void should_clampLimitDownTo100_when_anExcessiveLimitIsRequested() {
        when(auditEntryRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));

        auditService.search(null, null, null, 5000);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditEntryRepository).findAll(any(Specification.class), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(100);
    }

    @Test
    void should_treatABlankCursor_asTheFirstPage() {
        when(auditEntryRepository.findAll(any(Specification.class), any(Pageable.class)))
            .thenReturn(new PageImpl<>(List.of()));

        auditService.search(null, null, "   ", null);

        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(auditEntryRepository).findAll(any(Specification.class), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isZero();
    }
}
