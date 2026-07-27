# Leave Management sprint — test suite notes

## Scope
Tests target the leave-request submission flow (UC-03) and the manager
approve/reject flow (UC-04), which the BRD flags as the highest-severity
functional gap in the system prior to this sprint.

## Contracts assumed by these tests (implementation is pending)
Because the production files for this sprint did not exist yet at the time
these tests were written, the tests encode the expected contract so an
implementer can build directly against them (test-first):

- Backend: `LeaveRequest` domain entity exposes `submit(employeeId, managerId,
  leaveType, startDate, endDate, daysRequested, reason)` plus `approve()`,
  `reject(reason)`, `cancel()`, `isPending()`. State-machine violations throw
  `IllegalStateException`; a blank rejection reason throws
  `IllegalArgumentException`. A new `ManagerResolver` port
  (`com.example.app.leave.service.ManagerResolver#resolveManagerId`) is
  assumed as the anti-corruption-layer seam into the Employee Management
  Context for manager lookups — mock it rather than depending on that
  context's (currently broken per prior-sprint notes) lifecycle transactions.
- Backend integration tests run against H2 (Postgres compatibility mode)
  instead of Testcontainers, specifically to avoid the class of
  `[WinError 2] The system cannot find the file specified` environment
  failures called out from earlier sprints (attributed to Docker/tooling
  availability, not code defects).
- Frontend: every test mocks one layer below the unit under test
  (component -> hooks, hooks -> `leaveRequestApi`, `leaveRequestApi` ->
  `httpClient`) so that `httpClient.ts`'s `import.meta.env` access — valid
  under Vite at runtime but not natively understood by the Babel/Jest
  config in this repo — is never executed inside a test. This is a
  deliberate isolation choice, not a workaround for a bug in this sprint's
  own code.

## Known unresolved business rules NOT hard-coded as assertions
- DISC-001 (90 vs 180 day hire-date threshold) does not apply to leave
  submission/approval and is out of scope for this suite.
- DISC-002 (leave-balance formula) is unresolved per the BRD. The balance
  service tests pin down the *current placeholder* formula behavior
  (`DefaultLeaveBalanceServiceTest`) so a deliberate formula change shows up
  as an intentional diff in that file, not a silent regression discovered
  in production.
