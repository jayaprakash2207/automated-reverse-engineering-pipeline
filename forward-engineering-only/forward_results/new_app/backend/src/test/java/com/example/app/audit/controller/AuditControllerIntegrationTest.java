package com.example.app.audit.controller;

import com.example.app.audit.domain.AuditEntry;
import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.repository.AuditEntryRepository;
import com.example.app.common.crypto.EncryptionKeyProvider;
import com.example.app.security.domain.Role;
import com.example.app.security.model.AuthenticatedUser;
import com.example.app.security.service.JwtTokenService;
import com.fasterxml.jackson.databind.JsonNode;
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
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * NOTE: this file previously built its bearer tokens from a raw {@code UserCredential}
 * passed into {@code JwtTokenService.generateAccessToken(AuthenticatedUser)} -- a type
 * that method does not accept, and {@code UserCredential}'s no-arg constructor is
 * package-private-to-{@code security.domain} (`@NoArgsConstructor(access = PROTECTED)`),
 * so the previous version of this class did not compile. Tokens are now minted directly
 * from {@link AuthenticatedUser}, the type the real {@link com.example.app.security.config.JwtAuthenticationFilter}
 * actually parses access tokens back into.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuditControllerIntegrationTest {

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
    private AuditEntryRepository auditEntryRepository;
    @Autowired
    private JwtTokenService jwtTokenService;

    @BeforeEach
    void cleanUp() {
        auditEntryRepository.deleteAll();
    }

    private String tokenFor(Role role, Long employeeId) {
        AuthenticatedUser principal = new AuthenticatedUser(
            employeeId, employeeId, role.name().toLowerCase() + "-" + employeeId + "@example.com", Set.of(role.name()));
        return jwtTokenService.generateAccessToken(principal);
    }

    private HttpHeaders headersFor(Role role, Long employeeId) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(tokenFor(role, employeeId));
        return headers;
    }

    private AuditEntry persistEntry(String entityType, String entityId, String action) {
        AuditEntry entry = new AuditEntry();
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setAction(action);
        entry.setPerformedBy("admin@example.com");
        entry.setOutcome(AuditOutcome.SUCCESS);
        return auditEntryRepository.save(entry);
    }

    @Test
    void should_return200_when_adminSearchesAuditEntries() {
        persistEntry("EMPLOYEE", "1", "HIRE");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/audit-entries", HttpMethod.GET, new HttpEntity<>(headersFor(Role.ADMIN, 999L)), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("data")).hasSize(1);
    }

    @Test
    void should_returnAnEmptyDataArray_notNull_when_noAuditEntriesExist() {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/audit-entries", HttpMethod.GET, new HttpEntity<>(headersFor(Role.ADMIN, 999L)), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("data").isArray()).isTrue();
        assertThat(response.getBody().get("data")).isEmpty();
    }

    @Test
    void should_filterByEntityTypeAndEntityId_when_bothQueryParamsAreProvided() {
        persistEntry("EMPLOYEE", "1", "HIRE");
        persistEntry("EMPLOYEE", "2", "HIRE");
        persistEntry("AUTH", "1", "LOGIN_SUCCESS");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/audit-entries?entity_type=EMPLOYEE&entity_id=1",
            HttpMethod.GET, new HttpEntity<>(headersFor(Role.ADMIN, 999L)), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("data")).hasSize(1);
        assertThat(response.getBody().get("data").get(0).get("entity_id").asText()).isEqualTo("1");
    }

    @Test
    void should_filterByEntityIdAlone_when_onlyEntityIdQueryParamIsProvided() {
        // Regression for the controller-level counterpart of AuditEntrySpecificationsIT's
        // repository-level "entity id alone" case: proves the query param actually reaches
        // AuditEntrySpecifications.withFilters(null, entityId) over real HTTP, not just that
        // the Specification itself filters correctly in isolation.
        persistEntry("EMPLOYEE", "1", "HIRE");
        persistEntry("AUTH", "1", "LOGIN_SUCCESS");
        persistEntry("EMPLOYEE", "2", "TRANSFER");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/audit-entries?entity_id=1",
            HttpMethod.GET, new HttpEntity<>(headersFor(Role.ADMIN, 999L)), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("data")).hasSize(2);
    }

    @Test
    void should_returnANonNullCursorThenANullCursor_when_pagingThroughAllResultsByLimit() {
        persistEntry("EMPLOYEE", "1", "HIRE");
        persistEntry("EMPLOYEE", "2", "TRANSFER");
        persistEntry("EMPLOYEE", "3", "PROMOTE");

        ResponseEntity<JsonNode> firstPage = restTemplate.exchange(
            "/api/v1/audit-entries?limit=2", HttpMethod.GET,
            new HttpEntity<>(headersFor(Role.ADMIN, 999L)), JsonNode.class);

        assertThat(firstPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(firstPage.getBody().get("data")).hasSize(2);
        String cursor = firstPage.getBody().get("page").get("cursor").asText();
        assertThat(cursor).isEqualTo("1");

        ResponseEntity<JsonNode> secondPage = restTemplate.exchange(
            "/api/v1/audit-entries?limit=2&cursor=" + cursor, HttpMethod.GET,
            new HttpEntity<>(headersFor(Role.ADMIN, 999L)), JsonNode.class);

        assertThat(secondPage.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(secondPage.getBody().get("data")).hasSize(1);
        assertThat(secondPage.getBody().get("page").get("cursor").isNull()).isTrue();
    }

    @Test
    void should_return400_when_cursorIsNotANumericPageIndex() {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/audit-entries?cursor=not-a-number",
            HttpMethod.GET, new HttpEntity<>(headersFor(Role.ADMIN, 999L)), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody().get("error_code").asText()).isEqualTo("VALIDATION_ERROR");
    }

    @Test
    void should_return403_when_nonAdminNonReviewerSearchesAuditEntries() {
        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/audit-entries", HttpMethod.GET, new HttpEntity<>(headersFor(Role.EMPLOYEE, 1L)), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void should_return200_forAuditReviewerRole_becauseThatRoleExistsSpecificallyForComplianceReview() {
        // Role.AUDIT_REVIEWER exists in the RBAC vocabulary specifically for this screen
        // (11_API_CONTRACT_SPECIFICATION.md §7.1, "compliance review"). AuditService.search
        // authorizes hasAnyRole('ADMIN', 'AUDIT_REVIEWER') so the role is actually usable,
        // not just defined in the enum.
        persistEntry("EMPLOYEE", "1", "HIRE");

        ResponseEntity<JsonNode> response = restTemplate.exchange(
            "/api/v1/audit-entries", HttpMethod.GET,
            new HttpEntity<>(headersFor(Role.AUDIT_REVIEWER, 1L)), JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody().get("data")).hasSize(1);
    }

    @Test
    void should_return401_when_callingWithoutABearerToken() {
        ResponseEntity<JsonNode> response = restTemplate.getForEntity("/api/v1/audit-entries", JsonNode.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
