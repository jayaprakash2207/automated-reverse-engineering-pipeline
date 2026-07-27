package com.example.app.security.controller;

import com.example.app.security.domain.Role;
import com.example.app.security.domain.UserCredential;
import com.example.app.security.repository.UserCredentialRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * End-to-end coverage of the identity flow through the real Spring Security filter
 * chain and a real Postgres instance (Testcontainers). Depends on this sprint's
 * Flyway migrations (V1.1__create_user_credentials.sql, V1.2__create_refresh_tokens.sql)
 * and the security.* classes listed for this sprint being present.
 *
 * Two contract facts drive the access-control assertions here, both taken directly
 * from the already-committed frontend contract (features/auth/api/authApi.ts):
 *  - login and refresh are called with { skipAuth: true } → must be reachable with no
 *    Authorization header.
 *  - logout is called WITHOUT skipAuth → httpClient attaches a Bearer token, so the
 *    endpoint must require authentication.
 */
@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
class AuthControllerIntegrationTest {

    @Container
    static PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("appdb")
            .withUsername("appuser")
            .withPassword("apppassword");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("app.security.jwt.secret",
                () -> "integration-test-signing-secret-at-least-256-bits-long-0123456789");
    }

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserCredentialRepository userCredentialRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final String EMAIL = "person@example.com";
    private static final String PASSWORD = "correct horse battery staple";

    @BeforeEach
    void seedCredential() {
        userCredentialRepository.deleteAll();
        UserCredential credential = new UserCredential();
        credential.setEmail(EMAIL);
        credential.setPasswordHash(passwordEncoder.encode(PASSWORD));
        credential.setRoles(Set.of(Role.EMPLOYEE));
        userCredentialRepository.save(credential);
    }

    @Test
    void login_withCorrectCredentials_returnsTokensInTheSnakeCaseContractShape() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginBody(EMAIL, PASSWORD))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty())
                .andExpect(jsonPath("$.refresh_token").isNotEmpty())
                .andExpect(jsonPath("$.token_type").value("Bearer"))
                .andExpect(jsonPath("$.expires_in").isNumber());
    }

    @Test
    void login_withWrongPassword_returns401WithTheErrorEnvelopeShape() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginBody(EMAIL, "wrong-password"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error_code").isNotEmpty())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.trace_id").isNotEmpty());
    }

    @Test
    void login_withAnUnknownEmail_returnsTheSameGenericUnauthorizedResponse() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginBody("nobody@example.com", "anything"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error_code").isNotEmpty());
    }

    @Test
    void login_withMissingFields_returns400WithFieldValidationErrors() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    void loginThenRefresh_issuesAWorkingNewAccessToken() throws Exception {
        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginBody(EMAIL, PASSWORD))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String refreshToken = objectMapper.readTree(loginBody).get("refresh_token").asText();

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new RefreshBody(refreshToken))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.access_token").isNotEmpty());
    }

    @Test
    void refresh_withAGarbageToken_returns401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new RefreshBody("not-a-real-token"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_withoutAnAuthorizationHeader_isRejected() throws Exception {
        // authApi.ts calls logout WITHOUT skipAuth: true, unlike login/refresh — the
        // endpoint must require a bearer token.
        mockMvc.perform(post("/api/v1/auth/logout")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new RefreshBody("some-refresh-token"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_withAValidAccessToken_revokesTheRefreshTokenSoItCannotBeReusedAfterward() throws Exception {
        String loginBody = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new LoginBody(EMAIL, PASSWORD))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String accessToken = objectMapper.readTree(loginBody).get("access_token").asText();
        String refreshToken = objectMapper.readTree(loginBody).get("refresh_token").asText();

        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new RefreshBody(refreshToken))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new RefreshBody(refreshToken))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logout_withAMalformedBearerToken_isRejectedRatherThanReachingTheController() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer this.is.not.a.valid.jwt")
                        .contentType("application/json")
                        .content(objectMapper.writeValueAsString(new RefreshBody("irrelevant"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void actuatorHealth_isReachableWithoutAuthentication_forLivenessProbes() throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/actuator/health"))
                .andExpect(status().isOk());
    }

    private record LoginBody(String email, String password) {
    }

    private record RefreshBody(String refresh_token) {
    }
}
