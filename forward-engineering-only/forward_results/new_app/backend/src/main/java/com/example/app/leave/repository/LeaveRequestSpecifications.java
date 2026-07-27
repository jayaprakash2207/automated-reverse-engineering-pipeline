package com.example.app.leave.repository;

import com.example.app.leave.domain.LeaveRequest;
import com.example.app.leave.domain.LeaveRequestStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Backs GET /leave-requests' status filter (11_API_CONTRACT_SPECIFICATION.md
 * §3.5). There is deliberately no manager_id predicate here: the manager-of-
 * employee relationship is confirmed MISSING from the schema (OQ-006), so this
 * specification cannot scope by "requests belonging to this manager's
 * reports" -- see LeaveRequestService#listForManager for how that gap is
 * handled at the authorization layer instead of the query layer.
 */
public final class LeaveRequestSpecifications {

    private LeaveRequestSpecifications() {
    }

    public static Specification<LeaveRequest> withFilters(LeaveRequestStatus status) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
