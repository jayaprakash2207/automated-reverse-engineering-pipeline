package com.example.app.security.service;

import com.example.app.security.config.JwtProperties;
import com.example.app.security.model.AuthenticatedUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Short-lived signed access tokens; opaque, high-entropy refresh tokens issued separately and
 * rotated on use (Security Architecture §4). Fails fast at startup if JWT_SECRET is unset or too
 * short, rather than silently signing with a weak/blank key.
 */
@Service
@RequiredArgsConstructor
public class JwtTokenService {

    private static final String CLAIM_EMPLOYEE_ID = "employeeId";
    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_EMAIL = "email";
    private static final int REFRESH_TOKEN_BYTE_LENGTH = 64;
    private static final int MIN_SECRET_BYTES = 32;

    private final JwtProperties jwtProperties;
    private final SecureRandom secureRandom = new SecureRandom();

    private SecretKey signingKey;

    @PostConstruct
    void init() {
        if (jwtProperties.getSecret() == null || jwtProperties.getSecret().isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is not set. A high-entropy secret must be injected via the JWT_SECRET "
                            + "environment variable before the application can start.");
        }
        byte[] keyBytes = Base64.getDecoder().decode(jwtProperties.getSecret());
        if (keyBytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "JWT_SECRET must decode to at least 256 bits (32 bytes) for HS256 signing.");
        }
        this.signingKey = Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateAccessToken(AuthenticatedUser user) {
        Instant now = Instant.now();
        Instant expiry = now.plus(jwtProperties.getAccessTokenTtl());

        List<String> roleClaims = user.getAuthorities().stream()
                .map(Object::toString)
                .collect(Collectors.toList());

        return Jwts.builder()
                .subject(user.getUserCredentialId().toString())
                .claim(CLAIM_EMPLOYEE_ID, user.getEmployeeId())
                .claim(CLAIM_ROLES, roleClaims)
                .claim(CLAIM_EMAIL, user.getUsername())
                .issuedAt(Date.from(now))
                .expiration(Date.from(expiry))
                .id(UUID.randomUUID().toString())
                .signWith(signingKey)
                .compact();
    }

    public AuthenticatedUser parseAccessToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Long userCredentialId = Long.valueOf(claims.getSubject());
        Long employeeId = claims.get(CLAIM_EMPLOYEE_ID, Long.class);
        String email = claims.get(CLAIM_EMAIL, String.class);

        @SuppressWarnings("unchecked")
        List<String> authorities = claims.get(CLAIM_ROLES, List.class);
        Set<String> roles = authorities == null
                ? Set.of()
                : authorities.stream()
                        .map(authority -> authority.startsWith("ROLE_") ? authority.substring(5) : authority)
                        .collect(Collectors.toSet());

        return new AuthenticatedUser(userCredentialId, employeeId, email, roles);
    }

    public String generateRawRefreshToken() {
        byte[] bytes = new byte[REFRESH_TOKEN_BYTE_LENGTH];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public long getAccessTokenTtlSeconds() {
        return jwtProperties.getAccessTokenTtl().toSeconds();
    }

    public Duration getRefreshTokenTtl() {
        return jwtProperties.getRefreshTokenTtl();
    }
}
