package com.example.app.employee.service;

import java.time.LocalDate;

/**
 * Single seam for the hire-date threshold rule (11_API_CONTRACT_SPECIFICATION.md
 * §2.3, DISC-001). The business has not reconciled whether the threshold is 90 or
 * 180 days, so no caller may hard-code either value — every caller routes through
 * this interface so the eventual decision is a one-place fix.
 */
public interface HireDatePolicy {

    LocalDate calculateEligibilityDate(LocalDate hireDate);
}
