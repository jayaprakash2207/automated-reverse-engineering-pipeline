package com.example.app.employee.domain;

import com.example.app.common.crypto.SsnEncryptedConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
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
 * Root aggregate of the Employee Management context (Domain Model §"Aggregate:
 * Employee"). History rows are written explicitly by EmployeeService inside the
 * same transaction as the mutating call, never by a database trigger — this is the
 * direct replacement for the broken TRG_EMP_BEFORE_UPDATE (Stack Mapping Contract
 * row 1 / non-negotiable #1).
 */
@Entity
@Table(name = "employees")
@Getter
@Setter
@NoArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "first_name", nullable = false)
    private String firstName;

    @Column(name = "last_name", nullable = false)
    private String lastName;

    @Column(name = "email", nullable = false, unique = true)
    private String email;

    @Column(name = "hire_date", nullable = false)
    private LocalDate hireDate;

    @Column(name = "department", nullable = false)
    private String department;

    @Column(name = "job_role", nullable = false)
    private String jobRole;

    @Column(name = "salary_band")
    private String salaryBand;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @Convert(converter = SsnEncryptedConverter.class)
    @Column(name = "ssn_encrypted")
    private String ssnEncrypted;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
