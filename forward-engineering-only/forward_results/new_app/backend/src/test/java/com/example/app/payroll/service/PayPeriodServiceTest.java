package com.example.app.payroll.service;

// Contract inferred from the sprint's DTO/repository naming (PayPeriodDto, PayPeriodResponse) —
// no PayPeriodService/PayPeriodRepository source exists yet. PayPeriod status is assumed to be
// a nested enum (PayPeriod.Status: OPEN, CLOSED) since no separate enum file was listed for the sprint.
// Backend implementers should reconcile this file's assumptions with the real classes once written.

import com.example.app.common.exception.ResourceNotFoundException;
import com.example.app.payroll.domain.PayPeriod;
import com.example.app.payroll.dto.PayPeriodDto;
import com.example.app.payroll.dto.PayPeriodResponse;
import com.example.app.payroll.repository.PayPeriodRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PayPeriodServiceTest {

    @Mock
    private PayPeriodRepository payPeriodRepository;

    private PayPeriodService payPeriodService;

    private PayPeriod openPeriod;
    private PayPeriod closedPeriod;

    @BeforeEach
    void setUp() {
        payPeriodService = new PayPeriodService(payPeriodRepository);

        openPeriod = new PayPeriod();
        openPeriod.setId(1L);
        openPeriod.setStartDate(LocalDate.of(2026, 7, 1));
        openPeriod.setEndDate(LocalDate.of(2026, 7, 15));
        openPeriod.setPayDate(LocalDate.of(2026, 7, 20));
        openPeriod.setStatus(PayPeriod.Status.OPEN);

        closedPeriod = new PayPeriod();
        closedPeriod.setId(2L);
        closedPeriod.setStartDate(LocalDate.of(2026, 6, 1));
        closedPeriod.setEndDate(LocalDate.of(2026, 6, 15));
        closedPeriod.setPayDate(LocalDate.of(2026, 6, 20));
        closedPeriod.setStatus(PayPeriod.Status.CLOSED);
    }

    @Test
    void listPayPeriods_returnsAllPeriodsWhenNoStatusFilterGiven() {
        when(payPeriodRepository.findAllByOrderByStartDateDesc())
                .thenReturn(List.of(openPeriod, closedPeriod));

        List<PayPeriodDto> result = payPeriodService.listPayPeriods(null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getId()).isEqualTo(1L);
    }

    @Test
    void listPayPeriods_filtersByStatusWhenProvided() {
        when(payPeriodRepository.findByStatusOrderByStartDateDesc(PayPeriod.Status.CLOSED))
                .thenReturn(List.of(closedPeriod));

        List<PayPeriodDto> result = payPeriodService.listPayPeriods(PayPeriod.Status.CLOSED);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(PayPeriod.Status.CLOSED);
        verify(payPeriodRepository).findByStatusOrderByStartDateDesc(PayPeriod.Status.CLOSED);
    }

    @Test
    void listPayPeriods_returnsEmptyListWhenNoneExist() {
        when(payPeriodRepository.findAllByOrderByStartDateDesc()).thenReturn(List.of());

        List<PayPeriodDto> result = payPeriodService.listPayPeriods(null);

        assertThat(result).isEmpty();
    }

    @Test
    void getPayPeriod_returnsResponseWhenFound() {
        when(payPeriodRepository.findById(1L)).thenReturn(Optional.of(openPeriod));

        PayPeriodResponse response = payPeriodService.getPayPeriod(1L);

        assertThat(response.getId()).isEqualTo(1L);
        assertThat(response.getStartDate()).isEqualTo(LocalDate.of(2026, 7, 1));
        assertThat(response.getStatus()).isEqualTo(PayPeriod.Status.OPEN);
    }

    @Test
    void getPayPeriod_throwsResourceNotFoundWhenMissing() {
        when(payPeriodRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> payPeriodService.getPayPeriod(99L))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
