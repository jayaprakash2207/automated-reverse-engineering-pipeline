package com.example.app.common.exception;

/**
 * New failure class beyond the four named in the Stack Mapping Contract row 10 —
 * needed for 11_API_CONTRACT_SPECIFICATION.md §2.3's 409 on duplicate email, which
 * is a security-load-bearing uniqueness constraint (email is the auth lookup key),
 * not merely a data-quality one.
 */
public class ConflictException extends ApplicationException {

    public ConflictException(String errorCode, String message) {
        super(errorCode, message);
    }
}
