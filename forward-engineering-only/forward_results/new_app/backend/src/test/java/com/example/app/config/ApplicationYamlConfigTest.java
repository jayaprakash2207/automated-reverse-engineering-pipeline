package com.example.app.config;

import org.junit.jupiter.api.Test;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Verifies the shape of the one backend artifact this sprint actually
 * delivered: backend/src/main/resources/application.yml. Every Java class
 * referenced in the sprint's file list (EmployeeController, EmployeeService,
 * Employee, EmployeeRepository, DefaultHireDatePolicy, SsnEncryptedConverter,
 * JwtAuthenticationFilter, SecurityConfig, ...) is "[File does not exist
 * yet]", so no Spring context can be started and no domain-level unit or
 * integration test can be written without inventing an implementation the
 * Backend agent has not produced. See PendingSprintCoverageTest for the
 * tracked list of what is missing and why.
 *
 * This test parses the raw YAML text (no Spring ${...} placeholder
 * resolution), so it only asserts what is literally checked into source
 * control today.
 */
class ApplicationYamlConfigTest {

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadYaml() {
        try (InputStream in = getClass().getClassLoader().getResourceAsStream("application.yml")) {
            assertNotNull(in, "application.yml must be on the test classpath");
            return new Yaml().load(in);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> path(Map<String, Object> root, String... keys) {
        Map<String, Object> current = root;
        for (String key : keys) {
            Object next = current.get(key);
            assertNotNull(next, "expected YAML path segment '" + key + "' to be present");
            current = (Map<String, Object>) next;
        }
        return current;
    }

    @Test
    void databasePasswordHasNoHardcodedDefault() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> datasource = path(root, "spring", "datasource");
        // Asserts the RAW placeholder string, not a resolved value: a literal
        // fallback password here would repeat the legacy PKG_SECURITY
        // hard-coded-AES-key defect this sprint's own comments call out as
        // non-negotiable to avoid (Stack Mapping Contract row 6 / non-negotiable #2).
        assertEquals("${DB_PASSWORD}", datasource.get("password"));
    }

    @Test
    void jwtSecretHasNoHardcodedDefault() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> jwt = path(root, "app", "security", "jwt");
        assertEquals("${JWT_SECRET:}", jwt.get("secret"));
    }

    @Test
    void hireDateThresholdDefaultsToTheConservativeDisputedValuePendingDISC001() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> hireDatePolicy = path(root, "app", "hire-date-policy");
        // BR-hire-date-drift / DISC-001 is unresolved between a 90-day and a
        // 180-day threshold. This only pins today's placeholder (90, the more
        // conservative of the two disputed values) so any future change away
        // from that placeholder shows up as a deliberate, visible diff here
        // rather than silent drift once HireDatePolicy is actually implemented.
        assertEquals("${HIRE_DATE_THRESHOLD_DAYS:90}", hireDatePolicy.get("threshold-days"));
    }

    @Test
    void hibernateDdlAutoIsValidateNotAnAutoMigrationMode() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> hibernate = path(root, "spring", "jpa", "hibernate");
        // Postgres schema ownership belongs to Flyway migrations
        // (db/migration/V1.3__create_employees.sql etc.); "validate" must
        // never drift to "update"/"create"/"create-drop", which would let
        // Hibernate silently mutate the migrated-off-Oracle schema.
        assertEquals("validate", hibernate.get("ddl-auto"));
    }

    @Test
    void flywayIsEnabledAndPointsAtTheMigrationClasspath() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> flyway = path(root, "spring", "flyway");
        assertEquals(Boolean.TRUE, flyway.get("enabled"));
        assertEquals("classpath:db/migration", flyway.get("locations"));
    }

    @Test
    void jacksonUsesSnakeCaseMatchingTheFrontendWireContract() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> jackson = path(root, "spring", "jackson");
        // frontend/src/shared/types/apiError.ts and the employee API type
        // modules both model snake_case JSON fields (error_code, trace_id,
        // field_errors, ...) on the assumption this stays SNAKE_CASE;
        // flipping it would silently break every frontend DTO mapper.
        assertEquals("SNAKE_CASE", jackson.get("property-naming-strategy"));
    }

    @Test
    void healthEndpointDoesNotLeakDetailsToUnauthenticatedCallers() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> health = path(root, "management", "endpoint", "health");
        assertEquals("never", health.get("show-details"));
    }

    @Test
    void accessAndRefreshTokenTtlsMatchTheDocumentedContract() {
        Map<String, Object> root = loadYaml();
        Map<String, Object> jwt = path(root, "app", "security", "jwt");
        assertEquals("PT15M", jwt.get("access-token-ttl"));
        assertEquals("P7D", jwt.get("refresh-token-ttl"));
    }
}
