package com.example.app.audit.repository;

import com.example.app.audit.domain.AuditEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface AuditEntryRepository extends JpaRepository<AuditEntry, Long>, JpaSpecificationExecutor<AuditEntry> {
}
