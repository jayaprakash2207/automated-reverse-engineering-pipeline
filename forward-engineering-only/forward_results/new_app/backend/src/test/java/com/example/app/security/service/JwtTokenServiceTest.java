package com.example.app.security.service;

import com.example.app.security.config.JwtProperties;
import com.example.app.security.model.AuthenticatedUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Covers the JWT contract that both AuthController (backend) and AuthContext.tsx
 * (frontend, via decodeJwt) rely on: access tokens carry sub/email/roles/exp claims,
 * are HS256-signed with app.security.jwt.secret, and the service fails fast at
 * startup if that secret is blank (application.yml leaves no default on purpose).
 */
class JwtTokenServiceTest {

    private static final String TEST_SECRET =
            "test-only-signing-secret-must-be-at-least-256-bits-long-0123456789";

    private JwtProperties propertiesWith(String secret, Duration accessTtl, Duration refreshTtl) {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(secret);
        properties.setAccessTokenTtl(accessTtl);
        properties.setRefreshTokenTtl(refreshTtl);
        return properties;
    }

    @Test
    void constructor_rejectsBlankSecret_soMisconfigurationFailsAtStartupNotAtFirstLogin() {
        JwtProperties properties = propertiesWith("", Duration.ofMinutes(15), Duration.ofDays(7));

        assertThatThrownBy(() -> new JwtTokenService(properties))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void generateAccessToken_thenParseAccessToken_roundTripsTheOriginalClaims() {
        JwtTokenService service = new JwtTokenService(
                propertiesWith(TEST_SECRET, Duration.ofMinutes(15), Duration.ofDays(7)));
        AuthenticatedUser user = new AuthenticatedUser("emp-42", "person@example.com", List.of("EMPLOYEE"));

        String token = service.generateAccessToken(user);
        Claims claims = service.parseAccessToken(token);

        assertThat(claims.getSubject()).isEqualTo("emp-42");
        assertThat(claims.get("email", String.class)).isEqualTo("person@example.com");
        assertThat(claims.get("roles", List.class)).containsExactly("EMPLOYEE");
        assertThat(claims.getExpiration()).isAfter(new java.util.Date());
    }

    @Test
    void parseAccessToken_rejectsATokenWithATamperedSignature() {
        JwtTokenService service = new JwtTokenService(
                propertiesWith(TEST_SECRET, Duration.ofMinutes(15), Duration.ofDays(7)));
        AuthenticatedUser user = new AuthenticatedUser("emp-42", "person@example.com", List.of("EMPLOYEE"));
        String token = service.generateAccessToken(user);
        String tampered = token.substring(0, token.length() - 4) + "abcd";

        assertThatThrownBy(() -> service.parseAccessToken(tampered))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void parseAccessToken_rejectsAnExpiredToken() throws InterruptedException {
        JwtTokenService service = new JwtTokenService(
                propertiesWith(TEST_SECRET, Duration.ofMillis(1), Duration.ofDays(7)));
        AuthenticatedUser user = new AuthenticatedUser("emp-42", "person@example.com", List.of("EMPLOYEE"));
        String token = service.generateAccessToken(user);

        Thread.sleep(25);

        assertThatThrownBy(() -> service.parseAccessToken(token))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void generateOpaqueRefreshToken_producesUniqueUnguessableValuesEachCall() {
        JwtTokenService service = new JwtTokenService(
                propertiesWith(TEST_SECRET, Duration.ofMinutes(15), Duration.ofDays(7)));

        String first = service.generateOpaqueRefreshToken();
        String second = service.generateOpaqueRefreshToken();

        assertThat(first).isNotEqualTo(second);
        assertThat(first.length()).isGreaterThanOrEqualTo(32);
    }
}
