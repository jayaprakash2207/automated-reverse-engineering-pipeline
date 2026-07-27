package com.example.app.security.service;

import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Refresh tokens are bearer secrets like passwords - only their hash is ever persisted, so a
 * database read alone cannot be replayed as a valid token (Security Architecture §4).
 */
@Component
public class TokenHasher {

    private static final String ALGORITHM = "SHA-256";

    public String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance(ALGORITHM);
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("Required hash algorithm unavailable: " + ALGORITHM, e);
        }
    }
}
