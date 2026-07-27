package com.example.app.payroll.dto;

import com.example.app.common.dto.ResponseMeta;

/** See PayPeriodResponse -- same LOW source_confidence scaffold, per §4. */
public record PayrollRunResponse(PayrollRunDto payrollRun, ResponseMeta meta) {
}
