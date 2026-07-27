package com.example.app.common.crypto;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM column converter for sensitive attributes (e.g. SSN), replacing the hard-coded
 * AES key defect in {@code PKG_SECURITY}. The key is never held by this class directly - it is
 * resolved per-operation from an {@link EncryptionKeyProvider}. Stored values are tagged with
 * the key version used so a key rotation does not break decryption of existing rows until they
 * are re-encrypted (Security Architecture §2, §5 Phase 4).
 *
 * <p>JPA instantiates {@code @Converter} classes itself rather than through Spring DI, so the
 * key provider is injected once at startup via {@link EncryptedStringConverterInitializer}.
 */
@Converter
public class EncryptedStringConverter implements AttributeConverter<String, String> {

    private static final Logger log = LoggerFactory.getLogger(EncryptedStringConverter.class);

    private static final String CIPHER_TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;
    private static final String FIELD_SEPARATOR = ":";

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private static volatile EncryptionKeyProvider keyProvider;

    static void initialize(EncryptionKeyProvider provider) {
        keyProvider = provider;
    }

    @Override
    public String convertToDatabaseColumn(String plaintext) {
        if (plaintext == null) {
            return null;
        }
        EncryptionKeyProvider provider = requireKeyProvider();
        String keyVersion = provider.getActiveKeyVersion();
        SecretKey key = provider.getActiveKey();

        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            return keyVersion + FIELD_SEPARATOR
                    + Base64.getEncoder().encodeToString(iv) + FIELD_SEPARATOR
                    + Base64.getEncoder().encodeToString(ciphertext);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to encrypt attribute value", e);
        }
    }

    @Override
    public String convertToEntityAttribute(String stored) {
        if (stored == null) {
            return null;
        }
        EncryptionKeyProvider provider = requireKeyProvider();

        String[] parts = stored.split(FIELD_SEPARATOR, 3);
        if (parts.length != 3) {
            throw new IllegalStateException("Malformed encrypted value: expected 'version:iv:ciphertext'");
        }
        String keyVersion = parts[0];
        byte[] iv = Base64.getDecoder().decode(parts[1]);
        byte[] ciphertext = Base64.getDecoder().decode(parts[2]);

        SecretKey key = provider.getKey(keyVersion);

        try {
            Cipher cipher = Cipher.getInstance(CIPHER_TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv));
            byte[] plaintext = cipher.doFinal(ciphertext);
            log.info("Decrypted an encrypted attribute using key version '{}'", keyVersion);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to decrypt attribute value", e);
        }
    }

    private EncryptionKeyProvider requireKeyProvider() {
        EncryptionKeyProvider provider = keyProvider;
        if (provider == null) {
            throw new IllegalStateException(
                    "EncryptedStringConverter used before EncryptionKeyProvider was initialized. "
                            + "Ensure EncryptedStringConverterInitializer has run.");
        }
        return provider;
    }
}
