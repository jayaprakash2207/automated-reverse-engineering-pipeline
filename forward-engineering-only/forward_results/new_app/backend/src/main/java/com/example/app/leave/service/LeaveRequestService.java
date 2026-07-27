package com.example.app.leave.service;

import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.service.AuditService;
import com.example.app.common.dto.PageMeta;
import com.example.app.common.dto.PageResponse;
import com.example.app.common.dto.ResponseMeta;
import com.example.app.common.dto.SourceConfidence;
import com.example.app.common.exception.AccessDeniedException;
import com.example.app.common.exception.BusinessRuleException;
import com.example.app.common.exception.ErrorDetail;
import com.example.app.common.exception.NotFoundException;
import com.example.app.common.exception.ValidationException;
import com.example.app.employee.repository.EmployeeRepository;
import com.example.app.leave.domain.LeaveRequest;
import com.example.app.leave.domain.LeaveRequestStatus;
import com.example.app.leave.dto.ApproveLeaveRequestRequest;
import com.example.app.leave.dto.CreateLeaveRequestRequest;
import com.example.app.leave.dto.LeaveRequestActionResponse;
import com.example.app.leave.dto.LeaveRequestCancelResponse;
import com.example.app.leave.dto.LeaveRequestDto;
import com.example.app.leave.dto.LeaveRequestSubmittedResponse;
import com.example.app.leave.dto.RejectLeaveRequestRequest;
import com.example.app.leave.repository.LeaveRequestRepository;
import com.example.app.leave.repository.LeaveRequestSpecifications;
import com.example.app.security.model.AuthenticatedUser;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Owns the Leave Request aggregate (Domain Model: "Leave Management Context").
 * Closes the headline pain point in the Business Requirements Document
 * (§4: "No manager leave-approval capability ... a hard business requirement
 * gap") via {@link #approve} and {@link #reject}
 * (11_API_CONTRACT_SPECIFICATION.md §3.3/§3.4, marked [NEW - GAP CLOSURE]).
 *
 * <p><b>Known limitation (OQ-006):</b> the API contract's §3.3 auth note --
 * "requester must be the employee's manager" -- cannot be enforced as written
 * because no manager-of-employee relationship exists anywhere in the schema
 * (Data Model Specification: manager/reporting-line column confirmed MISSING).
 * Approve/reject/list-for-manager are therefore gated on the MANAGER or ADMIN
 * role only, not on a verified manager-employee link. This is a deliberate,
 * documented interim decision -- not a silent gap -- and should be tightened to
 * per-employee manager scoping the moment that relationship is added to the
 * Employee Management Context.
 */
@Service
@RequiredArgsConstructor
public class LeaveRequestService {

    private static final int DEFAULT_PAGE_LIMIT = 20;
    private static final int MAX_PAGE_LIMIT = 100;
    private static final String AUDIT_ENTITY_TYPE = "LEAVE_REQUEST";

    private final LeaveRequestRepository leaveRequestRepository;
    private final EmployeeRepository employeeRepository;
    private final LeaveBalanceService leaveBalanceService;
    private final AuditService auditService;

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') or #employeeId == authentication.principal.employeeId")
    @Transactional
    public LeaveRequestSubmittedResponse submit(Long employeeId, CreateLeaveRequestRequest request) {
        if (!employeeRepository.existsById(employeeId)) {
            throw new NotFoundException("EMPLOYEE_NOT_FOUND", "No employee found with id " + employeeId);
        }
        if (request.endDate().isBefore(request.startDate())) {
            throw new ValidationException("End date must not be before start date",
                List.of(new ErrorDetail("end_date", "must be on or after start_date")));
        }

        LeaveRequest leaveRequest = new LeaveRequest();
        leaveRequest.setEmployeeId(employeeId);
        leaveRequest.setLeaveType(request.leaveType());
        leaveRequest.setStartDate(request.startDate());
        leaveRequest.setEndDate(request.endDate());
        leaveRequest.setReason(request.reason());
        leaveRequest.setStatus(LeaveRequestStatus.PENDING);
        leaveRequest = leaveRequestRepository.save(leaveRequest);

        // BR-leave-balance-formula/DISC-002 is unresolved; this is the single seam
        // through which the eventual canonical formula reaches this endpoint.
        Integer balanceAfter = leaveBalanceService
            .calculateBalanceAfter(employeeId, request.leaveType(), request.startDate(), request.endDate())
            .orElse(null);
        SourceConfidence confidence = balanceAfter != null ? SourceConfidence.MEDIUM : SourceConfidence.LOW;

        auditService.logAction(AUDIT_ENTITY_TYPE, leaveRequest.getId().toString(), "SUBMIT", currentActor(),
            AuditOutcome.SUCCESS, "Submitted " + request.leaveType() + " leave from " + request.startDate() + " to " + request.endDate());

        return new LeaveRequestSubmittedResponse(leaveRequest.getId(), leaveRequest.getStatus(), balanceAfter, new ResponseMeta(confidence));
    }

    /**
     * Self-cancellation (Business Requirements Document §4: confirmed functional
     * in the source system). Object-level ownership can only be checked after the
     * row is loaded, so unlike the role-only checks elsewhere in this service,
     * authorization here is enforced in the method body rather than declaratively.
     */
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public LeaveRequestCancelResponse cancel(Long leaveRequestId) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId).orElseThrow(() -> notFound(leaveRequestId));

        if (!isAdmin() && !leaveRequest.getEmployeeId().equals(currentEmployeeId())) {
            throw new AccessDeniedException("LEAVE_REQUEST_ACCESS_DENIED", "You may only cancel your own leave requests");
        }
        if (leaveRequest.getStatus() != LeaveRequestStatus.PENDING) {
            throw new BusinessRuleException("LEAVE_REQUEST_NOT_CANCELLABLE", "Only a pending leave request can be cancelled");
        }

        leaveRequest.setStatus(LeaveRequestStatus.CANCELLED);
        leaveRequest = leaveRequestRepository.save(leaveRequest);
        auditService.logAction(AUDIT_ENTITY_TYPE, leaveRequestId.toString(), "CANCEL", currentActor(),
            AuditOutcome.SUCCESS, "Cancelled by " + currentActor());

        return new LeaveRequestCancelResponse(leaveRequest.getId(), leaveRequest.getStatus());
    }

    /**
     * [NEW - GAP CLOSURE] 11_API_CONTRACT_SPECIFICATION.md §3.3. The audit write
     * happens inside this same transaction: if it fails, AuditWriteFailedException
     * propagates and this method's status change rolls back with it -- the
     * deliberate opposite of PKG_AUDIT.log_action's "succeed silently" behavior
     * (DISC-006).
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional
    public LeaveRequestActionResponse approve(Long leaveRequestId, ApproveLeaveRequestRequest request) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId).orElseThrow(() -> notFound(leaveRequestId));
        if (leaveRequest.getStatus() != LeaveRequestStatus.PENDING) {
            throw new BusinessRuleException("LEAVE_REQUEST_NOT_PENDING", "Only a pending leave request can be approved");
        }

        leaveRequest.setStatus(LeaveRequestStatus.APPROVED);
        leaveRequest.setApproverComment(request.comment());
        leaveRequest.setDecidedBy(currentActor());
        leaveRequest.setDecidedAt(Instant.now());
        leaveRequest = leaveRequestRepository.save(leaveRequest);

        Long auditEntryId = auditService.logAction(AUDIT_ENTITY_TYPE, leaveRequestId.toString(), "APPROVE", currentActor(),
            AuditOutcome.SUCCESS, "Approved" + (request.comment() != null ? ": " + request.comment() : "")).getId();

        return new LeaveRequestActionResponse(leaveRequest.getId(), leaveRequest.getStatus(), auditEntryId);
    }

    /** [NEW - GAP CLOSURE] 11_API_CONTRACT_SPECIFICATION.md §3.4. Same shape as approve, reason is mandatory. */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional
    public LeaveRequestActionResponse reject(Long leaveRequestId, RejectLeaveRequestRequest request) {
        LeaveRequest leaveRequest = leaveRequestRepository.findById(leaveRequestId).orElseThrow(() -> notFound(leaveRequestId));
        if (leaveRequest.getStatus() != LeaveRequestStatus.PENDING) {
            throw new BusinessRuleException("LEAVE_REQUEST_NOT_PENDING", "Only a pending leave request can be rejected");
        }

        leaveRequest.setStatus(LeaveRequestStatus.REJECTED);
        leaveRequest.setRejectionReason(request.reason());
        leaveRequest.setDecidedBy(currentActor());
        leaveRequest.setDecidedAt(Instant.now());
        leaveRequest = leaveRequestRepository.save(leaveRequest);

        Long auditEntryId = auditService.logAction(AUDIT_ENTITY_TYPE, leaveRequestId.toString(), "REJECT", currentActor(),
            AuditOutcome.SUCCESS, "Rejected: " + request.reason()).getId();

        return new LeaveRequestActionResponse(leaveRequest.getId(), leaveRequest.getStatus(), auditEntryId);
    }

    /**
     * [NEW - GAP CLOSURE] Manager inbox (11_API_CONTRACT_SPECIFICATION.md §3.5).
     * managerId is accepted for contract-shape compliance and as a
     * self-identification check (a non-ADMIN caller may only pass their own id),
     * but it does not filter the underlying data -- see the class-level OQ-006
     * note. The result set is therefore every request matching the status filter,
     * not only "this manager's direct reports."
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional(readOnly = true)
    public PageResponse<LeaveRequestDto> listForManager(Long managerId, String status, String cursor, Integer limit) {
        if (managerId != null && !isAdmin() && !managerId.equals(currentEmployeeId())) {
            throw new AccessDeniedException("MANAGER_INBOX_ACCESS_DENIED", "You may only view your own manager inbox");
        }

        int pageSize = clampLimit(limit);
        int pageNumber = parseCursor(cursor);
        LeaveRequestStatus statusFilter = parseStatus(status);

        Page<LeaveRequest> page = leaveRequestRepository.findAll(
            LeaveRequestSpecifications.withFilters(statusFilter),
            PageRequest.of(pageNumber, pageSize, Sort.by(Sort.Direction.DESC, "createdAt")));

        List<LeaveRequestDto> data = page.getContent().stream().map(LeaveRequestDto::from).toList();
        String nextCursor = page.hasNext() ? String.valueOf(pageNumber + 1) : null;
        return new PageResponse<>(data, new PageMeta(nextCursor, pageSize, (int) page.getTotalElements()));
    }

    private boolean isAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
            .anyMatch(authority -> authority.getAuthority().equals("ROLE_ADMIN"));
    }

    private Long currentEmployeeId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.getEmployeeId();
        }
        return null;
    }

    private String currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "SYSTEM";
    }

    private NotFoundException notFound(Long leaveRequestId) {
        return new NotFoundException("LEAVE_REQUEST_NOT_FOUND", "No leave request found with id " + leaveRequestId);
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

    private LeaveRequestStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return LeaveRequestStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid status filter",
                List.of(new ErrorDetail("status", "must be one of PENDING, APPROVED, REJECTED, CANCELLED")));
        }
    }
}
