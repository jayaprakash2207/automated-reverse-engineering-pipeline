package com.example.app.payroll.dto;

import com.example.app.common.dto.ResponseMeta;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §4: "meta.source_confidence: LOW on all payroll
 * endpoints" -- unlike Employee/Leave, every Payroll endpoint is explicitly called
 * out as LOW confidence, so the single-resource GET surfaces the ResponseMeta
 * scaffold (§1) unconditionally rather than only on endpoints with an unresolved
 * business-rule dependency.
 */
public record PayPeriodResponse(PayPeriodDto payPeriod, ResponseMeta meta) {
}
