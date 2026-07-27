package com.example.app.common.crypto;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.security.SecureRandom;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * EncryptedStringConverterInitializer exists because JPA AttributeConverters are
 * instantiated by the persistence provider, not Spring, so the encryption key can't
 * be constructor-injected — it's pushed in via a static setter at application
 * startup instead. This test bypasses Spring entirely and exercises that static
 * hook directly with a fixed test key.
 */
class EncryptedStringConverterTest {

    @BeforeAll
    static void initializeKeyProvider() {
        byte[] fixedTestKey = new byte[32];
        new SecureRandom(new byte[]{1, 2, 3, 4}).nextBytes(fixedTestKey); // deterministic seed, test-only
        EncryptedStringConverter.initialize(() -> fixedTestKey);
    }

    private final EncryptedStringConverter converter = new EncryptedStringConverter();

    @Test
    void roundTrip_encryptThenDecrypt_returnsTheOriginalValue() {
        String plaintext = "111-22-3333";

        String ciphertext = converter.convertToDatabaseColumn(plaintext);
        String decrypted = converter.convertToEntityAttribute(ciphertext);

        assertThat(decrypted).isEqualTo(plaintext);
    }

    @Test
    void convertToDatabaseColumn_neverStoresThePlaintextValue() {
        String plaintext = "sensitive-value";

        String ciphertext = converter.convertToDatabaseColumn(plaintext);

        assertThat(ciphertext).isNotEqualTo(plaintext);
        assertThat(ciphertext).doesNotContain(plaintext);
    }

    @Test
    void convertToDatabaseColumn_isNonDeterministic_soRepeatedValuesDontLeakPatterns() {
        String plaintext = "same-value-both-times";

        String first = converter.convertToDatabaseColumn(plaintext);
        String second = converter.convertToDatabaseColumn(plaintext);

        assertThat(first).isNotEqualTo(second);
        assertThat(converter.convertToEntityAttribute(first)).isEqualTo(plaintext);
        assertThat(converter.convertToEntityAttribute(second)).isEqualTo(plaintext);
    }

    @Test
    void nullAttribute_convertsToNullInBothDirections() {
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
    }
}
