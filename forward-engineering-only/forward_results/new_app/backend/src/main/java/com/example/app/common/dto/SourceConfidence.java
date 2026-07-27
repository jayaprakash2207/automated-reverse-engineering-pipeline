package com.example.app.common.dto;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §1: "Every response includes a
 * meta.source_confidence field ... inherited from the EKG node(s) backing the
 * endpoint ... a transitional scaffold -- remove it once OQ-003/OQ-004/OQ-006
 * are resolved." Introduced here (common/dto, cross-cutting) because the Leave
 * Management Context is the first sprint whose contract ties a concrete,
 * currently-unresolved value (DISC-002's null balance_after) to this field.
 */
public enum SourceConfidence {
    HIGH,
    MEDIUM,
    LOW
}
