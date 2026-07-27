package com.example.app.leave.service;

import com.example.app.leave.domain.LeaveRequest;
import com.example.app.leave.domain.LeaveRequestStatus;
import com.example.app.leave.dto.ApproveLeaveRequestRequest;
import com.example.app.leave.dto.CreateLeaveRequestRequest;
import com.example.app.leave.dto.LeaveRequestDto;
import com.example.app.leave.dto.RejectLeaveRequestRequest;
import com.example.app.leave.repository.LeaveRequestRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link LeaveRequestService}, covering UC-03 (submit) business-rule
 * edge cases and UC-04 (manager approve/reject) access control -- the highest-severity
 * gap called out in the BRD ("no working screen anywhere in the system for a manager
 * to approve or reject a leave request").
 */
@ExtendWith(MockitoExtension.class)
class LeaveRequestServiceTest {

    private static final Long EMPLOYEE_ID = 100L;
    private static final Long MANAGER_ID = 900L;
    private static final Long OTHER_MANAGER_ID = 901L;

    @Mock
    private LeaveRequestRepository repository;

    @Mock
    private LeaveBalanceService leaveBalanceService;

    @Mock
    private ManagerResolver managerResolver;

    private LeaveRequestService service;

    @BeforeEach
    void setUp() {
        service = new LeaveRequestService(repository, leaveBalanceService, managerResolver);
    }

    private CreateLeaveRequestRequest validCreateRequest() {
        return new CreateLeaveRequestRequest(
                "ANNUAL",
                LocalDate.of(2026, 8, 10),
                LocalDate.of(2026, 8, 12),
                "Family trip");
    }

    private LeaveRequest pendingEntity() {
        return LeaveRequest.submit(EMPLOYEE_ID, MANAGER_ID, "ANNUAL",
                LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 12), BigDecimal.valueOf(3), "Family trip");
    }

    @Nested
    class Submit {

        @BeforeEach
        void stubHappyPathCollaborators() {
            when(managerResolver.resolveManagerId(EMPLOYEE_ID)).thenReturn(Optional.of(MANAGER_ID));
            when(repository.existsOverlapping(eq(EMPLOYEE_ID), any(), any(), anyList())).thenReturn(false);
            when(leaveBalanceService.hasSufficientBalance(eq(EMPLOYEE_ID), eq("ANNUAL"), any())).thenReturn(true);
        }

        @Test
        void validRequest_isPersistedAsPendingAndReturnsDto() {
            LeaveRequestDto dto = service.submit(EMPLOYEE_ID, validCreateRequest());

            assertThat(dto.status()).isEqualTo(LeaveRequestStatus.PENDING.name());
            assertThat(dto.employeeId()).isEqualTo(EMPLOYEE_ID);
            assertThat(dto.managerId()).isEqualTo(MANAGER_ID);
            verify(repository, times(1)).save(any(LeaveRequest.class));
        }

        @Test
        void computesDaysRequestedInclusiveOfBothEndpoints() {
            ArgumentCaptor<LeaveRequest> captor = ArgumentCaptor.forClass(LeaveRequest.class);

            service.submit(EMPLOYEE_ID, validCreateRequest()); // Aug 10 -> Aug 12 inclusive = 3 days

            verify(repository).save(captor.capture());
            assertThat(captor.getValue().getDaysRequested()).isEqualByComparingTo(BigDecimal.valueOf(3));
        }

        @Test
        void singleDayRequest_computesOneDay() {
            CreateLeaveRequestRequest singleDay = new CreateLeaveRequestRequest(
                    "ANNUAL", LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 10), "Doctor visit");
            ArgumentCaptor<LeaveRequest> captor = ArgumentCaptor.forClass(LeaveRequest.class);

            service.submit(EMPLOYEE_ID, singleDay);

            verify(repository).save(captor.capture());
            assertThat(captor.getValue().getDaysRequested()).isEqualByComparingTo(BigDecimal.ONE);
        }

        @Test
        void startDateAfterEndDate_throwsIllegalArgumentAndDoesNotSave() {
            CreateLeaveRequestRequest invalid = new CreateLeaveRequestRequest(
                    "ANNUAL", LocalDate.of(2026, 8, 12), LocalDate.of(2026, 8, 10), "Bad range");

            assertThatThrownBy(() -> service.submit(EMPLOYEE_ID, invalid))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void overlappingActiveRequest_throwsIllegalStateAndDoesNotSave() {
            when(repository.existsOverlapping(eq(EMPLOYEE_ID), any(), any(), anyList())).thenReturn(true);

            assertThatThrownBy(() -> service.submit(EMPLOYEE_ID, validCreateRequest()))
                    .isInstanceOf(IllegalStateException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void overlapCheck_onlyConsidersPendingAndApprovedAsBlocking() {
            service.submit(EMPLOYEE_ID, validCreateRequest());

            verify(repository).existsOverlapping(eq(EMPLOYEE_ID), any(), any(), eq(
                    List.of(LeaveRequestStatus.PENDING, LeaveRequestStatus.APPROVED)));
        }

        @Test
        void insufficientBalance_throwsIllegalArgumentAndDoesNotSave() {
            when(leaveBalanceService.hasSufficientBalance(eq(EMPLOYEE_ID), eq("ANNUAL"), any())).thenReturn(false);

            assertThatThrownBy(() -> service.submit(EMPLOYEE_ID, validCreateRequest()))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void employeeWithNoAssignedManager_throwsIllegalStateAndDoesNotSave() {
            when(managerResolver.resolveManagerId(EMPLOYEE_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.submit(EMPLOYEE_ID, validCreateRequest()))
                    .isInstanceOf(IllegalStateException.class);
            verify(repository, never()).save(any());
        }
    }

    @Nested
    class Approve {

        @Test
        void assignedManager_approvesPendingRequest() {
            LeaveRequest entity = pendingEntity();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            LeaveRequestDto dto = service.approve(entity.getId(), MANAGER_ID, new ApproveLeaveRequestRequest(null));

            assertThat(dto.status()).isEqualTo(LeaveRequestStatus.APPROVED.name());
            verify(repository).save(entity);
        }

        @Test
        void unknownRequestId_throwsEntityNotFound() {
            UUID missingId = UUID.randomUUID();
            when(repository.findById(missingId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.approve(missingId, MANAGER_ID, new ApproveLeaveRequestRequest(null)))
                    .isInstanceOf(EntityNotFoundException.class);
        }

        @Test
        void managerNotAssignedToRequest_throwsAccessDenied() {
            LeaveRequest entity = pendingEntity();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.approve(entity.getId(), OTHER_MANAGER_ID, new ApproveLeaveRequestRequest(null)))
                    .isInstanceOf(AccessDeniedException.class);
            verify(repository, never()).save(any());
            assertThat(entity.getStatus()).isEqualTo(LeaveRequestStatus.PENDING);
        }

        @Test
        void selfApproval_isForbiddenEvenIfManagerIdMatches() {
            // defense in depth: an employee must never be able to approve their own
            // leave request, regardless of what an upstream manager-lookup returns.
            LeaveRequest selfAssigned = LeaveRequest.submit(EMPLOYEE_ID, EMPLOYEE_ID, "ANNUAL",
                    LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 12), BigDecimal.valueOf(3), "Trip");
            when(repository.findById(selfAssigned.getId())).thenReturn(Optional.of(selfAssigned));

            assertThatThrownBy(() -> service.approve(selfAssigned.getId(), EMPLOYEE_ID, new ApproveLeaveRequestRequest(null)))
                    .isInstanceOf(AccessDeniedException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void alreadyApprovedRequest_throwsIllegalStateOnReapproval() {
            LeaveRequest entity = pendingEntity();
            entity.approve();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.approve(entity.getId(), MANAGER_ID, new ApproveLeaveRequestRequest(null)))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void cancelledRequest_cannotBeApproved() {
            LeaveRequest entity = pendingEntity();
            entity.cancel();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.approve(entity.getId(), MANAGER_ID, new ApproveLeaveRequestRequest(null)))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    class Reject {

        @Test
        void assignedManager_rejectsPendingRequestWithReason() {
            LeaveRequest entity = pendingEntity();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            LeaveRequestDto dto = service.reject(entity.getId(), MANAGER_ID,
                    new RejectLeaveRequestRequest("Team is short-staffed that week"));

            assertThat(dto.status()).isEqualTo(LeaveRequestStatus.REJECTED.name());
            assertThat(dto.decisionReason()).isEqualTo("Team is short-staffed that week");
            verify(repository).save(entity);
        }

        @Test
        void blankReason_throwsIllegalArgumentAndDoesNotSave() {
            LeaveRequest entity = pendingEntity();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.reject(entity.getId(), MANAGER_ID, new RejectLeaveRequestRequest("  ")))
                    .isInstanceOf(IllegalArgumentException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void managerNotAssignedToRequest_throwsAccessDenied() {
            LeaveRequest entity = pendingEntity();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.reject(entity.getId(), OTHER_MANAGER_ID,
                    new RejectLeaveRequestRequest("Not authorized")))
                    .isInstanceOf(AccessDeniedException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void nonPendingRequest_throwsIllegalState() {
            LeaveRequest entity = pendingEntity();
            entity.approve();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.reject(entity.getId(), MANAGER_ID,
                    new RejectLeaveRequestRequest("Too late")))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    class Cancel {

        @Test
        void owningEmployee_cancelsPendingRequest() {
            LeaveRequest entity = pendingEntity();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            LeaveRequestDto dto = service.cancel(entity.getId(), EMPLOYEE_ID);

            assertThat(dto.status()).isEqualTo(LeaveRequestStatus.CANCELLED.name());
            verify(repository).save(entity);
        }

        @Test
        void nonOwningEmployee_throwsAccessDenied() {
            LeaveRequest entity = pendingEntity();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.cancel(entity.getId(), 999L))
                    .isInstanceOf(AccessDeniedException.class);
            verify(repository, never()).save(any());
        }

        @Test
        void alreadyApprovedRequest_cannotBeSelfCancelled() {
            LeaveRequest entity = pendingEntity();
            entity.approve();
            when(repository.findById(entity.getId())).thenReturn(Optional.of(entity));

            assertThatThrownBy(() -> service.cancel(entity.getId(), EMPLOYEE_ID))
                    .isInstanceOf(IllegalStateException.class);
        }

        @Test
        void unknownRequestId_throwsEntityNotFound() {
            UUID missingId = UUID.randomUUID();
            when(repository.findById(missingId)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.cancel(missingId, EMPLOYEE_ID))
                    .isInstanceOf(EntityNotFoundException.class);
        }
    }

    @Nested
    class Listing {

        @Test
        void listMine_returnsOnlyRequestsOwnedByEmployee() {
            LeaveRequest entity = pendingEntity();
            when(repository.findByEmployeeIdOrderByCreatedAtDesc(EMPLOYEE_ID)).thenReturn(List.of(entity));

            List<LeaveRequestDto> dtos = service.listMine(EMPLOYEE_ID);

            assertThat(dtos).hasSize(1);
            assertThat(dtos.get(0).employeeId()).isEqualTo(EMPLOYEE_ID);
        }

        @Test
        void listPendingApprovals_onlyQueriesPendingStatusForThatManager() {
            when(repository.findByManagerIdAndStatusOrderByCreatedAtAsc(MANAGER_ID, LeaveRequestStatus.PENDING))
                    .thenReturn(List.of(pendingEntity()));

            List<LeaveRequestDto> dtos = service.listPendingApprovals(MANAGER_ID);

            assertThat(dtos).hasSize(1);
            verify(repository).findByManagerIdAndStatusOrderByCreatedAtAsc(MANAGER_ID, LeaveRequestStatus.PENDING);
        }

        @Test
        void listPendingApprovals_forManagerWithNoDirectReportsPending_returnsEmptyList() {
            when(repository.findByManagerIdAndStatusOrderByCreatedAtAsc(OTHER_MANAGER_ID, LeaveRequestStatus.PENDING))
                    .thenReturn(List.of());

            assertThat(service.listPendingApprovals(OTHER_MANAGER_ID)).isEmpty();
        }
    }
}
