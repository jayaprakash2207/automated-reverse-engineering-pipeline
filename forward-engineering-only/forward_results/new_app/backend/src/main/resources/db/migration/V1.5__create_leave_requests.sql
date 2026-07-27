```sql
-- Leave Management Context (Domain Model: "Leave Management Context", LOW
-- confidence boundary -- no legacy table evidence was ever provided for this
-- context; this schema is new construction driven entirely by
-- 11_API_CONTRACT_SPECIFICATION.md §3, not a port of any legacy table).
--
-- employee_id is a plain FK to employees(id) rather than a JPA-level
-- relationship in the entity: Leave Management consumes Employee master data
-- as a Customer/Supplier dependency (Context Map), it does not own or extend
-- the Employee aggregate. No trigger writes to this table -- LeaveRequestService
-- performs every state transition (submit/cancel/approve/reject) explicitly,
-- inside the same transaction as its audit_entries write (Stack Mapping
-- Contract row 1 / non-negotiable #1, and row 10 / non-negotiable #4).
--
-- approver_comment/rejection_reason/decided_by/decided_at are all nullable and
-- only populated once a manager acts (§3.3/§3.4) -- this is the gap-closure
-- capability the sprint exists to add; the legacy system had no equivalent
-- columns because it had no equivalent screen.

CREATE TABLE leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees (id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason VARCHAR(1000),
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    approver_comment VARCHAR(1000),
    rejection_reason VARCHAR(1000),
    decided_by VARCHAR(255),
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_leave_requests_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT chk_leave_requests_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_employee_id ON leave_requests (employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests (status);
```
