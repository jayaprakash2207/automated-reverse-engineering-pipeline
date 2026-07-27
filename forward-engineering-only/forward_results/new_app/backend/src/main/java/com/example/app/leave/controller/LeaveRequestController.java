package com.example.app.leave.controller;

import com.example.app.common.dto.PageResponse;
import com.example.app.leave.dto.ApproveLeaveRequestRequest;
import com.example.app.leave.dto.CreateLeaveRequestRequest;
import com.example.app.leave.dto.LeaveRequestActionResponse;
import com.example.app.leave.dto.LeaveRequestCancelResponse;
import com.example.app.leave.dto.LeaveRequestDto;
import com.example.app.leave.dto.LeaveRequestSubmittedResponse;
import com.example.app.leave.dto.RejectLeaveRequestRequest;
import com.example.app.leave.service.LeaveRequestService;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §3. No business logic lives here -- every
 * method delegates to LeaveRequestService (Stack Mapping Contract row 3).
 * Idempotency-Key is required on every mutating endpoint per §1, same
 * presence-only convention EmployeeController uses (no dedup store exists yet
 * as cross-cutting infrastructure).
 */
@RestController
@RequestMapping("/api/v1/leave-requests")
@RequiredArgsConstructor
public class LeaveRequestController {

    private final LeaveRequestService leaveRequestService;

    @PostMapping
    public ResponseEntity<LeaveRequestSubmittedResponse> submit(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @Valid @RequestBody CreateLeaveRequestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leaveRequestService.submit(request.employeeId(), request));
    }

    @PostMapping("/{leaveRequestId}/cancel")
    public ResponseEntity<LeaveRequestCancelResponse> cancel(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @PathVariable Long leaveRequestId) {
        return ResponseEntity.ok(leaveRequestService.cancel(leaveRequestId));
    }

    @PostMapping("/{leaveRequestId}/approve")
    public ResponseEntity<LeaveRequestActionResponse> approve(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @PathVariable Long leaveRequestId,
            @RequestBody(required = false) ApproveLeaveRequestRequest request) {
        return ResponseEntity.ok(leaveRequestService.approve(leaveRequestId, request != null ? request : ApproveLeaveRequestRequest.empty()));
    }

    @PostMapping("/{leaveRequestId}/reject")
    public ResponseEntity<LeaveRequestActionResponse> reject(
            @RequestHeader("Idempotency-Key") String idempotencyKey,
            @PathVariable Long leaveRequestId,
            @Valid @RequestBody RejectLeaveRequestRequest request) {
        return ResponseEntity.ok(leaveRequestService.reject(leaveRequestId, request));
    }

    @GetMapping
    public ResponseEntity<PageResponse<LeaveRequestDto>> listForManager(
            @RequestParam(name = "manager_id", required = false) Long managerId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String cursor,
            @RequestParam(required = false) Integer limit) {
        return ResponseEntity.ok(leaveRequestService.listForManager(managerId, status, cursor, limit));
    }
}
