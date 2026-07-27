package com.example.app.audit;

import com.example.app.audit.repository.AuditEntryRepository;
import com.example.app.common.crypto.EncryptionKeyProvider;
import com.example.app.common.exception.AuditWriteFailedException;
import com.example.app.employee.dto.CreateEmployeeRequest;
import com.example.app.employee.repository.EmployeeHistoryRepository;
import com.example.app.employee.repository.EmployeeRepository;
import com.example.app.employee.service.EmployeeService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.security.SecureRandom;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Proves the sprint's actual reason for existing (DISC-006): AuditService.logAction runs
 * with Propagation.MANDATORY inside each caller's own @Transactional method, so a failed
 * audit write must roll back the business change it was recording, instead of the legacy
 * PKG_AUDIT.log_action behavior of swallowing the failure and letting the caller "succeed
 * silently." EmployeeService.hire is one of AuditService's two real, wired-up callers
 * (AuthService.login is the other, owned by the Security/Identity sprint), so it is
 * exercised here through the real Spring-managed bean rather than mocked.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class AuditAtomicityIntegrationTest {

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
    private EmployeeService employeeService;
    @Autowired
    private EmployeeRepository employeeRepository;
    @Autowired
    private EmployeeHistoryRepository employeeHistoryRepository;
    @Autowired
    private AuditEntryRepository auditEntryRepository;

    @BeforeEach
    void cleanUp() {
        auditEntryRepository.deleteAll();
        employeeHistoryRepository.deleteAll();
        employeeRepository.deleteAll();
    }

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void authenticateAsAdmin(String actorName) {
        Authentication authentication = new UsernamePasswordAuthenticationToken(
            actorName, null, AuthorityUtils.createAuthorityList("ROLE_ADMIN"));
        SecurityContextHolder.getContext().setAuthentication(authentication);
    }

    private CreateEmployeeRequest hireRequest(String email) {
        return new CreateEmployeeRequest(
            "Ada", "Lovelace", email, LocalDate.of(2024, 1, 15),
            "Engineering", "Software Engineer", null, null);
    }

    @Test
    void should_writeExactlyOneAuditEntryAtomicallyWithTheEmployeeRow_when_hireSucceeds() {
        authenticateAsAdmin("hr.admin@example.com");

        var employee = employeeService.hire(hireRequest("ada@example.com"));

        assertThat(employeeRepository.findById(employee.id())).isPresent();
        var entries = auditEntryRepository.findAll();
        assertThat(entries).hasSize(1);
        assertThat(entries.get(0).getEntityType()).isEqualTo("EMPLOYEE");
        assertThat(entries.get(0).getEntityId()).isEqualTo(employee.id().toString());
        assertThat(entries.get(0).getAction()).isEqualTo("HIRE");
        assertThat(entries.get(0).getPerformedBy()).isEqualTo("hr.admin@example.com");
    }

    @Test
    void should_rollBackTheEntireHire_when_theAuditWriteItselfFails_ratherThanSucceedingSilently() {
        // performed_by is VARCHAR(255) (V1.4__create_audit_entries.sql). Forcing the
        // authenticated actor's name past that limit makes AuditService.logAction's own
        // saveAndFlush fail with a real constraint violation -- the same failure mode
        // DISC-006 says the legacy PKG_AUDIT.log_action swallowed.
        String oversizedActor = "a".repeat(300) + "@example.com";
        authenticateAsAdmin(oversizedActor);

        assertThatThrownBy(() -> employeeService.hire(hireRequest("grace@example.com")))
            .isInstanceOf(AuditWriteFailedException.class);

        assertThat(employeeRepository.findByEmail("grace@example.com")).isEmpty();
        assertThat(auditEntryRepository.findAll()).isEmpty();
    }
}
