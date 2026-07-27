package com.example.app.common.crypto;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class EncryptedStringConverterInitializer {

    private final EncryptionKeyProvider encryptionKeyProvider;

    @PostConstruct
    void initialize() {
        EncryptedStringConverter.initialize(encryptionKeyProvider);
    }
}
