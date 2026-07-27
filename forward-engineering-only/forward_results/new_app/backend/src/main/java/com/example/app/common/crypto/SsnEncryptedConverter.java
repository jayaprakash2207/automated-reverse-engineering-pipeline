package com.example.app.common.crypto;

import jakarta.persistence.Converter;

/**
 * Column converter for Employee.ssnEncrypted. autoApply = false: applied
 * explicitly via @Convert on the entity field, per the alias-per-column guidance
 * in EncryptedStringConverter's class Javadoc — "ssn" is never reused for any
 * other sensitive column. Retires the hard-coded-key defect noted against SSN
 * storage in the Data Model Specification.
 */
@Converter(autoApply = false)
public class SsnEncryptedConverter extends EncryptedStringConverter {

    public SsnEncryptedConverter() {
        super("ssn");
    }
}
