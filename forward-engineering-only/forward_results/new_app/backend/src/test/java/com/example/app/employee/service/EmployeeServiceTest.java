package com.example.app.employee.service;

import com.example.app.audit.domain.AuditEntry;
import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.service.AuditService;
import com.example.app.common.exception.BusinessRuleException;
import com.example.app.common.exception.ConflictException;
import com.example.app.common.exception.NotFoundException;
import com.example.app.common.exception.ValidationException;
import com.example.app.employee.domain.ChangeType;
import com.example.app.employee.domain.Employee;
import com.example.app.employee.domain.EmployeeHistory;
import com.example.app.employee.domain.EmployeeStatus;
import com.example.app.employee.dto.CreateEmployeeRequest;
import com.example.app.employee.dto.EmployeeDto;
import com.example.app.employee.dto.UpdateEmployeeRequest;
import com.example.app.employee.dto.UpdateEmployeeResponse;
import com.example.app.employee.repository.EmployeeHistoryRepository;
import com.example.app.employee.repository.EmployeeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeServiceTest {

    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private EmployeeHistoryRepository employeeHistoryRepository;
    @Mock
    private HireDatePolicy hireDatePolicy;
    @Mock
    private AuditService auditService;

    private EmployeeService employeeService;

    @BeforeEach
    void setUp() {
        employeeService = new EmployeeService(employeeRepository, employeeHistoryRepository, hireDatePolicy, auditService);
    }

    private Employee activeEmployee() {
        Employee employee = new Employee();
        employee.setId(1L);
        employee.setFirstName("Jane");
        employee.setLastName("Doe");
        employee.setEmail("jane.doe@example.com");
        employee.setHireDate(LocalDate.of(2024, 1, 10));
        employee.setDepartment("Engineering");
        employee.setJobRole("Engineer II");
        employee.setStatus(EmployeeStatus.ACTIVE);
        return employee;
    }

    @Test
    void should_createEmployee_when_hireRequestHasAUniqueEmail() {
        CreateEmployeeRequest request = new CreateEmployeeRequest(
            "Jane", "Doe", "Jane.Doe@Example.com", LocalDate.of(2024, 1, 10), "Engineering", "Engineer II", null, null);
        when(employeeRepository.existsByEmail("jane.doe@example.com")).thenReturn(false);
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> {
            Employee saved = invocation.getArgument(0);
            saved.setId(1L);
            return saved;
        });
        when(hireDatePolicy.calculateEligibilityDate(any())).thenReturn(LocalDate.of(2024, 4, 9));
        when(employeeHistoryRepository.save(any(EmployeeHistory.class))).thenAnswer(invocation -> {
            EmployeeHistory saved = invocation.getArgument(0);
            saved.setId(100L);
            return saved;
        });

        EmployeeDto result = employeeService.hire(request);

        assertThat(result.email()).isEqualTo("jane.doe@example.com");
        assertThat(result.status()).isEqualTo(EmployeeStatus.ACTIVE);

        ArgumentCaptor<EmployeeHistory> historyCaptor = ArgumentCaptor.forClass(EmployeeHistory.class);
        verify(employeeHistoryRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getChangeType()).isEqualTo(ChangeType.HIRE);

        verify(auditService).logAction(eq("EMPLOYEE"), eq("1"), eq("HIRE"), anyString(), eq(AuditOutcome.SUCCESS), anyString());
    }

    @Test
    void should_throwConflict_when_hiringWithAnEmailThatAlreadyExists() {
        CreateEmployeeRequest request = new CreateEmployeeRequest(
            "Jane", "Doe", "jane.doe@example.com", LocalDate.of(2024, 1, 10), "Engineering", "Engineer II", null, null);
        when(employeeRepository.existsByEmail("jane.doe@example.com")).thenReturn(true);

        assertThatThrownBy(() -> employeeService.hire(request)).isInstanceOf(ConflictException.class);

        verify(employeeRepository, never()).save(any());
        verify(auditService, never()).logAction(any(), any(), any(), any(), any(), any());
    }

    @Test
    void should_throwNotFound_when_gettingAnUnknownEmployee() {
        when(employeeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> employeeService.getById(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void should_throwValidation_when_updateProfileRequestHasNoFields() {
        UpdateEmployeeRequest request = new UpdateEmployeeRequest(null, null, null);

        assertThatThrownBy(() -> employeeService.updateProfile(1L, request)).isInstanceOf(ValidationException.class);

        verify(employeeRepository, never()).findById(any());
    }

    @Test
    void should_writeATransferHistoryEntry_when_departmentChanges() {
        Employee employee = activeEmployee();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(employeeHistoryRepository.save(any(EmployeeHistory.class))).thenAnswer(invocation -> {
            EmployeeHistory saved = invocation.getArgument(0);
            saved.setId(200L);
            return saved;
        });

        UpdateEmployeeResponse response = employeeService.updateProfile(1L, new UpdateEmployeeRequest("Sales", null, null));

        assertThat(response.employee().department()).isEqualTo("Sales");
        assertThat(response.historyEntryIds()).containsExactly(200L);

        ArgumentCaptor<EmployeeHistory> historyCaptor = ArgumentCaptor.forClass(EmployeeHistory.class);
        verify(employeeHistoryRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getChangeType()).isEqualTo(ChangeType.TRANSFER);
        assertThat(historyCaptor.getValue().getOldValue()).isEqualTo("Engineering");
        assertThat(historyCaptor.getValue().getNewValue()).isEqualTo("Sales");

        verify(auditService).logAction(eq("EMPLOYEE"), eq("1"), eq("UPDATE_PROFILE"), anyString(), eq(AuditOutcome.SUCCESS), anyString());
    }

    @Test
    void should_writeTwoHistoryEntries_when_departmentAndJobRoleBothChangeInOnePatch() {
        Employee employee = activeEmployee();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(employeeHistoryRepository.save(any(EmployeeHistory.class))).thenAnswer(invocation -> {
            EmployeeHistory saved = invocation.getArgument(0);
            saved.setId((long) (100 + saved.getChangeType().ordinal()));
            return saved;
        });

        UpdateEmployeeResponse response =
            employeeService.updateProfile(1L, new UpdateEmployeeRequest("Sales", "Senior Engineer", null));

        assertThat(response.historyEntryIds()).hasSize(2);
        verify(employeeHistoryRepository, times(2)).save(any(EmployeeHistory.class));
        verify(auditService, times(1)).logAction(eq("EMPLOYEE"), eq("1"), eq("UPDATE_PROFILE"), anyString(), eq(AuditOutcome.SUCCESS), anyString());
    }

    @Test
    void should_notWriteAnAuditEntry_when_updateProfileRequestChangesNothing() {
        Employee employee = activeEmployee();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));

        employeeService.updateProfile(1L, new UpdateEmployeeRequest("Engineering", null, null));

        verify(employeeHistoryRepository, never()).save(any());
        verify(auditService, never()).logAction(any(), any(), any(), any(), any(), any());
    }

    @Test
    void should_throwBusinessRuleException_when_updatingATerminatedEmployee() {
        Employee employee = activeEmployee();
        employee.setStatus(EmployeeStatus.TERMINATED);
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> employeeService.updateProfile(1L, new UpdateEmployeeRequest("Sales", null, null)))
            .isInstanceOf(BusinessRuleException.class);

        verify(employeeRepository, never()).save(any());
    }

    @Test
    void should_terminateAnActiveEmployee_and_writeATerminationHistoryEntry() {
        Employee employee = activeEmployee();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(employeeHistoryRepository.save(any(EmployeeHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeDto result = employeeService.terminate(1L);

        assertThat(result.status()).isEqualTo(EmployeeStatus.TERMINATED);
        ArgumentCaptor<EmployeeHistory> historyCaptor = ArgumentCaptor.forClass(EmployeeHistory.class);
        verify(employeeHistoryRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getChangeType()).isEqualTo(ChangeType.TERMINATION);

        verify(auditService).logAction(eq("EMPLOYEE"), eq("1"), eq("TERMINATE"), anyString(), eq(AuditOutcome.SUCCESS), anyString());
    }

    @Test
    void should_throwBusinessRuleException_when_terminatingAnAlreadyTerminatedEmployee() {
        Employee employee = activeEmployee();
        employee.setStatus(EmployeeStatus.TERMINATED);
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> employeeService.terminate(1L)).isInstanceOf(BusinessRuleException.class);

        verify(employeeRepository, never()).save(any());
        verify(auditService, never()).logAction(any(), any(), any(), any(), any(), any());
    }

    @Test
    void should_rehireATerminatedEmployee_and_writeARehireHistoryEntry() {
        Employee employee = activeEmployee();
        employee.setStatus(EmployeeStatus.TERMINATED);
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(employeeHistoryRepository.save(any(EmployeeHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        EmployeeDto result = employeeService.rehire(1L);

        assertThat(result.status()).isEqualTo(EmployeeStatus.ACTIVE);
        ArgumentCaptor<EmployeeHistory> historyCaptor = ArgumentCaptor.forClass(EmployeeHistory.class);
        verify(employeeHistoryRepository).save(historyCaptor.capture());
        assertThat(historyCaptor.getValue().getChangeType()).isEqualTo(ChangeType.REHIRE);

        verify(auditService).logAction(eq("EMPLOYEE"), eq("1"), eq("REHIRE"), anyString(), eq(AuditOutcome.SUCCESS), anyString());
    }

    @Test
    void should_throwBusinessRuleException_when_rehiringAnEmployeeThatIsNotTerminated() {
        Employee employee = activeEmployee();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));

        assertThatThrownBy(() -> employeeService.rehire(1L)).isInstanceOf(BusinessRuleException.class);

        verify(employeeRepository, never()).save(any());
        verify(auditService, never()).logAction(any(), any(), any(), any(), any(), any());
    }

    @Test
    void should_propagateAuditWriteFailedException_when_auditServiceLogActionFails_regressionForDISC006() {
        com.example.app.common.exception.AuditWriteFailedException auditFailure =
            new com.example.app.common.exception.AuditWriteFailedException("write failed", new RuntimeException("constraint violation"));
        Employee employee = activeEmployee();
        when(employeeRepository.findById(1L)).thenReturn(Optional.of(employee));
        when(employeeRepository.save(any(Employee.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(employeeHistoryRepository.save(any(EmployeeHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));
        org.mockito.Mockito.doThrow(auditFailure)
            .when(auditService).logAction(any(), any(), any(), any(), any(), any());

        assertThatThrownBy(() -> employeeService.terminate(1L))
            .isInstanceOf(com.example.app.common.exception.AuditWriteFailedException.class);
    }
}
