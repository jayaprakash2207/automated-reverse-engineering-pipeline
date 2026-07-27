package com.example.app.employee.service;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultHireDatePolicyTest {

    @Test
    void should_addTheConfiguredThresholdDays_when_calculatingEligibilityDate() {
        HireDatePolicyProperties properties = new HireDatePolicyProperties();
        properties.setThresholdDays(90);
        DefaultHireDatePolicy policy = new DefaultHireDatePolicy(properties);

        LocalDate eligibilityDate = policy.calculateEligibilityDate(LocalDate.of(2024, 1, 1));

        assertThat(eligibilityDate).isEqualTo(LocalDate.of(2024, 3, 31));
    }

    @Test
    void should_reflectAConfigChangeImmediately_when_thresholdIsUpdated_regressionForDISC001() {
        HireDatePolicyProperties properties = new HireDatePolicyProperties();
        properties.setThresholdDays(180);
        DefaultHireDatePolicy policy = new DefaultHireDatePolicy(properties);

        LocalDate eligibilityDate = policy.calculateEligibilityDate(LocalDate.of(2024, 1, 1));

        assertThat(eligibilityDate).isEqualTo(LocalDate.of(2024, 6, 29));
    }
}
