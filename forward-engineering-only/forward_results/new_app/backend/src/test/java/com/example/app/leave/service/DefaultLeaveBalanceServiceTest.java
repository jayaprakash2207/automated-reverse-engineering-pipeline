package com.example.app.leave.service;

import com.example.app.leave.domain.LeaveRequestStatus;
import com.example.app.leave.repository.LeaveRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link DefaultLeaveBalanceService}.
 *
 * NOTE: BRD DISC-002 flags the leave-balance formula as unresolved between two upstream
 * sources. This implementation uses a placeholder formula
 * (annualEntitlement - sum(PENDING + APPROVED days in the leave type)) that must be
 * reconciled with the business owner before go-live. These tests pin down the CURRENT
 * placeholder behavior so a future formula change is a deliberate, visible diff here
 * rather than a silent regression.
 */
@ExtendWith(MockitoExtension.class)
class DefaultLeaveBalanceServiceTest {

    private static final Long EMPLOYEE_ID = 100L;
    private static final String LEAVE_TYPE = "ANNUAL";
    private static final BigDecimal ANNUAL_ENTITLEMENT_DAYS = BigDecimal.valueOf(20);

    @Mock
    private LeaveRequestRepository repository;

    private DefaultLeaveBalanceService service;

    @BeforeEach
    void setUp() {
        service = new DefaultLeaveBalanceService(repository, ANNUAL_ENTITLEMENT_DAYS);
    }

    private void stubUsedDays(BigDecimal usedDays) {
        when(repository.sumDaysRequestedByEmployeeIdAndLeaveTypeAndStatusIn(
                eq(EMPLOYEE_ID), eq(LEAVE_TYPE), any(List.class)))
                .thenReturn(usedDays);
    }

    @Test
    void getAvailableBalance_withNoPriorUsage_returnsFullEntitlement() {
        stubUsedDays(null);

        BigDecimal balance = service.getAvailableBalance(EMPLOYEE_ID, LEAVE_TYPE);

        assertThat(balance).isEqualByComparingTo(ANNUAL_ENTITLEMENT_DAYS);
    }

    @Test
    void getAvailableBalance_repositoryReturnsZero_returnsFullEntitlement() {
        stubUsedDays(BigDecimal.ZERO);

        BigDecimal balance = service.getAvailableBalance(EMPLOYEE_ID, LEAVE_TYPE);

        assertThat(balance).isEqualByComparingTo(ANNUAL_ENTITLEMENT_DAYS);
    }

    @Test
    void getAvailableBalance_subtractsUsedDaysFromEntitlement() {
        stubUsedDays(BigDecimal.valueOf(5));

        BigDecimal balance = service.getAvailableBalance(EMPLOYEE_ID, LEAVE_TYPE);

        assertThat(balance).isEqualByComparingTo(BigDecimal.valueOf(15));
    }

    @Test
    void getAvailableBalance_countsBothPendingAndApprovedDays() {
        stubUsedDays(BigDecimal.valueOf(5));

        service.getAvailableBalance(EMPLOYEE_ID, LEAVE_TYPE);

        // the "used" pool must include PENDING requests, not just APPROVED ones,
        // otherwise an employee could submit far more overlapping requests than
        // their balance allows while decisions are still outstanding.
        org.mockito.ArgumentCaptor<List> statusesCaptor = org.mockito.ArgumentCaptor.forClass(List.class);
        org.mockito.Mockito.verify(repository).sumDaysRequestedByEmployeeIdAndLeaveTypeAndStatusIn(
                eq(EMPLOYEE_ID), eq(LEAVE_TYPE), statusesCaptor.capture());
        assertThat(statusesCaptor.getValue())
                .containsExactlyInAnyOrder(LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED);
    }

    @Test
    void hasSufficientBalance_requestEqualToBalance_isSufficient() {
        stubUsedDays(BigDecimal.valueOf(15)); // balance == 5

        assertThat(service.hasSufficientBalance(EMPLOYEE_ID, LEAVE_TYPE, BigDecimal.valueOf(5))).isTrue();
    }

    @Test
    void hasSufficientBalance_requestOneDayOverBalance_isInsufficient() {
        stubUsedDays(BigDecimal.valueOf(15)); // balance == 5

        assertThat(service.hasSufficientBalance(EMPLOYEE_ID, LEAVE_TYPE, BigDecimal.valueOf(6))).isFalse();
    }

    @Test
    void hasSufficientBalance_zeroDayRequest_isAlwaysSufficient() {
        stubUsedDays(BigDecimal.valueOf(20)); // balance == 0

        assertThat(service.hasSufficientBalance(EMPLOYEE_ID, LEAVE_TYPE, BigDecimal.ZERO)).isTrue();
    }

    @Test
    void hasSufficientBalance_usedExceedsEntitlement_negativeBalanceIsInsufficientForAnyPositiveRequest() {
        stubUsedDays(BigDecimal.valueOf(25)); // over-allocated: balance == -5

        assertThat(service.hasSufficientBalance(EMPLOYEE_ID, LEAVE_TYPE, BigDecimal.ONE)).isFalse();
    }
}
