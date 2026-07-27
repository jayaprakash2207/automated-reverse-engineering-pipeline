package com.hrsystem.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end trail: log in (per UC-01's email-only session issuance),
 * perform a state-changing action, confirm the resulting audit entry
 * reflects the identity actually used to authenticate the request (not a
 * client-forgeable field), then confirm read access follows the RBAC model.
 */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class AuditTrailEndToEndIT {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void submittingLeaveRequest_producesAuditEntry_visibleOnlyToAuditReviewer() throws Exception {
        String loginBody = objectMapper.writeValueAsString(
                new LoginRequestFixture("employee.a@example.com", "any-password-value"));

        String sessionToken = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        String leaveRequestBody = objectMapper.writeValueAsString(
                new LeaveRequestFixture("2026-08-10", "2026-08-12", "VACATION"));

        mockMvc.perform(post("/api/leave-requests")
                        .header("Authorization", "Bearer " + extractToken(sessionToken))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(leaveRequestBody))
                .andExpect(status().isCreated());

        // Employee cannot read the audit trail of their own action.
        mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + extractToken(sessionToken))
                        .param("action", "LEAVE_REQUEST_SUBMIT"))
                .andExpect(status().isForbidden());

        String auditorToken = extractToken(mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequestFixture("auditor@example.com", "any-password-value"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString());

        mockMvc.perform(get("/api/audit-logs")
                        .header("Authorization", "Bearer " + auditorToken)
                        .param("action", "LEAVE_REQUEST_SUBMIT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].actorEmail").value("employee.a@example.com"))
                .andExpect(jsonPath("$.content[0].action").value("LEAVE_REQUEST_SUBMIT"))
                .andExpect(jsonPath("$.content[0].outcome").value("SUCCESS"));
    }

    private String extractToken(String loginResponseJson) throws Exception {
        return objectMapper.readTree(loginResponseJson).get("token").asText();
    }

    private record LoginRequestFixture(String email, String password) {}

    private record LeaveRequestFixture(String startDate, String endDate, String leaveType) {}
}
