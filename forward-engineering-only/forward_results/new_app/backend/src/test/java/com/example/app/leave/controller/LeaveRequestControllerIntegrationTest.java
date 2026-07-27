package com.example.app.leave.controller;

import com.example.app.leave.domain.LeaveRequest;
import com.example.app.leave.repository.LeaveRequestRepository;
import com.example.app.leave.service.ManagerResolver;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end HTTP tests for the leave-request API surface, exercising UC-03 (submit)
 * and UC-04 (manager approve/reject -- the previously-missing capability) through
 * real Spring MVC dispatch + method security.
 *
 * Uses an in-memory H2 database (Postgres compatibility mode) instead of Testcontainers.
 * Prior sprints in this program hit unresolved "[WinError 2] The system cannot find the
 * file specified" failures attributed to environment/Docker availability, not code
 * defects; H2 avoids depending on a Docker daemon being reachable in this environment
 * while still exercising the real repository/JPA/controller wiring.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestPropertySource(properties = {
        "spring.datasource.url=jdbc:h2:mem:leave_requests_it;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.flyway.enabled=false"
})
class LeaveRequestControllerIntegrationTest {

    private static final Long EMPLOYEE_ID = 100L;
    private static final Long MANAGER_ID = 900L;
    private static final Long OTHER_EMPLOYEE_ID = 200L;
    private static final Long OTHER_MANAGER_ID = 901L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private LeaveRequestRepository repository;

    @MockBean
    private ManagerResolver managerResolver;

    @BeforeEach
    void setUp() {
        repository.deleteAll();
        org.mockito.Mockito.lenient().when(managerResolver.resolveManagerId(EMPLOYEE_ID)).thenReturn(Optional.of(MANAGER_ID));
        org.mockito.Mockito.lenient().when(managerResolver.resolveManagerId(OTHER_EMPLOYEE_ID)).thenReturn(Optional.of(OTHER_MANAGER_ID));
    }

    private LeaveRequest persistPendingRequestFor(Long employeeId, Long managerId) {
        LeaveRequest entity = LeaveRequest.submit(employeeId, managerId, "ANNUAL",
                LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 12), BigDecimal.valueOf(3), "Family trip");
        return repository.save(entity);
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void submit_validRequest_returns201WithEnvelope() throws Exception {
        Map<String, Object> body = Map.of(
                "leaveType", "ANNUAL",
                "startDate", "2026-08-10",
                "endDate", "2026-08-12",
                "reason", "Family trip");

        mockMvc.perform(post("/api/v1/leave-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.leaveRequest.status").value("PENDING"))
                .andExpect(jsonPath("$.data.leaveRequest.employeeId").value(100))
                .andExpect(jsonPath("$.data.leaveRequest.daysRequested").value(3))
                .andExpect(jsonPath("$.meta.timestamp").exists())
                .andExpect(jsonPath("$.meta.sourceConfidence").value("MEDIUM"));
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void submit_startDateAfterEndDate_returns400WithFieldErrors() throws Exception {
        Map<String, Object> body = Map.of(
                "leaveType", "ANNUAL",
                "startDate", "2026-08-12",
                "endDate", "2026-08-10",
                "reason", "Bad range");

        mockMvc.perform(post("/api/v1/leave-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").exists())
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void submit_blankLeaveType_returns400() throws Exception {
        Map<String, Object> body = Map.of(
                "leaveType", "",
                "startDate", "2026-08-10",
                "endDate", "2026-08-12",
                "reason", "Trip");

        mockMvc.perform(post("/api/v1/leave-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void submit_unauthenticated_returns401() throws Exception {
        Map<String, Object> body = Map.of(
                "leaveType", "ANNUAL",
                "startDate", "2026-08-10",
                "endDate", "2026-08-12",
                "reason", "Family trip");

        mockMvc.perform(post("/api/v1/leave-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(body)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void mine_returnsOnlyOwnRequests() throws Exception {
        persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);
        persistPendingRequestFor(OTHER_EMPLOYEE_ID, OTHER_MANAGER_ID);

        mockMvc.perform(get("/api/v1/leave-requests/mine"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].employeeId").value(100));
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void pendingApprovals_forNonManager_returns403() throws Exception {
        mockMvc.perform(get("/api/v1/leave-requests/pending-approvals"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "900", roles = {"MANAGER"})
    void pendingApprovals_forManager_returnsOnlyTheirDirectReportsPendingRequests() throws Exception {
        persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);
        persistPendingRequestFor(OTHER_EMPLOYEE_ID, OTHER_MANAGER_ID);

        mockMvc.perform(get("/api/v1/leave-requests/pending-approvals"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].employeeId").value(100))
                .andExpect(jsonPath("$.data[0].managerId").value(900));
    }

    @Test
    @WithMockUser(username = "900", roles = {"MANAGER"})
    void approve_byAssignedManager_returns200AndTransitionsToApproved() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.leaveRequest.status").value("APPROVED"))
                .andExpect(jsonPath("$.meta.sourceConfidence").value("HIGH"));
    }

    @Test
    @WithMockUser(username = "901", roles = {"MANAGER"})
    void approve_byManagerNotAssignedToRequest_returns403() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "900", roles = {"MANAGER"})
    void approve_alreadyApprovedRequest_returns409() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void approve_byPlainEmployeeRole_returns403() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "900", roles = {"MANAGER"})
    void reject_byAssignedManagerWithReason_returns200AndTransitionsToRejected() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/reject", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", "Coverage conflict"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.leaveRequest.status").value("REJECTED"))
                .andExpect(jsonPath("$.data.leaveRequest.decisionReason").value("Coverage conflict"));
    }

    @Test
    @WithMockUser(username = "900", roles = {"MANAGER"})
    void reject_withoutReason_returns400() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/reject", saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("reason", ""))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void cancel_byOwningEmployeeWhilePending_returns200() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/cancel", saved.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.leaveRequest.status").value("CANCELLED"));
    }

    @Test
    @WithMockUser(username = "200", roles = {"EMPLOYEE"})
    void cancel_byNonOwningEmployee_returns403() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/cancel", saved.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void cancel_afterAlreadyApproved_returns409() throws Exception {
        LeaveRequest saved = persistPendingRequestFor(EMPLOYEE_ID, MANAGER_ID);
        saved.approve();
        repository.save(saved);

        mockMvc.perform(post("/api/v1/leave-requests/{id}/cancel", saved.getId()))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(username = "100", roles = {"EMPLOYEE"})
    void approve_unknownRequestId_returns404() throws Exception {
        mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden()); // EMPLOYEE role blocked before lookup

        // repeat as a manager to isolate the not-found path from the role check
    }

    @Test
    @WithMockUser(username = "900", roles = {"MANAGER"})
    void approve_unknownRequestId_asManager_returns404() throws Exception {
        mockMvc.perform(post("/api/v1/leave-requests/{id}/approve", UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isNotFound());
    }
}
