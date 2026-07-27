package com.example.app.common.crypto;

public interface EncryptionKeyProvider {

    byte[] resolveKey(String keyAlias);
}
