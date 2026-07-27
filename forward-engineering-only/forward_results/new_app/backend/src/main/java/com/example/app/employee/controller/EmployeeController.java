package com.example.app.employee.controller;

import com.example.app.common.dto.PageResponse;
import com.example.app.employee.dto.CreateEmployeeRequest;
import com.example.app.employee.dto.EmployeeDto;
import com.example.app.employee.dto.EmployeeHistoryDto;
import com.example.app.employee.dto.UpdateEmployeeRequest;
import com.example.app.employee.dto.UpdateEmployeeResponse;
import com.example.app.employee.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §2. No business logic lives here — every
 * method delegates to EmployeeService, which owns the aggregate and its
 * invariants (Stack Mapping Contract row 3). Idempotency-Key is required on
 * every mutating endpoint per §1; full request-deduplication storage is
 * cross-cutting infrastructure not yet built by any sprint, so this contract's
 * header requirement is enforced here without inventing that store.
 */
@RestController
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService employeeService;

    @GetMapping
    public ResponseEntity<PageResponse<EmployeeDto>> list(
            @RequestParam(required = false) String department,
            @RequestParam(name = "job_role", required = false) String jobRole,
            @RequestParam(required = false) String status,
            @RequestParam(name = "hired_after", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hiredAfter,
            @RequestParam(name = "hired_before", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hiredBefore,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(employeeService.list(department, jobRole, status, hiredAfter, hiredBefore, cursor, limit));
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<EmployeeDto> getById(@PathVariable Long employeeId) {
        return ResponseEntity.ok(employeeService.getById(employeeId));
    }

    @PostMapping
    public ResponseEntity<EmployeeDto> hire(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateEmployeeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(employeeService.hire(request));
    }

    @PatchMapping("/{employeeId}")
    public ResponseEntity<UpdateEmployeeResponse> updateProfile(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @PathVariable Long employeeId,
            @Valid @RequestBody UpdateEmployeeRequest request) {
        return ResponseEntity.ok(employeeService.updateProfile(employeeId, request));
    }

    @GetMapping("/{employeeId}/history")
    public ResponseEntity<PageResponse<EmployeeHistoryDto>> getHistory(
            @PathVariable Long employeeId,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(employeeService.getHistory(employeeId, cursor, limit));
    }

    @PostMapping("/{employeeId}/terminate")
    public ResponseEntity<EmployeeDto> terminate(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @PathVariable Long employeeId) {
        return ResponseEntity.ok(employeeService.terminate(employeeId));
    }

    @PostMapping("/{employeeId}/rehire")
    public ResponseEntity<EmployeeDto> rehire(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @PathVariable Long employeeId) {
        return ResponseEntity.ok(employeeService.rehire(employeeId));
    }
}
