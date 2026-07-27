package com.example.app.employee.service;

import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.service.AuditService;
import com.example.app.common.dto.PageMeta;
import com.example.app.common.dto.PageResponse;
import com.example.app.common.exception.BusinessRuleException;
import com.example.app.common.exception.ConflictException;
import com.example.app.common.exception.ErrorDetail;
import com.example.app.common.exception.NotFoundException;
import com.example.app.common.exception.ValidationException;
import com.example.app.employee.domain.ChangeType;
import com.example.app.employee.domain.Employee;
import com.example.app.employee.domain.EmployeeHistory;
import com.example.app.employee.domain.EmployeeStatus;
import com.example.app.employee.dto.CreateEmployeeRequest;
import com.example.app.employee.dto.EmployeeDto;
import com.example.app.employee.dto.EmployeeHistoryDto;
import com.example.app.employee.dto.UpdateEmployeeRequest;
import com.example.app.employee.dto.UpdateEmployeeResponse;
import com.example.app.employee.repository.EmployeeHistoryRepository;
import com.example.app.employee.repository.EmployeeRepository;
import com.example.app.employee.repository.EmployeeSpecifications;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Owns the Employee aggregate (Domain Model: Employee Management Context). Every
 * state-changing operation here writes its EmployeeHistory row explicitly, inside
 * the same transaction as the mutation — the direct, testable replacement for the
 * broken TRG_EMP_BEFORE_UPDATE, which fired ORA-00904/ORA-02290 on every transfer,
 * promotion, termination, and rehire in the legacy system (Stack Mapping Contract
 * row 1 / non-negotiable #1). Each of those same operations also calls
 * AuditService.logAction (Action Audit Logging sprint) as one of this cross-cutting
 * concern's two known callers — the call happens inside this same @Transactional
 * method, so if the audit write fails, the whole state change rolls back instead of
 * the legacy PKG_AUDIT.log_action behavior of succeeding silently (DISC-006).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class EmployeeService {

    private static final int DEFAULT_PAGE_LIMIT = 20;
    private static final int MAX_PAGE_LIMIT = 100;
    private static final String AUDIT_ENTITY_TYPE = "EMPLOYEE";

    private final EmployeeRepository employeeRepository;
    private final EmployeeHistoryRepository employeeHistoryRepository;
    private final HireDatePolicy hireDatePolicy;
    private final AuditService auditService;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public EmployeeDto hire(CreateEmployeeRequest request) {
        String email = normalizeEmail(request.email());
        if (employeeRepository.existsByEmail(email)) {
            throw new ConflictException("EMPLOYEE_EMAIL_EXISTS", "An employee with this email already exists");
        }

        Employee employee = new Employee();
        employee.setFirstName(request.firstName());
        employee.setLastName(request.lastName());
        employee.setEmail(email);
        employee.setHireDate(request.hireDate());
        employee.setDepartment(request.department());
        employee.setJobRole(request.jobRole());
        employee.setSalaryBand(request.salaryBand());
        employee.setSsnEncrypted(request.ssn());
        employee.setStatus(EmployeeStatus.ACTIVE);
        employee = employeeRepository.save(employee);

        // BR-hire-date-drift/DISC-001 is unresolved (90 vs 180 days); this call is the
        // single seam through which that threshold reaches the system, ready for the
        // Leave Management Context sprint to wire into leave-accrual eligibility.
        LocalDate eligibilityDate = hireDatePolicy.calculateEligibilityDate(employee.getHireDate());
        log.info("Computed leave-eligibility date {} for newly hired employee {}", eligibilityDate, employee.getId());

        writeHistory(employee.getId(), ChangeType.HIRE, null, employee.getHireDate().toString());
        auditService.logAction(AUDIT_ENTITY_TYPE, employee.getId().toString(), "HIRE", currentActor(),
            AuditOutcome.SUCCESS, "Hired into " + employee.getDepartment() + " as " + employee.getJobRole());

        return EmployeeDto.from(employee);
    }

    /**
     * Directory-wide browse is not part of the RBAC model's EMPLOYEE (self-service)
     * permissions (Security Architecture Doc 13 §3: "Read own profile, own
     * history") — only ADMIN/MANAGER may list across the roster.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional(readOnly = true)
    public PageResponse<EmployeeDto> list(String department, String jobRole, String status,
                                           LocalDate hiredAfter, LocalDate hiredBefore,
                                           String cursor, Integer limit) {
        int pageSize = clampLimit(limit);
        int pageNumber = parseCursor(cursor);
        EmployeeStatus statusFilter = parseStatus(status);

        Page<Employee> page = employeeRepository.findAll(
            EmployeeSpecifications.withFilters(department, jobRole, statusFilter, hiredAfter, hiredBefore),
            PageRequest.of(pageNumber, pageSize, Sort.by("id")));

        List<EmployeeDto> data = page.getContent().stream().map(EmployeeDto::from).toList();
        String nextCursor = page.hasNext() ? String.valueOf(pageNumber + 1) : null;
        return new PageResponse<>(data, new PageMeta(nextCursor, pageSize, (int) page.getTotalElements()));
    }

    /**
     * ADMIN/MANAGER may read any employee; an EMPLOYEE principal may only read
     * their own record (Security Architecture Doc 13 §3). The self-access check
     * relies on the employeeId claim JwtAuthenticationFilter now attaches to the
     * Authentication principal.
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') or #employeeId == authentication.principal.employeeId")
    @Transactional(readOnly = true)
    public EmployeeDto getById(Long employeeId) {
        return employeeRepository.findById(employeeId)
            .map(EmployeeDto::from)
            .orElseThrow(() -> notFound(employeeId));
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER')")
    @Transactional
    public UpdateEmployeeResponse updateProfile(Long employeeId, UpdateEmployeeRequest request) {
        if (request.department() == null && request.jobRole() == null && request.salaryBand() == null) {
            throw new ValidationException("At least one of department, job_role, or salary_band must be provided",
                List.of(new ErrorDetail("body", "no fields to update")));
        }

        Employee employee = employeeRepository.findById(employeeId).orElseThrow(() -> notFound(employeeId));
        if (employee.getStatus() == EmployeeStatus.TERMINATED) {
            throw new BusinessRuleException("EMPLOYEE_TERMINATED",
                "Cannot transfer, promote, or change the salary band of a terminated employee");
        }

        List<Long> historyEntryIds = new ArrayList<>();
        List<String> changedFields = new ArrayList<>();

        if (request.department() != null && !request.department().equals(employee.getDepartment())) {
            historyEntryIds.add(writeHistory(employeeId, ChangeType.TRANSFER, employee.getDepartment(), request.department()));
            changedFields.add("department");
            employee.setDepartment(request.department());
        }
        if (request.jobRole() != null && !request.jobRole().equals(employee.getJobRole())) {
            historyEntryIds.add(writeHistory(employeeId, ChangeType.PROMOTION, employee.getJobRole(), request.jobRole()));
            changedFields.add("job_role");
            employee.setJobRole(request.jobRole());
        }
        if (request.salaryBand() != null && !request.salaryBand().equals(employee.getSalaryBand())) {
            historyEntryIds.add(writeHistory(employeeId, ChangeType.SALARY_CHANGE, employee.getSalaryBand(), request.salaryBand()));
            changedFields.add("salary_band");
            employee.setSalaryBand(request.salaryBand());
        }

        employee = employeeRepository.save(employee);

        if (!changedFields.isEmpty()) {
            auditService.logAction(AUDIT_ENTITY_TYPE, employeeId.toString(), "UPDATE_PROFILE", currentActor(),
                AuditOutcome.SUCCESS, "Updated field(s): " + String.join(", ", changedFields));
        }

        return new UpdateEmployeeResponse(EmployeeDto.from(employee), historyEntryIds);
    }

    /**
     * Same self-access rule as getById: full change history (salary, transfers,
     * terminations) is at least as sensitive as the base profile, so it gets the
     * same ADMIN/MANAGER-or-owner scoping rather than isAuthenticated().
     */
    @PreAuthorize("hasAnyRole('ADMIN', 'MANAGER') or #employeeId == authentication.principal.employeeId")
    @Transactional(readOnly = true)
    public PageResponse<EmployeeHistoryDto> getHistory(Long employeeId, String cursor, Integer limit) {
        if (!employeeRepository.existsById(employeeId)) {
            throw notFound(employeeId);
        }
        int pageSize = clampLimit(limit);
        int pageNumber = parseCursor(cursor);

        Page<EmployeeHistory> page = employeeHistoryRepository.findByEmployeeIdOrderByChangedAtDesc(
            employeeId, PageRequest.of(pageNumber, pageSize));

        List<EmployeeHistoryDto> data = page.getContent().stream().map(EmployeeHistoryDto::from).toList();
        String nextCursor = page.hasNext() ? String.valueOf(pageNumber + 1) : null;
        return new PageResponse<>(data, new PageMeta(nextCursor, pageSize, (int) page.getTotalElements()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public EmployeeDto terminate(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId).orElseThrow(() -> notFound(employeeId));
        if (employee.getStatus() == EmployeeStatus.TERMINATED) {
            throw new BusinessRuleException("EMPLOYEE_ALREADY_TERMINATED", "Employee is already terminated");
        }

        EmployeeStatus previousStatus = employee.getStatus();
        employee.setStatus(EmployeeStatus.TERMINATED);
        employee = employeeRepository.save(employee);
        writeHistory(employeeId, ChangeType.TERMINATION, previousStatus.name(), EmployeeStatus.TERMINATED.name());
        auditService.logAction(AUDIT_ENTITY_TYPE, employeeId.toString(), "TERMINATE", currentActor(),
            AuditOutcome.SUCCESS, "Status changed from " + previousStatus + " to " + EmployeeStatus.TERMINATED);

        return EmployeeDto.from(employee);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public EmployeeDto rehire(Long employeeId) {
        Employee employee = employeeRepository.findById(employeeId).orElseThrow(() -> notFound(employeeId));
        if (employee.getStatus() != EmployeeStatus.TERMINATED) {
            throw new BusinessRuleException("EMPLOYEE_NOT_TERMINATED", "Only a terminated employee can be rehired");
        }

        employee.setStatus(EmployeeStatus.ACTIVE);
        employee = employeeRepository.save(employee);
        writeHistory(employeeId, ChangeType.REHIRE, EmployeeStatus.TERMINATED.name(), EmployeeStatus.ACTIVE.name());
        auditService.logAction(AUDIT_ENTITY_TYPE, employeeId.toString(), "REHIRE", currentActor(),
            AuditOutcome.SUCCESS, "Status changed from " + EmployeeStatus.TERMINATED + " to " + EmployeeStatus.ACTIVE);

        return EmployeeDto.from(employee);
    }

    private Long writeHistory(Long employeeId, ChangeType changeType, String oldValue, String newValue) {
        EmployeeHistory history = new EmployeeHistory();
        history.setEmployeeId(employeeId);
        history.setChangeType(changeType);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setChangedBy(currentActor());
        return employeeHistoryRepository.save(history).getId();
    }

    private String currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "SYSTEM";
    }

    private NotFoundException notFound(Long employeeId) {
        return new NotFoundException("EMPLOYEE_NOT_FOUND", "No employee found with id " + employeeId);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
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

    private EmployeeStatus parseStatus(String status) {
        if (status == null || status.isBlank()) {
            return null;
        }
        try {
            return EmployeeStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ValidationException("Invalid status filter",
                List.of(new ErrorDetail("status", "must be one of ACTIVE, TERMINATED, ON_LEAVE")));
        }
    }
}
