package com.example.app.employee.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

@Component
@RequiredArgsConstructor
public class DefaultHireDatePolicy implements HireDatePolicy {

    private final HireDatePolicyProperties properties;

    @Override
    public LocalDate calculateEligibilityDate(LocalDate hireDate) {
        return hireDate.plusDays(properties.getThresholdDays());
    }
}
