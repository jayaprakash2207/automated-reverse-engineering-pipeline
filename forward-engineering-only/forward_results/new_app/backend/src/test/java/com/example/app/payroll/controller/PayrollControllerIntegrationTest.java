package com.example.app.payroll.controller;

// Full-stack integration test against a real Postgres container (per the Oracle->Postgres
// migration), exercising Spring Security role enforcement end to end. Role names
// (PAYROLL_ADMIN / EMPLOYEE) and HTTP status mapping (404 not found, 409 business-rule
// conflict, 400 validation) are inferred from cross-sprint conventions — adjust if the
// real GlobalExceptionHandler/security config differs.

import com.example.app.payroll.domain.PayPeriod;
import com.example.app.payroll.repository.PayPeriodRepository;
import com.example.app.payroll.repository.PayrollRunRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithAnonymousUser;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class PayrollControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private PayPeriodRepository payPeriodRepository;

    @Autowired
    private PayrollRunRepository payrollRunRepository;

    private PayPeriod closedPeriod;
    private PayPeriod openPeriod;

    private record CreatePayrollRunRequestFixture(Long payPeriodId) {
    }

    @BeforeEach
    void setUp() {
        payrollRunRepository.deleteAll();
        payPeriodRepository.deleteAll();

        closedPeriod = new PayPeriod();
        closedPeriod.setStartDate(LocalDate.of(2026, 6, 1));
        closedPeriod.setEndDate(LocalDate.of(2026, 6, 15));
        closedPeriod.setPayDate(LocalDate.of(2026, 6, 20));
        closedPeriod.setStatus(PayPeriod.Status.CLOSED);
        closedPeriod = payPeriodRepository.save(closedPeriod);

        openPeriod = new PayPeriod();
        openPeriod.setStartDate(LocalDate.of(2026, 7, 1));
        openPeriod.setEndDate(LocalDate.of(2026, 7, 15));
        openPeriod.setPayDate(LocalDate.of(2026, 7, 20));
        openPeriod.setStatus(PayPeriod.Status.OPEN);
        openPeriod = payPeriodRepository.save(openPeriod);
    }

    @AfterEach
    void tearDown() {
        payrollRunRepository.deleteAll();
        payPeriodRepository.deleteAll();
    }

    @Test
    void listPayPeriods_withoutAuthentication_isRejected() throws Exception {
        mockMvc.perform(get("/api/v1/pay-periods"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithAnonymousUser
    void createPayrollRun_withoutAuthentication_isRejected() throws Exception {
        String body = objectMapper.writeValueAsString(new CreatePayrollRunRequestFixture(closedPeriod.getId()));

        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void createPayrollRun_asEmployee_isForbidden() throws Exception {
        String body = objectMapper.writeValueAsString(new CreatePayrollRunRequestFixture(closedPeriod.getId()));

        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "PAYROLL_ADMIN")
    void createPayrollRun_asPayrollAdmin_isAllowed() throws Exception {
        String body = objectMapper.writeValueAsString(new CreatePayrollRunRequestFixture(closedPeriod.getId()));

        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.payPeriodId").value(closedPeriod.getId()))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockUser(roles = "PAYROLL_ADMIN")
    void createPayrollRun_forOpenPayPeriod_isRejected() throws Exception {
        String body = objectMapper.writeValueAsString(new CreatePayrollRunRequestFixture(openPeriod.getId()));

        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").exists())
                .andExpect(jsonPath("$.traceId").exists());
    }

    @Test
    @WithMockUser(roles = "PAYROLL_ADMIN")
    void createPayrollRun_forUnknownPayPeriod_returnsNotFound() throws Exception {
        String body = objectMapper.writeValueAsString(new CreatePayrollRunRequestFixture(999999L));

        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "PAYROLL_ADMIN")
    void createPayrollRun_missingPayPeriodId_returnsValidationError() throws Exception {
        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errorCode").exists());
    }

    @Test
    @WithMockUser(roles = "PAYROLL_ADMIN")
    void createPayrollRun_whileActiveRunExists_returnsConflict() throws Exception {
        String body = objectMapper.writeValueAsString(new CreatePayrollRunRequestFixture(closedPeriod.getId()));

        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/api/v1/payroll-runs")
                        .contentType("application/json")
                        .content(body))
                .andExpect(status().isConflict());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void getPayrollRun_forUnknownId_returnsNotFound() throws Exception {
        mockMvc.perform(get("/api/v1/payroll-runs/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void listPayPeriods_asAuthenticatedEmployee_returnsSeededPeriods() throws Exception {
        mockMvc.perform(get("/api/v1/pay-periods"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @WithMockUser(roles = "EMPLOYEE")
    void listPayPeriods_filteredByClosedStatus_excludesOpenPeriods() throws Exception {
        mockMvc.perform(get("/api/v1/pay-periods").param("status", "CLOSED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(closedPeriod.getId()));
    }
}
