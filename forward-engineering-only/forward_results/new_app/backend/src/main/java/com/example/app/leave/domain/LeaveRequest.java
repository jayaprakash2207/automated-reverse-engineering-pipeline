package com.example.app.leave.domain;

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
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Root aggregate of the Leave Management Context (Domain Model: "Leave
 * Management Context" -- LOW confidence boundary, no legacy table evidence;
 * this aggregate is greenfield construction against
 * 11_API_CONTRACT_SPECIFICATION.md §3). employeeId references the Employee
 * Management Context's aggregate root by id only (Customer/Supplier
 * relationship per the Context Map) -- deliberately not a JPA @ManyToOne, so
 * this context stays decoupled from Employee's object graph, mirroring how
 * AuditEntry references its subjects by plain id/string rather than by
 * relationship.
 *
 * <p>Every state transition (submit/cancel/approve/reject) is written
 * explicitly by LeaveRequestService inside a single @Transactional method that
 * also performs the corresponding audit write -- no trigger-equivalent side
 * effect exists on this table (Stack Mapping Contract row 1 / non-negotiable
 * #1).
 */
@Entity
@Table(name = "leave_requests")
@Getter
@Setter
@NoArgsConstructor
public class LeaveRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Column(name = "leave_type", nullable = false)
    private String leaveType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "reason")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LeaveRequestStatus status = LeaveRequestStatus.PENDING;

    @Column(name = "approver_comment")
    private String approverComment;

    @Column(name = "rejection_reason")
    private String rejectionReason;

    @Column(name = "decided_by")
    private String decidedBy;

    @Column(name = "decided_at")
    private Instant decidedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
