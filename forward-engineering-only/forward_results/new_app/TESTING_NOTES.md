```markdown
# Test Coverage Notes — Employee Management Sprint

This file documents what this test pass covers, and — following the same
"state the gap, don't fabricate" approach used elsewhere in this sprint's
source docs (e.g. DISC-001/DISC-002, the Security/Identity `[WinError 2]`
issue) — what it explicitly does **not** cover and why.

## Covered in this pass

Only files that were delivered with real implementation content in this
sprint's file list were tested. All are frontend `shared/`/`features/auth`
modules; no backend Java source was delivered with content this sprint
(see below).

| Source file | Test file | What's covered |
|---|---|---|
| `frontend/src/shared/auth/jwt.ts` | `jwt.test.ts` | decode of well-formed/malformed/non-JSON tokens, `-`/`_` base64url handling, `isExpired` boundary at `exp === now` |
| `frontend/src/shared/auth/tokenStorage.ts` | `tokenStorage.test.ts` | get/set/clear round-trip, correct storage key, sessionStorage-not-localStorage, idempotent clear |
| `frontend/src/shared/api/apiError.ts` | `apiError.test.ts` | full `classifyStatus` mapping table incl. unmapped-status fallback to `SYSTEM`, `ApiError` defaulting and full-body population |
| `frontend/src/shared/api/actionState.ts` | `actionState.test.ts` | `idleActionState` shape |
| `frontend/src/shared/api/httpClient.ts` | `httpClient.test.ts` | auth header attach/omit, JSON body serialization, query-param building (incl. skipping `undefined`/`''`), 204 short-circuit, error-to-`ApiError` mapping (with and without a JSON error body), status→kind classification (401/409/500) |
| `frontend/src/features/auth/api/authApi.ts` | `authApi.test.ts` | request shape sent to `/auth/login`, no extra fields beyond email/password (guards against reintroducing the email-only `PKG_SECURITY.authenticate` bypass — BRD §4, UC-01), error propagation |
| `frontend/src/shared/auth/AuthContext.tsx` + `useAuth.ts` | `AuthContext.test.tsx` | initial state from stored token (valid / expired / malformed), successful login populates user+roles and persists token, failed login (401) leaves state anonymous and stores nothing, logout clears state and storage, `hasRole` true/false |

These double as a partial end-to-end check of the auth flow: a fake JWT is
round-tripped through `authApi` → `AuthContext` → `tokenStorage` → `jwt`
exactly as the real login flow would, with `fetch`/`login` mocked at the
outermost boundary only.

## Not covered — no implementation was provided this sprint

The sprint's file list named the following files but their content was
`[File does not exist yet]`. Per the same policy applied to the
Security/Identity `[WinError 2]` issue (environment/pipeline gap, not
something to paper over with invented code), **no tests were written against
guessed implementations of these files** — doing so would validate an
imagined API surface rather than the real one, and would silently pass or
fail for reasons unrelated to the actual code once it lands.

### Backend (Java / Spring Boot) — entirely unimplemented this sprint
- `SecurityConfig`, `JwtAuthenticationFilter`, `AuthenticatedUser` — no way to test JWT validation, `@PreAuthorize` role enforcement, or the 401/403 contract without these.
- `Employee`, `EmployeeStatus`, `ChangeType`, `EmployeeHistory` (domain) and all `employee/dto/*` — no entity/DTO shapes to construct fixtures against.
- `EmployeeRepository`, `EmployeeHistoryRepository`, `EmployeeSpecifications` — no repository to run `@DataJpaTest` slices against.
- `EmployeeService`, `HireDatePolicy`, `DefaultHireDatePolicy`, `HireDatePolicyProperties` — **this is where BR-hire-date-drift (DISC-001) must be tested once implemented.** `application.yml` already externalizes the threshold via `HIRE_DATE_THRESHOLD_DAYS` (default `90`, the more conservative of the two disputed values, per its own comment) specifically so this isn't hard-coded — the eventual `DefaultHireDatePolicyTest` must parameterize over the threshold rather than assuming 90 or 180, and assert boundary behavior at exactly `threshold-days` since one-off errors here directly re-implement a disputed business rule.
- `EmployeeController` — no controller to run `@WebMvcTest`/`MockMvc` or full `@SpringBootTest` + `TestRestTemplate` integration tests against for CRUD, pagination, validation-error shape, or the transfer/promote/terminate/rehire lifecycle actions called out in UC-02 (which historically fail with `ORA-00904`/`ORA-02290` against Oracle — the Postgres migration's `V1.3__create_employees.sql` and history-insert path need a dedicated regression test once both exist, asserting the four lifecycle actions succeed and write exactly one `EmployeeHistory` row each).
- `SsnEncryptedConverter` — no converter to test PII-at-rest encryption/decryption round-trip against.
- `GlobalExceptionHandler`, `ConflictException`, `PageMeta`, `PageResponse` — no exception mapping or pagination envelope to assert the wire shape (`error_code`/`trace_id`/`field_errors`) that the frontend's `apiError.ts` already assumes.
- `V1.3__create_employees.sql` — no migration to run under Flyway/Testcontainers for a schema-validation test.
- The sprint's own planned test files (`EmployeeControllerIntegrationTest`, `EmployeeServiceTest`, `DefaultHireDatePolicyTest`) were listed but also had no content — they still need to be authored against the real classes once written, covering at minimum: JWT-required 401 on every `/employees/**` route, role-gated 403 for lifecycle actions, the hire-date threshold boundary, and the four lifecycle transitions each producing exactly one history record.

### Frontend (React / TypeScript) — unimplemented this sprint
- `employeeApi.ts`, `employeeApiTypes.ts`, `mappers.ts`, `types/employee.ts`, `utils/validation.ts` — no employee wire/domain types or snake_case→camelCase mapping to test.
- `EmployeeListPage`, `EmployeeTable`, `EmployeeSearchBar`, `StatusBadge`, `Pagination`, `EmployeeDetailPage`, `EmployeeHistoryTimeline`, `CreateEmployeePage`, `CreateEmployeeForm`, `EmployeeLifecycleActionModal` — no components to render. Once present, `EmployeeLifecycleActionModal.test.tsx` in particular must assert the three-state contract (`success` / `validation_error` / `system_error`, Doc 20 §3) for all four lifecycle actions, and `EmployeeListPage.test.tsx` must cover search, pagination, and empty/error states.
- `LoginPage.tsx` — no login screen to test. Once implemented, `LoginPage.test.tsx` must cover: valid login redirect, 401-invalid-credentials messaging distinct from account-lockout messaging (Doc 20 §4), and that no email-only submission path exists (the `authApi.test.ts` in this pass already locks the *request shape* to `{email, password}` only — the page-level test still needs to confirm the UI actually requires both fields).
- `ActionResultBanner.tsx`, `LoadingSpinner.tsx`, `ProtectedRoute.tsx` — no shared components to test; `ProtectedRoute.test.tsx` in particular should assert unauthenticated users are redirected to `/login` rather than reaching any `/employees/**` route.

### Explicitly out of scope for this bounded context (not gaps, by design)
- Manager leave-approval (UC-04) — does not exist anywhere in the system per the BRD; not part of the Employee Management context.
- Pay Period / Payroll Run / Review Cycle / Individual Review (UC-05+) — stubbed pending the full BA report, not built this sprint.

## End-to-end (browser) tests
No Cypress/Playwright config exists in this sprint's `frontend/package.json`
(only Jest + RTL). The `AuthContext.test.tsx` suite above is the closest
approximation available today — it exercises the full login→token→auth-state
chain in-process. A true browser-driven E2E suite (login → employee list →
create → lifecycle action) should be added once the employee feature
components exist and a browser test runner is selected.
```
