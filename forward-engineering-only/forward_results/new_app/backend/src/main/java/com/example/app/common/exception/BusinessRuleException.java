package com.example.app.common.exception;

public class BusinessRuleException extends ApplicationException {

    public BusinessRuleException(String message) {
        super("BUSINESS_RULE_VIOLATION", message);
    }
}
