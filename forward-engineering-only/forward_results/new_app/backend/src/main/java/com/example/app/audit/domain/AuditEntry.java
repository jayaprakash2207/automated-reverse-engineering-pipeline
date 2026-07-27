package com.example.app.audit.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

/**
 * Replaces PKG_AUDIT.log_action (Domain Model: cross-cutting, DISC-006). entityType
 * and entityId are plain strings, not JPA relationships, deliberately: this table
 * is written from multiple bounded contexts (Employee Management, Security/Identity,
 * and future Leave/Payroll/Performance callers) that do not share a schema with each
 * other or with this one. No trigger writes to this table -- AuditService.logAction
 * is the only writer, called explicitly from inside the caller's own transaction.
 */
@Entity
@Table(name = "audit_entries")
@Getter
@Setter
@NoArgsConstructor
public class AuditEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private String entityId;

    @Column(name = "action", nullable = false)
    private String action;

    @Column(name = "performed_by", nullable = false)
    private String performedBy;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false)
    private AuditOutcome outcome;

    @Column(name = "details")
    private String details;

    @CreationTimestamp
    @Column(name = "occurred_at", nullable = false, updatable = false)
    private Instant occurredAt;
}
