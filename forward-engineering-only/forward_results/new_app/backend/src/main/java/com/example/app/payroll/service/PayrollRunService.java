package com.example.app.payroll.service;

import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.service.AuditService;
import com.example.app.common.dto.ResponseMeta;
import com.example.app.common.dto.SourceConfidence;
import com.example.app.common.exception.NotFoundException;
import com.example.app.payroll.domain.PayPeriod;
import com.example.app.payroll.domain.PayrollRun;
import com.example.app.payroll.dto.CreatePayrollRunRequest;
import com.example.app.payroll.dto.PayrollRunDto;
import com.example.app.payroll.dto.PayrollRunResponse;
import com.example.app.payroll.repository.PayPeriodRepository;
import com.example.app.payroll.repository.PayrollRunRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Owns the Payroll Run aggregate (Domain Model: "Payroll Context"). Per
 * 11_API_CONTRACT_SPECIFICATION.md §4, this is a contract-shape placeholder: no
 * payroll calculation is performed here (see PayrollRun's class-level note), only
 * the recording of "a run was initiated for this pay period." Actual computation
 * logic must not be reverse-engineered from the API contract and is deferred
 * pending BR-01..32 re-ingestion (OQ-003) and the remaining 28-table schema
 * (OQ-006).
 *
 * <p>The audit write for {@link #initiate} still runs inside the same transaction
 * as the state change, exactly like Employee/Leave's mutating operations
 * (Stack Mapping Contract row 10 / non-negotiable #4: audit writes fail closed for
 * every mutating endpoint, with no exceptions carved out for stub/placeholder
 * domains) -- if AuditService.logAction fails, initiate() rolls back with it.
 */
@Service
@RequiredArgsConstructor
public class PayrollRunService {

    private static final String AUDIT_ENTITY_TYPE = "PAYROLL_RUN";

    private final PayrollRunRepository payrollRunRepository;
    private final PayPeriodRepository payPeriodRepository;
    private final AuditService auditService;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public PayrollRunResponse initiate(CreatePayrollRunRequest request) {
        PayPeriod payPeriod = payPeriodRepository.findById(request.payPeriodId())
            .orElseThrow(() -> new NotFoundException("PAY_PERIOD_NOT_FOUND",
                "No pay period found with id " + request.payPeriodId()));

        PayrollRun run = new PayrollRun();
        run.setPayPeriodId(payPeriod.getId());
        run.setInitiatedBy(currentActor());
        run.setInitiatedAt(Instant.now());
        run = payrollRunRepository.save(run);

        auditService.logAction(AUDIT_ENTITY_TYPE, run.getId().toString(), "INITIATE", currentActor(),
            AuditOutcome.SUCCESS, "Initiated payroll run for pay period " + payPeriod.getId());

        return new PayrollRunResponse(PayrollRunDto.from(run), new ResponseMeta(SourceConfidence.LOW));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public PayrollRunResponse getById(Long payrollRunId) {
        PayrollRun run = payrollRunRepository.findById(payrollRunId).orElseThrow(() -> notFound(payrollRunId));
        return new PayrollRunResponse(PayrollRunDto.from(run), new ResponseMeta(SourceConfidence.LOW));
    }

    private NotFoundException notFound(Long payrollRunId) {
        return new NotFoundException("PAYROLL_RUN_NOT_FOUND", "No payroll run found with id " + payrollRunId);
    }

    private String currentActor() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null ? authentication.getName() : "SYSTEM";
    }
}
