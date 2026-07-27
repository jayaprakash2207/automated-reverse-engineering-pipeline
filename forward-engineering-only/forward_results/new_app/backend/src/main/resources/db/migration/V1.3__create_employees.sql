-- Employee Management Context aggregate (Domain Model: "Aggregate: Employee").
-- Replaces the legacy EMPLOYEES / EMPLOYEE_HISTORY pair. No triggers: history rows
-- are written explicitly by EmployeeService in the same transaction as the change
-- they record (Stack Mapping Contract row 1 / non-negotiable #1) -- this is the
-- direct fix for TRG_EMP_BEFORE_UPDATE's column-shape mismatch (TD-11) and CHECK
-- constraint violation (TD-12), which fired on every transfer/promote/terminate/
-- rehire in the legacy system.
--
-- Column list is intentionally minimal: 11_API_CONTRACT_SPECIFICATION.md §2.6
-- explicitly warns not to extend the Employee schema by guessing pending OQ-006
-- (28 of 30 legacy tables never re-ingested). Every column below is directly
-- evidenced by either the Data Model Specification (email, ssn, hire_date) or the
-- API contract's request/response bodies (first_name, last_name, department,
-- job_role, salary_band, status).

CREATE TABLE employees (
    id BIGSERIAL PRIMARY KEY,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    hire_date DATE NOT NULL,
    department VARCHAR(255) NOT NULL,
    job_role VARCHAR(255) NOT NULL,
    salary_band VARCHAR(50),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    ssn_encrypted VARCHAR(512),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_employees_email UNIQUE (email),
    CONSTRAINT chk_employees_status CHECK (status IN ('ACTIVE', 'TERMINATED', 'ON_LEAVE'))
);

CREATE INDEX idx_employees_department ON employees (department);
CREATE INDEX idx_employees_status ON employees (status);
CREATE INDEX idx_employees_hire_date ON employees (hire_date);

CREATE TABLE employee_history (
    id BIGSERIAL PRIMARY KEY,
    employee_id BIGINT NOT NULL REFERENCES employees (id),
    change_type VARCHAR(20) NOT NULL,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_employee_history_change_type
        CHECK (change_type IN ('HIRE', 'TRANSFER', 'PROMOTION', 'SALARY_CHANGE', 'TERMINATION', 'REHIRE'))
);

CREATE INDEX idx_employee_history_employee_id ON employee_history (employee_id);
