package com.example.app.payroll.repository;

import com.example.app.payroll.domain.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, Long> {
}
