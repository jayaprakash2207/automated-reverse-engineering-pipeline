package com.example.app.security.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * TokenHasher exists so raw refresh tokens are never persisted (only their hash is
 * stored in refresh_tokens, looked up again on /auth/refresh and /auth/logout).
 * The hash must therefore be deterministic (so a lookup by re-hashing the incoming
 * raw token works) but must never reveal or equal the original value.
 */
class TokenHasherTest {

    private final TokenHasher tokenHasher = new TokenHasher();

    @Test
    void hash_isDeterministic_forTheSameInput() {
        String raw = "a-raw-refresh-token-value";

        String first = tokenHasher.hash(raw);
        String second = tokenHasher.hash(raw);

        assertThat(first).isEqualTo(second);
    }

    @Test
    void hash_differsForDifferentInputs() {
        String hashA = tokenHasher.hash("token-a");
        String hashB = tokenHasher.hash("token-b");

        assertThat(hashA).isNotEqualTo(hashB);
    }

    @Test
    void hash_neverEqualsTheRawInput() {
        String raw = "a-raw-refresh-token-value";

        String hashed = tokenHasher.hash(raw);

        assertThat(hashed).isNotEqualTo(raw);
        assertThat(hashed).doesNotContain(raw);
    }

    @Test
    void hash_producesAFixedLengthHexDigest() {
        String hashed = tokenHasher.hash("any-value");

        // SHA-256 hex digest: 64 lowercase hex characters.
        assertThat(hashed).hasSize(64);
        assertThat(hashed).matches("[0-9a-f]{64}");
    }

    @Test
    void hash_rejectsNullInput() {
        assertThatThrownBy(() -> tokenHasher.hash(null))
                .isInstanceOf(NullPointerException.class);
    }
}
