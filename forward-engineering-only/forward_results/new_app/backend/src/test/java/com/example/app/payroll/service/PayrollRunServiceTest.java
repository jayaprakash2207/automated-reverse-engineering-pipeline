package com.example.app.payroll.service;

// Business rules encoded here (closed-pay-period precondition, no concurrent active run per
// period, retry allowed after a FAILED run) are inferred from BRD/OQ-003 caution around
// unconfirmed payroll business rules — treat as provisional pending business owner sign-off,
// same caveat the frontend surfaces via ProvisionalBanner.

import com.example.app.common.exception.BusinessRuleViolationException;
import com.example.app.common.exception.ResourceNotFoundException;
import com.example.app.payroll.domain.PayPeriod;
import com.example.app.payroll.domain.PayrollRun;
import com.example.app.payroll.dto.CreatePayrollRunRequest;
import com.example.app.payroll.dto.PayrollRunDto;
import com.example.app.payroll.dto.PayrollRunResponse;
import com.example.app.payroll.repository.PayPeriodRepository;
import com.example.app.payroll.repository.PayrollRunRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollRunServiceTest {

    @Mock
    private PayrollRunRepository payrollRunRepository;

    @Mock
    private PayPeriodRepository payPeriodRepository;

    private PayrollRunService payrollRunService;

    private PayPeriod closedPeriod;
    private PayPeriod openPeriod;

    @BeforeEach
    void setUp() {
        payrollRunService = new PayrollRunService(payrollRunRepository, payPeriodRepository);

        closedPeriod = new PayPeriod();
        closedPeriod.setId(10L);
        closedPeriod.setStartDate(LocalDate.of(2026, 6, 1));
        closedPeriod.setEndDate(LocalDate.of(2026, 6, 15));
        closedPeriod.setPayDate(LocalDate.of(2026, 6, 20));
        closedPeriod.setStatus(PayPeriod.Status.CLOSED);

        openPeriod = new PayPeriod();
        openPeriod.setId(11L);
        openPeriod.setStartDate(LocalDate.of(2026, 7, 1));
        openPeriod.setEndDate(LocalDate.of(2026, 7, 15));
        openPeriod.setPayDate(LocalDate.of(2026, 7, 20));
        openPeriod.setStatus(PayPeriod.Status.OPEN);
    }

    @Test
    void createPayrollRun_throwsResourceNotFoundWhenPayPeriodMissing() {
        CreatePayrollRunRequest request = new CreatePayrollRunRequest();
        request.setPayPeriodId(999L);
        when(payPeriodRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> payrollRunService.createPayrollRun(request))
                .isInstanceOf(ResourceNotFoundException.class);

        verify(payrollRunRepository, never()).save(any());
    }

    @Test
    void createPayrollRun_rejectsPayPeriodThatIsStillOpen() {
        CreatePayrollRunRequest request = new CreatePayrollRunRequest();
        request.setPayPeriodId(11L);
        when(payPeriodRepository.findById(11L)).thenReturn(Optional.of(openPeriod));

        assertThatThrownBy(() -> payrollRunService.createPayrollRun(request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("closed");

        verify(payrollRunRepository, never()).save(any());
    }

    @Test
    void createPayrollRun_rejectsDuplicateWhenActiveRunAlreadyPending() {
        CreatePayrollRunRequest request = new CreatePayrollRunRequest();
        request.setPayPeriodId(10L);
        when(payPeriodRepository.findById(10L)).thenReturn(Optional.of(closedPeriod));
        when(payrollRunRepository.findByPayPeriodIdAndStatusIn(
                eq(10L), eq(List.of(PayrollRun.Status.PENDING, PayrollRun.Status.PROCESSING))))
                .thenReturn(List.of(new PayrollRun()));

        assertThatThrownBy(() -> payrollRunService.createPayrollRun(request))
                .isInstanceOf(BusinessRuleViolationException.class)
                .hasMessageContaining("already");

        verify(payrollRunRepository, never()).save(any());
    }

    @Test
    void createPayrollRun_allowsRetryWhenPriorRunFailed() {
        CreatePayrollRunRequest request = new CreatePayrollRunRequest();
        request.setPayPeriodId(10L);
        when(payPeriodRepository.findById(10L)).thenReturn(Optional.of(closedPeriod));
        when(payrollRunRepository.findByPayPeriodIdAndStatusIn(
                eq(10L), eq(List.of(PayrollRun.Status.PENDING, PayrollRun.Status.PROCESSING))))
                .thenReturn(List.of());
        when(payrollRunRepository.save(any(PayrollRun.class)))
                .thenAnswer(invocation -> {
                    PayrollRun run = invocation.getArgument(0);
                    run.setId(500L);
                    return run;
                });

        PayrollRunResponse response = payrollRunService.createPayrollRun(request);

        assertThat(response.getId()).isEqualTo(500L);
        assertThat(response.getStatus()).isEqualTo(PayrollRun.Status.PENDING);
        assertThat(response.getPayPeriodId()).isEqualTo(10L);
    }

    @Test
    void createPayrollRun_persistsRunWithPendingStatusAndInitiatedTimestamp() {
        CreatePayrollRunRequest request = new CreatePayrollRunRequest();
        request.setPayPeriodId(10L);
        when(payPeriodRepository.findById(10L)).thenReturn(Optional.of(closedPeriod));
        when(payrollRunRepository.findByPayPeriodIdAndStatusIn(eq(10L), any()))
                .thenReturn(List.of());
        when(payrollRunRepository.save(any(PayrollRun.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        ArgumentCaptor<PayrollRun> captor = ArgumentCaptor.forClass(PayrollRun.class);

        payrollRunService.createPayrollRun(request);

        verify(payrollRunRepository).save(captor.capture());
        PayrollRun saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(PayrollRun.Status.PENDING);
        assertThat(saved.getInitiatedAt()).isNotNull();
        assertThat(saved.getPayPeriod()).isEqualTo(closedPeriod);
    }

    @Test
    void getPayrollRun_throwsResourceNotFoundWhenMissing() {
        when(payrollRunRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> payrollRunService.getPayrollRun(404L))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void listPayrollRuns_returnsRunsOrderedByInitiatedAtDescending() {
        PayrollRun run = new PayrollRun();
        run.setId(1L);
        run.setPayPeriod(closedPeriod);
        run.setStatus(PayrollRun.Status.COMPLETED);
        when(payrollRunRepository.findAllByOrderByInitiatedAtDesc()).thenReturn(List.of(run));

        List<PayrollRunDto> result = payrollRunService.listPayrollRuns();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(PayrollRun.Status.COMPLETED);
    }
}
