package com.hrsystem.audit;

import com.hrsystem.employee.EmployeeLifecycleService;
import com.hrsystem.employee.TransferRequest;
import com.hrsystem.leave.LeaveRequestService;
import org.aspectj.lang.ProceedingJoinPoint;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Verifies audit writes are enforced at the service layer via {@link Auditable}
 * interception, per Security Architecture §3 — not merely gated by UI screen
 * visibility, since a UI-only gate would leave the API reachable without a trail.
 */
@ExtendWith(MockitoExtension.class)
class AuditLogAspectTest {

    @Mock
    private AuditLogService auditLogService;

    @Mock
    private ProceedingJoinPoint joinPoint;

    @Mock
    private Authentication authentication;

    private AuditLogAspect aspect;

    @BeforeEach
    void setUp() {
        aspect = new AuditLogAspect(auditLogService);

        SecurityContext securityContext = mock(SecurityContext.class);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getName()).thenReturn("hr.admin@example.com");
        SecurityContextHolder.setContext(securityContext);
    }

    @Test
    void aroundAuditable_successfulInvocation_recordsSuccessOutcome() throws Throwable {
        Auditable annotation = mock(Auditable.class);
        when(annotation.action()).thenReturn("EMPLOYEE_TRANSFER");
        when(annotation.entityType()).thenReturn("EMPLOYEE");
        when(joinPoint.proceed()).thenReturn("ok");
        when(joinPoint.getArgs()).thenReturn(new Object[] { new TransferRequest("1042", "DEPT-9") });

        Object result = aspect.aroundAuditable(joinPoint, annotation);

        assertThat(result).isEqualTo("ok");

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditLogService).recordAction(captor.capture());
        assertThat(captor.getValue().action()).isEqualTo("EMPLOYEE_TRANSFER");
        assertThat(captor.getValue().outcome()).isEqualTo(AuditOutcome.SUCCESS);
        assertThat(captor.getValue().actorEmail()).isEqualTo("hr.admin@example.com");
        assertThat(captor.getValue().entityId()).isEqualTo("1042");
    }

    @Test
    void aroundAuditable_businessMethodThrows_recordsFailureOutcomeThenRethrows() throws Throwable {
        Auditable annotation = mock(Auditable.class);
        when(annotation.action()).thenReturn("EMPLOYEE_TERMINATE");
        when(annotation.entityType()).thenReturn("EMPLOYEE");
        RuntimeException businessFailure = new IllegalStateException("trigger violation");
        when(joinPoint.proceed()).thenThrow(businessFailure);
        when(joinPoint.getArgs()).thenReturn(new Object[] { new TransferRequest("1042", null) });

        assertThatThrownBy(() -> aspect.aroundAuditable(joinPoint, annotation))
                .isSameAs(businessFailure);

        ArgumentCaptor<AuditEvent> captor = ArgumentCaptor.forClass(AuditEvent.class);
        verify(auditLogService).recordAction(captor.capture());
        assertThat(captor.getValue().outcome()).isEqualTo(AuditOutcome.FAILURE);
    }

    @Test
    void aroundAuditable_auditWriteFails_propagatesAuditFailureInsteadOfSwallowingIt() throws Throwable {
        Auditable annotation = mock(Auditable.class);
        when(annotation.action()).thenReturn("LEAVE_REQUEST_SUBMIT");
        when(annotation.entityType()).thenReturn("LEAVE_REQUEST");
        when(joinPoint.proceed()).thenReturn("ok");
        when(joinPoint.getArgs()).thenReturn(new Object[] {});
        doThrow(new RuntimeException("audit sink unavailable"))
                .when(auditLogService).recordAction(any(AuditEvent.class));

        // Fail-closed per NFR-R2 / DISC-006: if the audit write itself fails,
        // the aspect must not swallow that failure and let the business
        // action appear to have succeeded.
        assertThatThrownBy(() -> aspect.aroundAuditable(joinPoint, annotation))
                .hasMessageContaining("audit sink unavailable");
    }

    @Test
    void servicesRequiringAuditCoverage_declareAuditableOnAllLifecycleAndLeaveMutations() throws NoSuchMethodException {
        assertThat(EmployeeLifecycleService.class
                .getMethod("transferEmployee", TransferRequest.class)
                .isAnnotationPresent(Auditable.class)).isTrue();
        assertThat(EmployeeLifecycleService.class
                .getMethod("promoteEmployee", TransferRequest.class)
                .isAnnotationPresent(Auditable.class)).isTrue();
        assertThat(EmployeeLifecycleService.class
                .getMethod("terminateEmployee", String.class)
                .isAnnotationPresent(Auditable.class)).isTrue();
        assertThat(EmployeeLifecycleService.class
                .getMethod("rehireEmployee", String.class)
                .isAnnotationPresent(Auditable.class)).isTrue();
        assertThat(LeaveRequestService.class
                .getMethod("submitLeaveRequest", com.hrsystem.leave.LeaveRequest.class)
                .isAnnotationPresent(Auditable.class)).isTrue();
        assertThat(LeaveRequestService.class
                .getMethod("cancelLeaveRequest", String.class)
                .isAnnotationPresent(Auditable.class)).isTrue();
    }
}
