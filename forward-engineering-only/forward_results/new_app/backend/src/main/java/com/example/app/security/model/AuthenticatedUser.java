package com.example.app.security.model;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

public class AuthenticatedUser implements UserDetails {

    private final Long userCredentialId;
    private final Long employeeId;
    private final String email;
    private final Set<String> roles;

    public AuthenticatedUser(Long userCredentialId, Long employeeId, String email, Set<String> roles) {
        this.userCredentialId = userCredentialId;
        this.employeeId = employeeId;
        this.email = email;
        this.roles = roles;
    }

    public Long getUserCredentialId() {
        return userCredentialId;
    }

    public Long getEmployeeId() {
        return employeeId;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .collect(Collectors.toSet());
    }

    @Override
    public String getPassword() {
        return null;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
