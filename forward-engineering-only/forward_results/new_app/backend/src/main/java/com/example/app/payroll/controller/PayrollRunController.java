package com.example.app.payroll.controller;

import com.example.app.payroll.dto.CreatePayrollRunRequest;
import com.example.app.payroll.dto.PayrollRunResponse;
import com.example.app.payroll.service.PayrollRunService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §4. Idempotency-Key is required on the
 * mutating endpoint per §1, same presence-only convention Employee/Leave use (no
 * dedup store exists yet as cross-cutting infrastructure).
 */
@RestController
@RequestMapping("/api/v1/payroll-runs")
@RequiredArgsConstructor
public class PayrollRunController {

    private final PayrollRunService payrollRunService;

    @PostMapping
    public ResponseEntity<PayrollRunResponse> initiate(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreatePayrollRunRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(payrollRunService.initiate(request));
    }

    @GetMapping("/{payrollRunId}")
    public ResponseEntity<PayrollRunResponse> getById(@PathVariable Long payrollRunId) {
        return ResponseEntity.ok(payrollRunService.getById(payrollRunId));
    }
}
