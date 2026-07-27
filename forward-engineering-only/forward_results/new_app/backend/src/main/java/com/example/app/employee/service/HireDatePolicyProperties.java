package com.example.app.employee.service;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Externalizes the disputed hire-date threshold (DISC-001: 90 vs 180 days) into
 * application.yml instead of a literal in code, so resolving the business
 * conflict is a one-line config change, not a code change.
 */
@Component
@ConfigurationProperties(prefix = "app.hire-date-policy")
public class HireDatePolicyProperties {

    private int thresholdDays;

    public int getThresholdDays() {
        return thresholdDays;
    }

    public void setThresholdDays(int thresholdDays) {
        this.thresholdDays = thresholdDays;
    }
}
