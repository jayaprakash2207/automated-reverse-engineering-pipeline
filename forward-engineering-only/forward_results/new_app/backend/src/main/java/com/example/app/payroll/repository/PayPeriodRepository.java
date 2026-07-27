package com.example.app.payroll.repository;

import com.example.app.payroll.domain.PayPeriod;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayPeriodRepository extends JpaRepository<PayPeriod, Long> {
}
