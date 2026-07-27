package com.example.app.common.exception;

public class AccessDeniedException extends ApplicationException {

    public AccessDeniedException(String message) {
        super("ACCESS_DENIED", message);
    }
}
