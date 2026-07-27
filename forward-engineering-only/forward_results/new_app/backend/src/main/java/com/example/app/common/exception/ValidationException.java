package com.example.app.common.exception;

import java.util.List;

public class ValidationException extends ApplicationException {

    private final List<ErrorDetail> details;

    public ValidationException(String message) {
        super("VALIDATION_ERROR", message);
        this.details = List.of();
    }

    public ValidationException(String message, List<ErrorDetail> details) {
        super("VALIDATION_ERROR", message);
        this.details = details == null ? List.of() : details;
    }

    public List<ErrorDetail> getDetails() {
        return details;
    }
}
