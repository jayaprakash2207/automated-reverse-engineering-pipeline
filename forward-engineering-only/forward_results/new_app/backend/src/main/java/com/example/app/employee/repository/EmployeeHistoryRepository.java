package com.example.app.employee.repository;

import com.example.app.employee.domain.EmployeeHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EmployeeHistoryRepository extends JpaRepository<EmployeeHistory, Long> {

    Page<EmployeeHistory> findByEmployeeIdOrderByChangedAtDesc(Long employeeId, Pageable pageable);
}
