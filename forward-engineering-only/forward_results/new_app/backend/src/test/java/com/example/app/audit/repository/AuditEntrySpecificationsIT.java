package com.example.app.audit.repository;

import com.example.app.audit.domain.AuditEntry;
import com.example.app.audit.domain.AuditOutcome;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * AuditEntrySpecifications backs the only query surface compliance review has (GET
 * /api/v1/audit-entries). AuditServiceTest mocks the repository, so it only proves
 * AuditService *delegates* to a Specification -- not that the Criteria predicates built
 * here actually filter rows correctly against a real Postgres instance. This class closes
 * that gap directly against the repository layer.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.NONE)
class AuditEntrySpecificationsIT {

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

    @Autowired
    private AuditEntryRepository auditEntryRepository;

    @BeforeEach
    void cleanUp() {
        auditEntryRepository.deleteAll();
    }

    private AuditEntry persist(String entityType, String entityId, String action) throws InterruptedException {
        AuditEntry entry = new AuditEntry();
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setAction(action);
        entry.setPerformedBy("admin@example.com");
        entry.setOutcome(AuditOutcome.SUCCESS);
        AuditEntry saved = auditEntryRepository.save(entry);
        // Guarantees a strictly increasing occurred_at across sequential inserts in the same
        // test so the ordering assertion below can't flake on coarse clock resolution.
        Thread.sleep(5);
        return saved;
    }

    @Test
    void should_returnEveryRow_when_neitherFilterIsProvided() throws InterruptedException {
        persist("EMPLOYEE", "1", "HIRE");
        persist("AUTH", "1", "LOGIN_SUCCESS");

        Page<AuditEntry> page = auditEntryRepository.findAll(
            AuditEntrySpecifications.withFilters(null, null), PageRequest.of(0, 20));

        assertThat(page.getContent()).hasSize(2);
    }

    @Test
    void should_treatBlankFilterValues_asNotProvided() throws InterruptedException {
        persist("EMPLOYEE", "1", "HIRE");
        persist("AUTH", "1", "LOGIN_SUCCESS");

        Page<AuditEntry> page = auditEntryRepository.findAll(
            AuditEntrySpecifications.withFilters("   ", ""), PageRequest.of(0, 20));

        assertThat(page.getContent()).hasSize(2);
    }

    @Test
    void should_filterByEntityTypeAlone_when_entityIdIsOmitted() throws InterruptedException {
        persist("EMPLOYEE", "1", "HIRE");
        persist("EMPLOYEE", "2", "UPDATE_PROFILE");
        persist("AUTH", "1", "LOGIN_SUCCESS");

        Page<AuditEntry> page = auditEntryRepository.findAll(
            AuditEntrySpecifications.withFilters("EMPLOYEE", null), PageRequest.of(0, 20));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent()).extracting(AuditEntry::getEntityType).containsOnly("EMPLOYEE");
    }

    @Test
    void should_filterByEntityIdAlone_when_entityTypeIsOmitted() throws InterruptedException {
        persist("EMPLOYEE", "1", "HIRE");
        persist("AUTH", "1", "LOGIN_SUCCESS");
        persist("EMPLOYEE", "2", "UPDATE_PROFILE");

        Page<AuditEntry> page = auditEntryRepository.findAll(
            AuditEntrySpecifications.withFilters(null, "1"), PageRequest.of(0, 20));

        assertThat(page.getContent()).hasSize(2);
        assertThat(page.getContent()).extracting(AuditEntry::getEntityId).containsOnly("1");
    }

    @Test
    void should_orderMostRecentFirst_matchingTheServiceLayersExplicitSort() throws InterruptedException {
        persist("EMPLOYEE", "1", "HIRE");
        persist("EMPLOYEE", "1", "UPDATE_PROFILE");
        persist("EMPLOYEE", "1", "TERMINATE");

        Page<AuditEntry> page = auditEntryRepository.findAll(
            AuditEntrySpecifications.withFilters("EMPLOYEE", "1"),
            PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "occurredAt")));

        List<String> actions = page.getContent().stream().map(AuditEntry::getAction).toList();
        assertThat(actions).containsExactly("TERMINATE", "UPDATE_PROFILE", "HIRE");
    }

    @Test
    void should_rejectAnOverlongEntityType_atTheRealDatabaseConstraint_regressionForDISC006() {
        AuditEntry entry = new AuditEntry();
        entry.setEntityType("X".repeat(51));
        entry.setEntityId("1");
        entry.setAction("HIRE");
        entry.setPerformedBy("admin@example.com");
        entry.setOutcome(AuditOutcome.SUCCESS);

        assertThatThrownBy(() -> auditEntryRepository.saveAndFlush(entry))
            .isInstanceOf(DataAccessException.class);
    }
}
