-- Payroll Context (Domain Model: "Payroll Context -- owns Pay Period and Payroll
-- Run concepts", confidence: LOW, name only -- no PKG-PAYROLL or table evidence
-- was ever provided for this domain, unlike Employee/Leave). Per
-- 11_API_CONTRACT_SPECIFICATION.md §4: "Do not implement business logic for this
-- domain from this document. Treat §4 as a placeholder contract shape only,
-- pending a full re-ingestion of BR-01..32 (OQ-003) and the remaining 28 tables
-- (OQ-006), at least one of which almost certainly defines payroll calculation."
--
-- Column lists below are therefore deliberately minimal: no gross/net pay,
-- deductions, tax withholding, or per-employee line items exist yet, because none
-- of BR-01..32's payroll rule content has been re-ingested. There is also no
-- status/lifecycle column on payroll_runs -- with no calculation to perform, there
-- is nothing for a run to transition through; a run row records only that it was
-- initiated, for a given pay period, by a given actor.
--
-- payroll_runs.pay_period_id is a plain FK, not further denormalized -- consistent
-- with employee_id on leave_requests: aggregate roots reference each other by id
-- rather than by JPA object graph.

CREATE TABLE pay_periods (
    id BIGSERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_pay_periods_date_range CHECK (end_date >= start_date)
);

CREATE INDEX idx_pay_periods_start_date ON pay_periods (start_date);

CREATE TABLE payroll_runs (
    id BIGSERIAL PRIMARY KEY,
    pay_period_id BIGINT NOT NULL REFERENCES pay_periods (id),
    initiated_by VARCHAR(255) NOT NULL,
    initiated_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payroll_runs_pay_period_id ON payroll_runs (pay_period_id);
