package com.example.app.employee.domain;

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
 * Child entity of the Employee aggregate (TBL-EMPLOYEE_HISTORY). Rows are inserted
 * explicitly by EmployeeService in the same @Transactional boundary as the change
 * they record (11_API_CONTRACT_SPECIFICATION.md §2.4 [REMEDIATED] note) — this
 * table has no trigger writing to it, unlike the legacy TRG_EMP_BEFORE_UPDATE.
 */
@Entity
@Table(name = "employee_history")
@Getter
@Setter
@NoArgsConstructor
public class EmployeeHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "employee_id", nullable = false)
    private Long employeeId;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_type", nullable = false)
    private ChangeType changeType;

    @Column(name = "old_value")
    private String oldValue;

    @Column(name = "new_value")
    private String newValue;

    @Column(name = "changed_by", nullable = false)
    private String changedBy;

    @CreationTimestamp
    @Column(name = "changed_at", nullable = false, updatable = false)
    private Instant changedAt;
}
