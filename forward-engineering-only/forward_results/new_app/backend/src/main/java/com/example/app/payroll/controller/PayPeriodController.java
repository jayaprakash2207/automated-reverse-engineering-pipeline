package com.example.app.payroll.controller;

import com.example.app.common.dto.PageResponse;
import com.example.app.payroll.dto.PayPeriodDto;
import com.example.app.payroll.dto.PayPeriodResponse;
import com.example.app.payroll.service.PayPeriodService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §4. Read-only contract slots only -- no
 * business logic lives here (Stack Mapping Contract row 3); every method
 * delegates to PayPeriodService.
 */
@RestController
@RequestMapping("/api/v1/pay-periods")
@RequiredArgsConstructor
public class PayPeriodController {

    private final PayPeriodService payPeriodService;

    @GetMapping
    public ResponseEntity<PageResponse<PayPeriodDto>> list(
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(payPeriodService.list(cursor, limit));
    }

    @GetMapping("/{payPeriodId}")
    public ResponseEntity<PayPeriodResponse> getById(@PathVariable Long payPeriodId) {
        return ResponseEntity.ok(payPeriodService.getById(payPeriodId));
    }
}
