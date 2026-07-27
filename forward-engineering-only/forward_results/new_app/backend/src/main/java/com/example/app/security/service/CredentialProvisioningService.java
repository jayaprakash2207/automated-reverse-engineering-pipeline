package com.example.app.security.service;

import com.example.app.common.exception.BusinessRuleException;
import com.example.app.security.domain.Role;
import com.example.app.security.domain.UserCredential;
import com.example.app.security.repository.UserCredentialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

/**
 * The single mechanism for creating credentials. Greenfield design (Security Architecture §2) -
 * not a port of {@code PKG_SECURITY}, which never had a credential table to begin with.
 */
@Service
@RequiredArgsConstructor
public class CredentialProvisioningService {

    private final UserCredentialRepository userCredentialRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserCredential provision(Long employeeId, String email, String rawPassword, Set<Role> roles) {
        if (userCredentialRepository.findByEmail(email).isPresent()) {
            throw new BusinessRuleException("A credential already exists for email '" + email + "'");
        }
        if (roles == null || roles.isEmpty()) {
            throw new BusinessRuleException("At least one role must be assigned when provisioning a credential");
        }

        UserCredential credential = new UserCredential(
                employeeId, email, passwordEncoder.encode(rawPassword), roles);
        return userCredentialRepository.save(credential);
    }
}
