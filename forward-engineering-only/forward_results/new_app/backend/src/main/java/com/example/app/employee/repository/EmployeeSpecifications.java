package com.example.app.employee.repository;

import com.example.app.employee.domain.Employee;
import com.example.app.employee.domain.EmployeeStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Backs GET /employees' department/job_role/status/hired_after/hired_before
 * filters (11_API_CONTRACT_SPECIFICATION.md §2.1) via JPA Criteria — no raw SQL,
 * per Stack Mapping Contract row 1.
 */
public final class EmployeeSpecifications {

    private EmployeeSpecifications() {
    }

    public static Specification<Employee> withFilters(String department, String jobRole, EmployeeStatus status,
                                                        LocalDate hiredAfter, LocalDate hiredBefore) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (department != null && !department.isBlank()) {
                predicates.add(cb.equal(root.get("department"), department));
            }
            if (jobRole != null && !jobRole.isBlank()) {
                predicates.add(cb.equal(root.get("jobRole"), jobRole));
            }
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (hiredAfter != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("hireDate"), hiredAfter));
            }
            if (hiredBefore != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("hireDate"), hiredBefore));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
