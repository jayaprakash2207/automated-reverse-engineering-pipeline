package com.example.app.employee.domain;

/**
 * Change types implied by the transfer/promote/terminate/rehire lifecycle
 * operations named in the API contract (§2.4, §2.7), plus SALARY_CHANGE and HIRE
 * to cover the remaining fields the PATCH body and the initial hire can affect.
 */
public enum ChangeType {
    HIRE,
    TRANSFER,
    PROMOTION,
    SALARY_CHANGE,
    TERMINATION,
    REHIRE
}
