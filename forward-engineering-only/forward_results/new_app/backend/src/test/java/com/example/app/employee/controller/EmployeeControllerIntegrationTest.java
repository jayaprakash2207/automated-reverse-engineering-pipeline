package com.example.app.employee.controller;

import com.example.app.common.crypto.EncryptionKeyProvider;
import com.example.app.employee.domain.Employee;
import com.example.app.employee.dto.CreateEmployeeRequest;
import com.example.app.employee.repository.EmployeeRepository;
import com.example.app.security.domain.Role;
import com.example.app.security.domain.UserCredential;
import com.example.app.security.service.JwtTokenService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class EmployeeControllerIntegrationTest {

    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
        .withDatabaseName("appdb_test")
        .withUsername("appuser")
        .withPassword("apppassword");

    @DynamicPropertySource
    static void registerProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.security.jwt.secret",
            () -> "integration-test-secret-0123456789abcdef0123456789abcdef");
    }

    @TestConfiguration
    static class StubEncryptionKeyConfig {
        @Bean
        @Primary
        EncryptionKeyProvider testEncryptionKeyProvider() {
            byte[] rawKey = new byte[32];
            new SecureRandom().nextBytes(rawKey);
            return alias -> rawKey;
        }
    }

    @Autowired
    private TestRestTemplate restTemplate;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private JwtTokenService jwtTokenService;
    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    void cleanUp() {
        employeeRepository.deleteAll();
    }

    private String tokenFor(Role role, Long employeeId) {
        UserCredential user = new UserCredential();
        user.setEmail(role.name().toLowerCase() + "-" + employeeId + "@example.com");
        user.setEmployeeId(employeeId);
        user.setRoles(Set.of(role));
        return jwtTokenService.generateAccessToken(user);
    }

    private String adminToken() {
        return tokenFor(Role.ADMIN, 999L);
    }

    private HttpHeaders authHeaders() {
        return headersFor(Role.ADMIN, 999L);
    }

    private HttpHeaders headersFor(Role role, Long employeeId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(tokenFor(role, employeeId));
        headers.set("Idempotency-Key", UUID.randomUUID().toString());
        return headers;
    }

    private Employee persistEmployee(String email) {
        Employee employee = new Employee();
        employee.setFirstName("Jane");
        employee.setLastName("Doe");
        employee.setEmail(email);
        employee.setHireDate(LocalDate.of(2024, 1, 10));
        employee.setDepartment("Engineering");
        employee.setJobRole("Engineer II");
        return employeeRepository.save(employee);
    }

    @Test
    void should_createEmployeeAndReturn201_when_hireRequestIsValid() throws Exception {
        CreateEmployeeRequest request = new CreateEmployeeRequest(
            "Jane", "Doe", "jane.doe@example.com", LocalDate.of(2024, 1, 10), "Engineering", "Engineer II", null, null);

        HttpEntity<String> entity = new HttpEntity<>(objectMapper.writeValueAsString(request), authHeaders());
        ResponseEntity<JsonNode> response =
            restTemplate.postForEntity("/api/v1/employees", entity, JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody().get("email").asText()).isEqualTo("jane.doe@example.com");
        assertThat(response.getBody().get("status").asText()).isEqualTo("ACTIVE");
        assertThat(response.getBody().has("ssn_encrypted")).isFalse();
    }

    @Test
    void should_return409_when_hiringWithAnEmailThatAlreadyExists() throws Exception {
        CreateEmployeeRequest request = new CreateEmployeeRequest(
            "Jane", "Doe", "duplicate@example.com", LocalDate.of(2024, 1, 10), "Engineering", "Engineer II", null, null);
        restTemplate.postForEntity("/api/v1/employees",
            new HttpEntity<>(objectMapper.writeValueAsString(request), authHeaders()), JsonNode.class);

        ResponseEntity<JsonNode> response = restTemplate.postForEntity("/api/v1/employees",
            new HttpEntity<>(objectMapper.writeValueAsString(request), authHeaders()), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void should_return404_when_gettingAnUnknownEmployee() {
        HttpHeaders headers = authHeaders();
        headers.remove("Idempotency-Key");
        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/employees/999999", HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void should_return401_when_callingWithoutABearerToken() {
        ResponseEntity<JsonNode> response = restTemplate.getForEntity("/api/v1/employees", JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void should_return200_when_employeeRoleReadsOwnProfile() {
        Employee employee = persistEmployee("jane.self@example.com");
        HttpHeaders headers = headersFor(Role.EMPLOYEE, employee.getId());
        headers.remove("Idempotency-Key");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/employees/" + employee.getId(), HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void should_return403_when_employeeRoleReadsAnotherEmployeesProfile() {
        Employee employee = persistEmployee("jane.other@example.com");
        HttpHeaders headers = headersFor(Role.EMPLOYEE, employee.getId() + 1);
        headers.remove("Idempotency-Key");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/employees/" + employee.getId(), HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void should_return403_when_employeeRoleListsAllEmployees() {
        HttpHeaders headers = headersFor(Role.EMPLOYEE, 1L);
        headers.remove("Idempotency-Key");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/employees", HttpMethod.GET, new HttpEntity<>(headers), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }
}

Summary: the Employee Management Context (root aggregate, domain, service, controller, migration, and tests) was already well-implemented on disk, correctly replacing `TRG_EMP_BEFORE_UPDATE` with explicit transactional history writes and routing the disputed hire-date threshold through a single `HireDatePolicy` seam. I found and fixed two files corrupted by leftover markdown code fences (`EmployeeDto.java`, `EmployeeControllerIntegrationTest.java`) that would have failed compilation. Note: the same fence-corruption defect exists in files outside this sprint's scope (`common/`, `security/`, `leave/` packages) — those belong to other bounded contexts and weren't touched here, but will block the overall build until fixed by their owning sprints.
