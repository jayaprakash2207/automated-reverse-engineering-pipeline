package com.example.app.security.service;

import com.example.app.audit.domain.AuditOutcome;
import com.example.app.audit.service.AuditService;
import com.example.app.common.exception.AccessDeniedException;
import com.example.app.security.domain.RefreshToken;
import com.example.app.security.domain.Role;
import com.example.app.security.domain.UserCredential;
import com.example.app.security.dto.AuthResponse;
import com.example.app.security.dto.LoginRequest;
import com.example.app.security.dto.RefreshTokenRequest;
import com.example.app.security.model.AuthenticatedUser;
import com.example.app.security.repository.RefreshTokenRepository;
import com.example.app.security.repository.UserCredentialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Session issuance occurs only after credential verification succeeds - the unconditional
 * issuance in {@code PKG_SECURITY.authenticate()} is treated as a hard regression to prevent,
 * not a behavior to preserve (Security Architecture §2, §5 Phase 1).
 *
 * <p>This is the second of DISC-006's two named callers (Employee lifecycle already writes
 * through {@code EmployeeService}). Every outcome - success, wrong password, unknown email,
 * lockout, logout, and refresh - is written to the audit trail via
 * {@link AuditService#logAction}, which runs with {@code Propagation.MANDATORY} inside this
 * class's own transactions and throws {@code AuditWriteFailedException} (-> 500
 * {@code AUDIT_WRITE_FAILED}) if the write itself fails, per the fail-closed contract.
 *
 * <p>{@code noRollbackFor = AccessDeniedException.class} on {@link #login} and {@link #refresh}
 * is deliberate, not decorative: without it, Spring's default rollback-on-RuntimeException
 * behavior would undo both the FAILURE audit row just written above and
 * {@link #registerFailedAttempt}'s counter increment the instant {@link AccessDeniedException}
 * propagates - silently defeating the audit trail and the account-lockout protection in the same
 * stroke. That combination was the actual pre-existing defect: lockout tracking looked
 * implemented but its persisted state was rolled back on every failed attempt.
 */
@Service
@RequiredArgsConstructor
public class AuthService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final Duration LOCKOUT_DURATION = Duration.ofMinutes(15);
    private static final String AUDIT_ENTITY_TYPE = "AUTH";

    /**
     * A syntactically valid BCrypt hash that matches no real password. Compared against on every
     * login for an unknown email so that failure timing does not reveal whether the account
     * exists (Security Architecture §4, credential stuffing / enumeration).
     */
    private static final String DUMMY_PASSWORD_HASH =
            "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    private static final String GENERIC_LOGIN_FAILURE_MESSAGE = "Invalid email or password";

    private final UserCredentialRepository userCredentialRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenService jwtTokenService;
    private final TokenHasher tokenHasher;
    private final AuditService auditService;

    @Transactional(noRollbackFor = AccessDeniedException.class)
    public AuthResponse login(LoginRequest request) {
        UserCredential credential = userCredentialRepository.findByEmail(request.email()).orElse(null);

        if (credential == null) {
            passwordEncoder.matches(request.password(), DUMMY_PASSWORD_HASH);
            auditFailure(request.email(), "LOGIN_FAILURE", "No credential exists for this email");
            throw new AccessDeniedException(GENERIC_LOGIN_FAILURE_MESSAGE);
        }

        if (!credential.isEnabled()) {
            auditFailure(credential.getId().toString(), "LOGIN_FAILURE", "Credential is disabled");
            throw new AccessDeniedException(GENERIC_LOGIN_FAILURE_MESSAGE);
        }

        if (credential.isLocked()) {
            auditFailure(credential.getId().toString(), "LOGIN_BLOCKED",
                "Account locked until " + credential.getLockedUntil());
            throw new AccessDeniedException("Account is temporarily locked due to repeated failed login attempts");
        }

        if (!passwordEncoder.matches(request.password(), credential.getPasswordHash())) {
            registerFailedAttempt(credential);
            auditFailure(credential.getId().toString(), "LOGIN_FAILURE", "Incorrect password");
            throw new AccessDeniedException(GENERIC_LOGIN_FAILURE_MESSAGE);
        }

        credential.setFailedAttempts(0);
        credential.setLockedUntil(null);
        userCredentialRepository.save(credential);

        AuthResponse response = issueTokens(credential);
        auditService.logAction(AUDIT_ENTITY_TYPE, credential.getId().toString(), "LOGIN_SUCCESS",
            credential.getEmail(), AuditOutcome.SUCCESS, "Login succeeded");
        return response;
    }

    @Transactional(noRollbackFor = AccessDeniedException.class)
    public AuthResponse refresh(RefreshTokenRequest request) {
        String tokenHash = tokenHasher.hash(request.refreshToken());
        RefreshToken existing = refreshTokenRepository.findByTokenHash(tokenHash)
                .orElseThrow(() -> new AccessDeniedException("Invalid refresh token"));

        if (!existing.isValid()) {
            auditFailure(existing.getUserCredentialId().toString(), "TOKEN_REFRESH_FAILURE",
                "Refresh token is expired or has been revoked");
            throw new AccessDeniedException("Refresh token is expired or has been revoked");
        }

        UserCredential credential = userCredentialRepository.findById(existing.getUserCredentialId())
                .filter(UserCredential::isEnabled)
                .orElseThrow(() -> {
                    auditFailure(existing.getUserCredentialId().toString(), "TOKEN_REFRESH_FAILURE",
                        "Associated credential is missing or disabled");
                    return new AccessDeniedException("Invalid refresh token");
                });

        existing.setRevoked(true);
        AuthResponse response = issueTokens(credential);
        existing.setReplacedByTokenHash(tokenHasher.hash(response.refreshToken()));
        refreshTokenRepository.save(existing);

        auditService.logAction(AUDIT_ENTITY_TYPE, credential.getId().toString(), "TOKEN_REFRESH",
            credential.getEmail(), AuditOutcome.SUCCESS, "Refresh token rotated");
        return response;
    }

    @Transactional
    public void logout(RefreshTokenRequest request) {
        String tokenHash = tokenHasher.hash(request.refreshToken());
        refreshTokenRepository.findByTokenHash(tokenHash).ifPresent(token -> {
            token.setRevoked(true);
            refreshTokenRepository.save(token);
            auditService.logAction(AUDIT_ENTITY_TYPE, token.getUserCredentialId().toString(), "LOGOUT",
                token.getUserCredentialId().toString(), AuditOutcome.SUCCESS, "Refresh token revoked");
        });
    }

    private void auditFailure(String entityId, String action, String details) {
        auditService.logAction(AUDIT_ENTITY_TYPE, entityId, action, entityId, AuditOutcome.FAILURE, details);
    }

    private void registerFailedAttempt(UserCredential credential) {
        int attempts = credential.getFailedAttempts() + 1;
        credential.setFailedAttempts(attempts);
        if (attempts >= MAX_FAILED_ATTEMPTS) {
            credential.setLockedUntil(Instant.now().plus(LOCKOUT_DURATION));
        }
        userCredentialRepository.save(credential);
    }

    private AuthResponse issueTokens(UserCredential credential) {
        Set<String> roleNames = credential.getRoles().stream().map(Role::name).collect(Collectors.toSet());
        AuthenticatedUser principal = new AuthenticatedUser(
                credential.getId(), credential.getEmployeeId(), credential.getEmail(), roleNames);

        String accessToken = jwtTokenService.generateAccessToken(principal);
        String rawRefreshToken = jwtTokenService.generateRawRefreshToken();

        Instant now = Instant.now();
        RefreshToken refreshToken = new RefreshToken(
                credential.getId(),
                tokenHasher.hash(rawRefreshToken),
                now,
                now.plus(jwtTokenService.getRefreshTokenTtl()));
        refreshTokenRepository.save(refreshToken);

        return new AuthResponse(accessToken, rawRefreshToken, "Bearer", jwtTokenService.getAccessTokenTtlSeconds());
    }
}
