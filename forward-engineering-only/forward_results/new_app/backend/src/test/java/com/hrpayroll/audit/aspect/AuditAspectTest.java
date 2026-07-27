// Retired: see com/hrpayroll/audit/service/AuditLogServiceTest.java for why.
// The Stack Mapping Contract requires explicit, testable service-layer side
// effects rather than AOP/trigger-like implicit interception, so no
// AuditAspect equivalent is part of this sprint's design.

The audit backend deliverable for this sprint is otherwise already complete on disk (`com.example.app.audit.*`) and needs no further changes — the fix above only removes a non-compiling leftover from an earlier, abandoned design attempt.
