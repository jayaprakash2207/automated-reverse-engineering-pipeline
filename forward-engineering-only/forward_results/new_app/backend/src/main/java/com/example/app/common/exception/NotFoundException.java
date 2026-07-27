package com.example.app.common.exception;

public class NotFoundException extends ApplicationException {

    public NotFoundException(String message) {
        super("NOT_FOUND", message);
    }
}
