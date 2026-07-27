-- Action Audit Logging (cross-cutting). Direct replacement for PKG_AUDIT.log_action,
-- which DISC-006 confirms swallows constraint-violation errors internally, so its
-- callers (Security, Employee lifecycle) "succeed silently" with no audit trail.
-- No trigger writes to this table: AuditService.logAction (Propagation.MANDATORY)
-- writes here explicitly, inside the same transaction as the action it records, so
-- a write failure here rolls back that action instead of being swallowed
-- (Stack Mapping Contract row 10 / non-negotiable #4).
--
-- entity_type/entity_id are plain strings rather than a foreign key: this table is
-- written from multiple bounded contexts (Employee Management, Security/Identity,
-- and future Leave/Payroll/Performance callers) that do not share a schema.

CREATE TABLE audit_entries (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    details VARCHAR(1000),
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_audit_entries_outcome CHECK (outcome IN ('SUCCESS', 'FAILURE'))
);

CREATE INDEX idx_audit_entries_entity ON audit_entries (entity_type, entity_id);
CREATE INDEX idx_audit_entries_occurred_at ON audit_entries (occurred_at);
