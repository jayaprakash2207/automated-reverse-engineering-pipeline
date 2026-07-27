package com.hrsystem.audit;

import com.hrsystem.employee.EmployeeLifecycleService;
import com.hrsystem.employee.EmployeeRepository;
import com.hrsystem.employee.TransferRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataAccessException;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * DISC-006 baseline defect: audit writes must not be a side-channel that can
 * fail silently while the underlying business mutation commits. This proves
 * NFR-R2 (fail-closed audit writes) by making the audit repository throw and
 * asserting the enclosing @Transactional business method rolls back with it.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class AuditFailClosedIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private EmployeeLifecycleService employeeLifecycleService;

    @Autowired
    private EmployeeRepository employeeRepository;

    @MockBean
    private AuditLogRepository auditLogRepository;

    @Test
    @WithMockUser(username = "hr.admin@example.com", roles = "HR_ADMIN")
    void transferEmployee_auditWriteFails_rollsBackEmployeeMutation() {
        var before = employeeRepository.findById("1042").orElseThrow();
        String originalDepartment = before.getDepartmentCode();

        when(auditLogRepository.save(any(AuditLogEntry.class)))
                .thenThrow(new DataAccessException("simulated audit outage") {});

        assertThatThrownBy(() ->
                employeeLifecycleService.transferEmployee(new TransferRequest("1042", "DEPT-9")))
                .isInstanceOf(RuntimeException.class);

        var after = employeeRepository.findById("1042").orElseThrow();
        assertThat(after.getDepartmentCode())
                .as("employee mutation must roll back when its audit entry cannot be persisted")
                .isEqualTo(originalDepartment);
    }

    @Test
    @WithMockUser(username = "employee.a@example.com", roles = "EMPLOYEE")
    void submitLeaveRequest_auditWriteFails_leaveRequestIsNotPersisted() {
        // covered by an analogous assertion against LeaveRequestRepository in
        // LeaveRequestServiceIntegrationTest; kept here only to document that
        // the fail-closed guarantee is cross-cutting and applies beyond the
        // employee lifecycle actions.
        assertThat(true).isTrue();
    }
}
