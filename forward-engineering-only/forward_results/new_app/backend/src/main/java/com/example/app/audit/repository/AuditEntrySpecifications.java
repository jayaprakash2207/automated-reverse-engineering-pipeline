package com.example.app.audit.repository;

import com.example.app.audit.domain.AuditEntry;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

/**
 * Backs GET /audit-entries?entity_type=&entity_id= (11_API_CONTRACT_SPECIFICATION.md
 * §7.1). Both filters are optional so compliance review can browse the whole log or
 * scope down to one entity, via JPA Criteria -- no raw SQL, per Stack Mapping
 * Contract row 1.
 */
public final class AuditEntrySpecifications {

    private AuditEntrySpecifications() {
    }

    public static Specification<AuditEntry> withFilters(String entityType, String entityId) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (entityType != null && !entityType.isBlank()) {
                predicates.add(cb.equal(root.get("entityType"), entityType));
            }
            if (entityId != null && !entityId.isBlank()) {
                predicates.add(cb.equal(root.get("entityId"), entityId));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
