package com.hrsystem.audit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Access-control contract for the audit log API per the RBAC table in
 * Security Architecture §3: only the System/Audit Reviewer role may read
 * audit logs; Employee and Manager roles must be rejected even though they
 * are authenticated.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AuditLogControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuditLogService auditLogService;

    private AuditLogEntry sampleEntry() {
        AuditLogEntry entry = new AuditLogEntry();
        entry.setId(1L);
        entry.setActorEmail("hr.admin@example.com");
        entry.setAction("EMPLOYEE_TRANSFER");
        entry.setEntityType("EMPLOYEE");
        entry.setEntityId("1042");
        entry.setOutcome(AuditOutcome.SUCCESS);
        entry.setTimestamp(Instant.parse("2026-07-01T12:00:00Z"));
        return entry;
    }

    @Test
    @WithMockUser(username = "auditor@example.com", roles = "AUDIT_REVIEWER")
    void getAuditLogs_asAuditReviewer_returnsOk() throws Exception {
        when(auditLogService.findAll(any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleEntry())));

        mockMvc.perform(get("/api/audit-logs").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].actorEmail").value("hr.admin@example.com"))
                .andExpect(jsonPath("$.content[0].action").value("EMPLOYEE_TRANSFER"))
                .andExpect(jsonPath("$.content[0].outcome").value("SUCCESS"));
    }

    @Test
    @WithMockUser(username = "employee.a@example.com", roles = "EMPLOYEE")
    void getAuditLogs_asEmployee_forbidden() throws Exception {
        mockMvc.perform(get("/api/audit-logs").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "manager.b@example.com", roles = "MANAGER")
    void getAuditLogs_asManager_forbidden() throws Exception {
        mockMvc.perform(get("/api/audit-logs").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAuditLogs_unauthenticated_unauthorized() throws Exception {
        mockMvc.perform(get("/api/audit-logs").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "auditor@example.com", roles = "AUDIT_REVIEWER")
    void auditLogEndpoint_isReadOnly_writeVerbsRejected() throws Exception {
        mockMvc.perform(post("/api/audit-logs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isMethodNotAllowed());

        mockMvc.perform(delete("/api/audit-logs/1"))
                .andExpect(status().isMethodNotAllowed());
    }

    @Test
    @WithMockUser(username = "auditor@example.com", roles = "AUDIT_REVIEWER")
    void getAuditLogs_supportsFilteringByActorAndAction() throws Exception {
        when(auditLogService.findAll(any(), any()))
                .thenReturn(new PageImpl<>(List.of(sampleEntry())));

        mockMvc.perform(get("/api/audit-logs")
                        .param("actorEmail", "hr.admin@example.com")
                        .param("action", "EMPLOYEE_TRANSFER")
                        .param("page", "0")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray());
    }
}
