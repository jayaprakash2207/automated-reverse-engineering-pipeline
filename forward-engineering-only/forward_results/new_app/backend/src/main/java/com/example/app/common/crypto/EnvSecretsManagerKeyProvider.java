package com.example.app.common.crypto;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

/**
 * Stand-in for a real externalized secrets manager (AWS/Azure KMS, Vault). Reads key material
 * from the Spring {@link Environment} - which resolves OS environment variables by default and
 * nothing else - so the key never appears in application.yml, source, or the built JAR. Swap
 * this implementation for a KMS/Vault SDK client without changing {@link EncryptionKeyProvider}
 * callers. Multiple versions are supported so a rotated key can still decrypt historical data
 * (Security Architecture §2, §5 Phase 4).
 */
@Component
@RequiredArgsConstructor
public class EnvSecretsManagerKeyProvider implements EncryptionKeyProvider {

    private static final String ACTIVE_VERSION_PROPERTY = "SSN_ENCRYPTION_ACTIVE_KEY_VERSION";
    private static final String KEYS_PROPERTY = "SSN_ENCRYPTION_KEYS";
    private static final String AES_ALGORITHM = "AES";
    private static final int REQUIRED_KEY_LENGTH_BYTES = 32;

    private final Environment environment;

    private final Map<String, SecretKey> keysByVersion = new HashMap<>();
    private String activeKeyVersion;

    @PostConstruct
    void loadKeys() {
        String activeVersion = environment.getProperty(ACTIVE_VERSION_PROPERTY);
        String rawKeys = environment.getProperty(KEYS_PROPERTY);

        if (activeVersion == null || activeVersion.isBlank()) {
            throw new IllegalStateException(
                    "Missing " + ACTIVE_VERSION_PROPERTY + ". The SSN encryption key must be resolved from an "
                            + "externalized secrets manager at startup - no default is permitted.");
        }
        if (rawKeys == null || rawKeys.isBlank()) {
            throw new IllegalStateException(
                    "Missing " + KEYS_PROPERTY + ". The SSN encryption key must be resolved from an "
                            + "externalized secrets manager at startup - no default is permitted.");
        }

        for (String entry : rawKeys.split(",")) {
            String[] parts = entry.split(":", 2);
            if (parts.length != 2 || parts[0].isBlank() || parts[1].isBlank()) {
                throw new IllegalStateException(
                        "Malformed entry in " + KEYS_PROPERTY + "; expected format 'version:base64Key,...'");
            }
            keysByVersion.put(parts[0].trim(), decode(parts[1].trim()));
        }

        if (!keysByVersion.containsKey(activeVersion)) {
            throw new IllegalStateException("Active key version '" + activeVersion + "' not present in " + KEYS_PROPERTY);
        }

        this.activeKeyVersion = activeVersion;
    }

    private SecretKey decode(String base64Key) {
        byte[] keyBytes = Base64.getDecoder().decode(base64Key);
        if (keyBytes.length != REQUIRED_KEY_LENGTH_BYTES) {
            throw new IllegalStateException("SSN encryption keys must be 256-bit (32 bytes) after base64 decoding.");
        }
        return new SecretKeySpec(keyBytes, AES_ALGORITHM);
    }

    @Override
    public String getActiveKeyVersion() {
        return activeKeyVersion;
    }

    @Override
    public SecretKey getActiveKey() {
        return keysByVersion.get(activeKeyVersion);
    }

    @Override
    public SecretKey getKey(String keyVersion) {
        SecretKey key = keysByVersion.get(keyVersion);
        if (key == null) {
            throw new IllegalStateException("No encryption key found for version '" + keyVersion + "'");
        }
        return key;
    }
}
