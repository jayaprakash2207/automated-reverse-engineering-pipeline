package com.example.app.leave.domain;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Domain-level unit tests for {@link LeaveRequest}. These pin down the state-machine
 * invariants (PENDING -> APPROVED/REJECTED/CANCELLED, no transitions out of a terminal
 * state) that UC-04 (manager approve/reject) and UC-03 (submit/cancel) depend on.
 */
class LeaveRequestTest {

    private LeaveRequest pendingRequest() {
        return LeaveRequest.submit(
                100L,
                900L,
                "ANNUAL",
                LocalDate.of(2026, 8, 10),
                LocalDate.of(2026, 8, 12),
                BigDecimal.valueOf(3),
                "Family trip");
    }

    @Test
    void submit_createsRequestInPendingStatus() {
        LeaveRequest request = pendingRequest();

        assertThat(request.getId()).isNotNull();
        assertThat(request.getEmployeeId()).isEqualTo(100L);
        assertThat(request.getManagerId()).isEqualTo(900L);
        assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.PENDING);
        assertThat(request.isPending()).isTrue();
        assertThat(request.getCreatedAt()).isNotNull();
        assertThat(request.getDecidedAt()).isNull();
    }

    @Nested
    class Approve {

        @Test
        void fromPending_transitionsToApprovedAndStampsDecidedAt() {
            LeaveRequest request = pendingRequest();

            request.approve();

            assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.APPROVED);
            assertThat(request.isPending()).isFalse();
            assertThat(request.getDecidedAt()).isNotNull();
        }

        @Test
        void whenAlreadyApproved_throwsIllegalState() {
            LeaveRequest request = pendingRequest();
            request.approve();

            assertThatThrownBy(request::approve).isInstanceOf(IllegalStateException.class);
        }

        @Test
        void whenCancelled_throwsIllegalState() {
            LeaveRequest request = pendingRequest();
            request.cancel();

            assertThatThrownBy(request::approve).isInstanceOf(IllegalStateException.class);
        }

        @Test
        void whenRejected_throwsIllegalState() {
            LeaveRequest request = pendingRequest();
            request.reject("Team is short-staffed that week");

            assertThatThrownBy(request::approve).isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    class Reject {

        @Test
        void fromPending_transitionsToRejectedAndRecordsReason() {
            LeaveRequest request = pendingRequest();

            request.reject("Team is short-staffed that week");

            assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.REJECTED);
            assertThat(request.getDecisionReason()).isEqualTo("Team is short-staffed that week");
            assertThat(request.getDecidedAt()).isNotNull();
        }

        @Test
        void blankReason_throwsIllegalArgument() {
            LeaveRequest request = pendingRequest();

            assertThatThrownBy(() -> request.reject("   "))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void nullReason_throwsIllegalArgument() {
            LeaveRequest request = pendingRequest();

            assertThatThrownBy(() -> request.reject(null))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void blankReason_doesNotMutateState() {
            LeaveRequest request = pendingRequest();

            assertThatThrownBy(() -> request.reject("")).isInstanceOf(IllegalArgumentException.class);

            assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.PENDING);
        }

        @Test
        void whenNotPending_throwsIllegalStateEvenWithValidReason() {
            LeaveRequest request = pendingRequest();
            request.approve();

            assertThatThrownBy(() -> request.reject("Valid reason"))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Nested
    class Cancel {

        @Test
        void fromPending_transitionsToCancelled() {
            LeaveRequest request = pendingRequest();

            request.cancel();

            assertThat(request.getStatus()).isEqualTo(LeaveRequestStatus.CANCELLED);
            assertThat(request.getDecidedAt()).isNotNull();
        }

        @Test
        void whenAlreadyApproved_throwsIllegalState() {
            LeaveRequest request = pendingRequest();
            request.approve();

            assertThatThrownBy(request::cancel).isInstanceOf(IllegalStateException.class);
        }

        @Test
        void whenAlreadyRejected_throwsIllegalState() {
            LeaveRequest request = pendingRequest();
            request.reject("Not enough coverage");

            assertThatThrownBy(request::cancel).isInstanceOf(IllegalStateException.class);
        }

        @Test
        void whenAlreadyCancelled_throwsIllegalState() {
            LeaveRequest request = pendingRequest();
            request.cancel();

            assertThatThrownBy(request::cancel).isInstanceOf(IllegalStateException.class);
        }
    }
}
