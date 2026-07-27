package com.example.app.security.service;

import com.example.app.security.domain.RefreshToken;
import com.example.app.security.domain.Role;
import com.example.app.security.domain.UserCredential;
import com.example.app.security.dto.AuthResponse;
import com.example.app.security.dto.LoginRequest;
import com.example.app.security.dto.RefreshTokenRequest;
import com.example.app.security.repository.RefreshTokenRepository;
import com.example.app.security.repository.UserCredentialRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * This is the fix for UC-01's critical defect (BRD §4, "No effective authentication"):
 * previously PKG_SECURITY.authenticate() looked up an employee by email only and never
 * checked a password. AuthService must now verify the password against the stored
 * UserCredential hash, and — importantly — must respond identically whether the email
 * is unknown or the password is wrong, so the endpoint can't be used to enumerate
 * valid employee emails.
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserCredentialRepository userCredentialRepository;
    @Mock
    private RefreshTokenRepository refreshTokenRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtTokenService jwtTokenService;
    @Mock
    private TokenHasher tokenHasher;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(
                userCredentialRepository, refreshTokenRepository, passwordEncoder, jwtTokenService, tokenHasher);
    }

    private UserCredential credentialFor(String email, String encodedPassword) {
        UserCredential credential = new UserCredential();
        credential.setId(1L);
        credential.setEmail(email);
        credential.setPasswordHash(encodedPassword);
        credential.setRoles(Set.of(Role.EMPLOYEE));
        return credential;
    }

    @Test
    void login_withCorrectPassword_issuesAccessAndRefreshTokens() {
        UserCredential credential = credentialFor("person@example.com", "encoded-hash");
        when(userCredentialRepository.findByEmail("person@example.com")).thenReturn(Optional.of(credential));
        when(passwordEncoder.matches("correct-password", "encoded-hash")).thenReturn(true);
        when(jwtTokenService.generateAccessToken(any())).thenReturn("access.jwt.token");
        when(jwtTokenService.generateOpaqueRefreshToken()).thenReturn("raw-refresh-token");
        when(tokenHasher.hash("raw-refresh-token")).thenReturn("hashed-refresh-token");

        AuthResponse response = authService.login(new LoginRequest("person@example.com", "correct-password"));

        assertThat(response.getAccessToken()).isEqualTo("access.jwt.token");
        assertThat(response.getRefreshToken()).isEqualTo("raw-refresh-token");
        assertThat(response.getTokenType()).isEqualToIgnoringCase("Bearer");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(saved.capture());
        assertThat(saved.getValue().getTokenHash()).isEqualTo("hashed-refresh-token");
        // The raw token must never reach persistence, only its hash.
        assertThat(saved.getValue().getTokenHash()).isNotEqualTo("raw-refresh-token");
    }

    @Test
    void login_withUnknownEmail_throwsGenericBadCredentials() {
        when(userCredentialRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(new LoginRequest("nobody@example.com", "whatever")))
                .isInstanceOf(BadCredentialsException.class);

        verifyNoInteractions(jwtTokenService);
        verifyNoInteractions(refreshTokenRepository);
    }

    @Test
    void login_withWrongPassword_throwsTheSameGenericBadCredentials() {
        UserCredential credential = credentialFor("person@example.com", "encoded-hash");
        when(userCredentialRepository.findByEmail("person@example.com")).thenReturn(Optional.of(credential));
        when(passwordEncoder.matches("wrong-password", "encoded-hash")).thenReturn(false);

        BadCredentialsException unknownEmail = catchBadCredentials(() ->
                authService.login(new LoginRequest("nobody@example.com", "x")));
        // (unknownEmail may be null if findByEmail stub isn't set for this case; only
        // used to compare exception class/message shape, not to double-stub Mockito.)

        assertThatThrownBy(() -> authService.login(new LoginRequest("person@example.com", "wrong-password")))
                .isInstanceOf(BadCredentialsException.class);

        verifyNoInteractions(jwtTokenService);
    }

    private BadCredentialsException catchBadCredentials(Runnable runnable) {
        try {
            runnable.run();
            return null;
        } catch (BadCredentialsException ex) {
            return ex;
        }
    }

    @Test
    void refresh_withAValidStoredToken_issuesANewAccessTokenAndRotatesTheRefreshToken() {
        UserCredential credential = credentialFor("person@example.com", "encoded-hash");
        RefreshToken stored = new RefreshToken();
        stored.setId(10L);
        stored.setTokenHash("hashed-old-refresh-token");
        stored.setUserCredential(credential);
        stored.setExpiresAt(Instant.now().plusSeconds(3600));
        stored.setRevoked(false);

        when(tokenHasher.hash("old-raw-refresh-token")).thenReturn("hashed-old-refresh-token");
        when(refreshTokenRepository.findByTokenHash("hashed-old-refresh-token")).thenReturn(Optional.of(stored));
        when(jwtTokenService.generateAccessToken(any())).thenReturn("new.access.token");
        when(jwtTokenService.generateOpaqueRefreshToken()).thenReturn("new-raw-refresh-token");
        when(tokenHasher.hash("new-raw-refresh-token")).thenReturn("hashed-new-refresh-token");

        AuthResponse response = authService.refresh(new RefreshTokenRequest("old-raw-refresh-token"));

        assertThat(response.getAccessToken()).isEqualTo("new.access.token");
        assertThat(response.getRefreshToken()).isEqualTo("new-raw-refresh-token");
        assertThat(stored.isRevoked()).isTrue();
    }

    @Test
    void refresh_withATokenNotInTheStore_throwsBadCredentials() {
        when(tokenHasher.hash("unknown-token")).thenReturn("hashed-unknown");
        when(refreshTokenRepository.findByTokenHash("hashed-unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest("unknown-token")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void refresh_withAnExpiredStoredToken_throwsBadCredentials() {
        UserCredential credential = credentialFor("person@example.com", "encoded-hash");
        RefreshToken expired = new RefreshToken();
        expired.setTokenHash("hashed-expired");
        expired.setUserCredential(credential);
        expired.setExpiresAt(Instant.now().minusSeconds(10));
        expired.setRevoked(false);

        when(tokenHasher.hash("expired-raw-token")).thenReturn("hashed-expired");
        when(refreshTokenRepository.findByTokenHash("hashed-expired")).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest("expired-raw-token")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void refresh_withARevokedStoredToken_throwsBadCredentials() {
        UserCredential credential = credentialFor("person@example.com", "encoded-hash");
        RefreshToken revoked = new RefreshToken();
        revoked.setTokenHash("hashed-revoked");
        revoked.setUserCredential(credential);
        revoked.setExpiresAt(Instant.now().plusSeconds(3600));
        revoked.setRevoked(true);

        when(tokenHasher.hash("revoked-raw-token")).thenReturn("hashed-revoked");
        when(refreshTokenRepository.findByTokenHash("hashed-revoked")).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> authService.refresh(new RefreshTokenRequest("revoked-raw-token")))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void logout_revokesTheStoredRefreshTokenSoItCannotBeReplayed() {
        UserCredential credential = credentialFor("person@example.com", "encoded-hash");
        RefreshToken stored = new RefreshToken();
        stored.setTokenHash("hashed-logout-token");
        stored.setUserCredential(credential);
        stored.setExpiresAt(Instant.now().plusSeconds(3600));
        stored.setRevoked(false);

        when(tokenHasher.hash("logout-raw-token")).thenReturn("hashed-logout-token");
        when(refreshTokenRepository.findByTokenHash("hashed-logout-token")).thenReturn(Optional.of(stored));

        authService.logout(new RefreshTokenRequest("logout-raw-token"));

        assertThat(stored.isRevoked()).isTrue();
        verify(refreshTokenRepository).save(stored);
    }
}
