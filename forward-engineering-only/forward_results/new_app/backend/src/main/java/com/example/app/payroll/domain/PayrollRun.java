package com.example.app.payroll.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Second aggregate root of the Payroll Context (Domain Model: "owns Pay Period
 * and Payroll Run concepts"). payPeriodId references PayPeriod by plain id, not a
 * JPA relationship, mirroring how LeaveRequest.employeeId references the Employee
 * Management Context's aggregate root -- these are two distinct aggregate roots
 * within the same bounded context, not one object graph.
 *
 * <p>Per 11_API_CONTRACT_SPECIFICATION.md §4 ("Do not implement business logic for
 * this domain ... Treat §4 as a placeholder contract shape only"), this entity
 * intentionally has no calculation fields (gross/net pay, deductions, withholding)
 * and no status column: actual payroll computation is out of scope pending
 * BR-01..32 re-ingestion (OQ-003) and the remaining 28-table schema (OQ-006), at
 * least one of which almost certainly defines it. A row here records only that a
 * run was initiated, for which pay period, by whom, and when -- the minimum shape
 * implied by POST /payroll-runs and GET /payroll-runs/{id}. The Employee Management
 * Context's Customer/Supplier relationship to Payroll (Context Map) is not yet
 * modeled as a field on this entity: no per-employee payroll line-item concept has
 * any evidence, so employee_id does not belong on a run-level aggregate root.
 */
@Entity
@Table(name = "payroll_runs")
@Getter
@Setter
@NoArgsConstructor
public class PayrollRun {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "pay_period_id", nullable = false)
    private Long payPeriodId;

    @Column(name = "initiated_by", nullable = false)
    private String initiatedBy;

    @Column(name = "initiated_at", nullable = false)
    private Instant initiatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
