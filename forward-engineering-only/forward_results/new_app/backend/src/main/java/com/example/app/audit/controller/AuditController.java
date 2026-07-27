package com.example.app.audit.controller;

import com.example.app.audit.dto.AuditEntryDto;
import com.example.app.audit.service.AuditService;
import com.example.app.common.dto.PageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §7.1. No business logic here -- AuditService
 * owns the access rule (ADMIN or AUDIT_REVIEWER) and the query shape (Stack
 * Mapping Contract row 3).
 */
@RestController
@RequestMapping("/api/v1/audit-entries")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<PageResponse<AuditEntryDto>> search(
            @RequestParam(name = "entity_type", required = false) String entityType,
            @RequestParam(name = "entity_id", required = false) String entityId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(auditService.search(entityType, entityId, cursor, limit));
    }
}
