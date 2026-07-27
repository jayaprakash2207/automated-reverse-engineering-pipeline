package com.example.app.common.dto;

/**
 * 11_API_CONTRACT_SPECIFICATION.md §1 standard list envelope. total is nullable in
 * the contract's general case (28 of 30 legacy tables unconfirmed, OQ-006);
 * Employee endpoints populate it since employees/employee_history are the two
 * HIGH-confidence tables and counting them is cheap.
 */
public record PageMeta(String cursor, int limit, Integer total) {
}
