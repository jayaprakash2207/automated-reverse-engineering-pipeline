package com.example.app.audit.service;

import com.example.app.audit.domain.AuditEntry;
import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.dto.AuditEntryDto;
import com.example.app.audit.repository.AuditEntryRepository;
import com.example.app.audit.repository.AuditEntrySpecifications;
import com.example.app.common.dto.PageMeta;
import com.example.app.common.dto.PageResponse;
import com.example.app.common.exception.AuditWriteFailedException;
import com.example.app.common.exception.ErrorDetail;
import com.example.app.common.exception.ValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Direct replacement for PKG_AUDIT.log_action. DISC-006 confirms the legacy
 * procedure swallows constraint-violation errors internally, so its callers
 * (Security, Employee lifecycle) "succeed silently" with no audit trail. This
 * class fixes that by construction rather than by convention:
 *
 * <p>1. logAction runs with Propagation.MANDATORY -- it can only be called from
 * inside a transaction the caller already started (EmployeeService's and
 * AuthService's own @Transactional methods). If a future caller forgets to wrap
 * its mutation in a transaction, this throws immediately instead of silently
 * writing the audit row on its own, detached transaction, which would reopen the
 * exact "audit and action aren't really atomic" gap this sprint exists to close.
 *
 * <p>2. saveAndFlush forces the constraint check to fire synchronously at the call
 * site, not deferred to end-of-transaction commit, so a violation is caught and
 * turned into a typed AuditWriteFailedException (mapped to 500 AUDIT_WRITE_FAILED,
 * see GlobalExceptionHandler) while the caller's transaction can still roll back
 * cleanly (Stack Mapping Contract row 10 / non-negotiable #4: audit writes fail
 * closed, never swallow-and-continue).
 */
@Service
@RequiredArgsConstructor
public class AuditService {

    private static final int DEFAULT_PAGE_LIMIT = 20;
    private static final int MAX_PAGE_LIMIT = 100;

    private final AuditEntryRepository auditEntryRepository;

    @Transactional(propagation = Propagation.MANDATORY)
    public AuditEntry logAction(String entityType, String entityId, String action, String performedBy,
                                 AuditOutcome outcome, String details) {
        AuditEntry entry = new AuditEntry();
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setAction(action);
        entry.setPerformedBy(performedBy);
        entry.setOutcome(outcome);
        entry.setDetails(details);
        try {
            return auditEntryRepository.saveAndFlush(entry);
        } catch (DataAccessException e) {
            throw new AuditWriteFailedException(
                "Failed to write audit entry for " + entityType + ":" + entityId + " action=" + action, e);
        }
    }

    /**
     * 11_API_CONTRACT_SPECIFICATION.md §7.1: compliance review of the remediated
     * audit log. ADMIN and AUDIT_REVIEWER only, enforced here rather than just at
     * the controller edge (Stack Mapping Contract row 6). AUDIT_REVIEWER exists in
     * the RBAC vocabulary (security/domain/Role.java) specifically for this
     * compliance-review use case; it must actually be authorized here, not merely
     * defined in the enum.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDIT_REVIEWER')")
    @Transactional(readOnly = true)
    public PageResponse<AuditEntryDto> search(String entityType, String entityId, String cursor, Integer limit) {
        int pageSize = clampLimit(limit);
        int pageNumber = parseCursor(cursor);

        Page<AuditEntry> page = auditEntryRepository.findAll(
            AuditEntrySpecifications.withFilters(entityType, entityId),
            PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "occurredAt")));

        List<AuditEntryDto> data = page.getContent().stream().map(AuditEntryDto::from).toList();
        String nextCursor = page.hasNext() ? String.valueOf(pageNumber + 1) : null;
        return new PageResponse<>(data, new PageMeta(nextCursor, pageSize, (int) page.getTotalElements()));
    }

    private int clampLimit(Integer limit) {
        if (limit == null) {
            return DEFAULT_PAGE_LIMIT;
        }
        return Math.min(Math.max(limit, 1), MAX_PAGE_LIMIT);
    }

    private int parseCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            int page = Integer.parseInt(cursor);
            if (page < 0) {
                throw new NumberFormatException("negative cursor");
            }
            return page;
        } catch (NumberFormatException e) {
            throw new ValidationException("Invalid cursor",
                List.of(new ErrorDetail("cursor", "must be a non-negative page cursor")));
        }
    }
}
