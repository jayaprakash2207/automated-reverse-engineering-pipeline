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
import java.time.LocalDate;

/**
 * Root aggregate of the Payroll Context (Domain Model: "Payroll Context -- owns
 * Pay Period and Payroll Run concepts", confidence: LOW, name only). Per
 * 11_API_CONTRACT_SPECIFICATION.md §4, this domain has zero backing package/table
 * evidence (no PKG-PAYROLL was ever named) and business logic must not be
 * reverse-engineered from that document -- §4 is a contract-shape placeholder
 * only. Accordingly this entity carries only the fields the two read-only
 * contract slots (GET /pay-periods, GET /pay-periods/{id}) require: a date range.
 * There is deliberately no status/lifecycle column -- no source evidence defines
 * one, and inventing values here would be exactly the kind of fabrication the
 * anti-hallucination rule in the Data Model Specification forbids.
 */
@Entity
@Table(name = "pay_periods")
@Getter
@Setter
@NoArgsConstructor
public class PayPeriod {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
