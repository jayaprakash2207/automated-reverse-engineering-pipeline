CREATE TABLE user_credentials (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_credentials_employee_id UNIQUE (employee_id),
    CONSTRAINT uq_user_credentials_email UNIQUE (email)
);

CREATE INDEX idx_user_credentials_email ON user_credentials (email);

-- No triggers: history/derived-field side effects belong in the service layer, in the same
-- transaction as the mutating operation (Stack Mapping Contract row 1, non-negotiable #1).
CREATE TABLE user_credential_roles (
    user_credential_id BIGINT NOT NULL REFERENCES user_credentials (id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    CONSTRAINT pk_user_credential_roles PRIMARY KEY (user_credential_id, role)
);

---

**Known issue not fixed in this sprint** — `backend/src/test/java/com/example/app/security/service/AuthServiceTest.java` and `.../security/service/JwtTokenServiceTest.java` (Security/Identity Context) reference method/constructor shapes that don't exist on the actual `AuthService`/`JwtTokenService`/`AuthenticatedUser`/`RefreshToken` classes (e.g. `generateOpaqueRefreshToken()`, a 3-arg `AuthenticatedUser` constructor, `RefreshToken.setUserCredential(...)`, `Claims`-returning `parseAccessToken`). These predate this sprint and are unrelated to audit logging — fixing them means rewriting another context's test expectations against its own service, which is Security/Identity Context sprint work, not a mechanical fix. Flag for that context; `mvn test` will not go fully green until it's addressed.

**Summary of what changed:**
- **`AuthService`**: wired to `AuditService` (the sprint's other named caller, previously unwired) — logs `LOGIN_SUCCESS`/`LOGIN_FAILURE`/`LOGIN_BLOCKED`/`TOKEN_REFRESH`/`TOKEN_REFRESH_FAILURE`/`LOGOUT`. Added `noRollbackFor = AccessDeniedException.class`, which also fixes a real pre-existing bug: without it, the failed-login-attempt counter was silently rolled back on every failed attempt, so account lockout never actually engaged.
- **`Role`**: added missing `ADMIN` constant — every `hasRole('ADMIN')`/`hasAnyRole('ADMIN', ...)` check across Employee, Payroll, Leave, and this sprint's own `AuditService` compliance endpoint was unsatisfiable without it.
- **`common/exception/*`**: stripped leaked markdown fences so `GlobalExceptionHandler` (which maps `AuditWriteFailedException` → 500 `AUDIT_WRITE_FAILED`) actually compiles.
- **`AuditControllerIntegrationTest.java`**: removed narrative text that had leaked past the closing brace into the compiled source.
- **~35 Security/Leave/common files**: mechanical-only fence/marker strip, no logic changes, needed because Java compiles the whole module together — one broken file blocks every test, including this sprint's own.
