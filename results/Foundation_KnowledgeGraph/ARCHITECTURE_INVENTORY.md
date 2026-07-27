# Architecture Inventory

**Confidence caveat:** This inventory reflects only what the four summaries explicitly stated. It is NOT a full asset inventory — most of the underlying detail (full table list, full module list, full package list) is `MISSING` pending access to the full layer reports.

## Deployables
| Item | Evidence | Confidence |
|---|---|---|
| Oracle Forms / PL/SQL-based HR & Payroll application (inferred single deployable) | ASMP-001 — inferred from PKG_*.pkb, TRG_* naming, "Application/Forms Libraries" TA chunk label | MEDIUM |
| Other deployables (batch jobs, reports, web front-end, etc.) | Not stated in any summary | MISSING |

## Databases
| Item | Evidence | Confidence |
|---|---|---|
| Single Oracle schema, 30 tables | DA summary | HIGH |
| EMPLOYEES | DA, AA, TA summaries | HIGH |
| EMPLOYEE_HISTORY | DA, TA summaries | HIGH |
| USER_CREDENTIALS | Confirmed **absent** — DA summary | HIGH (negative finding) |
| Remaining 28 tables | Not named in any summary | MISSING |

## APIs
| Item | Evidence | Confidence |
|---|---|---|
| No REST/SOAP/external API surface mentioned in any summary | — | MISSING — cannot confirm existence or absence |

## Services / Packages
| Item | Evidence | Confidence |
|---|---|---|
| PKG_SECURITY (incl. `authenticate()`) | DA summary | HIGH |
| PKG_EMPLOYEE (incl. `transfer_employee`, `promote_employee`, `terminate_employee`, `rehire_employee`) | DA summary | HIGH |
| PKG_AUDIT (incl. `log_action`) | DA summary | HIGH |
| Remaining PKG_* packages — count disputed at 10 vs. 11 (DISC-003) | AA summary | HIGH (discrepancy exists) / LOW (which count is correct) |

## Entities (data/domain)
| Item | Evidence | Confidence |
|---|---|---|
| Employee (canonical merge) | All 4 layers | HIGH |
| EMPLOYEE_HISTORY | DA, TA | HIGH |
| Leave Request / Leave Balance (named only as a value stream + pain point, no table confirmed) | BA summary | LOW — inferred entity, no direct table evidence provided |
| Pay Period / Payroll Run (named only as value streams) | BA summary | LOW |
| Review Cycle / Individual Review (named only as value streams) | BA summary | LOW |

## Tech Stack
| Item | Evidence | Confidence |
|---|---|---|
| Oracle Database (PL/SQL packages, triggers, sequences) | DA, TA, AA summaries (PKG_*, TRG_*, SEQ_*, ORA-00904/ORA-02290) | HIGH |
| Oracle Forms (or equivalent forms library) | TA layer chunk explicitly labeled "Application/Forms Libraries" | MEDIUM |
| CI/CD tooling | **Confirmed absent** — 0 of 14 capabilities present | HIGH (negative finding) |

## Security Findings
| Finding | Severity | Evidence | Confidence |
|---|---|---|---|
| `PKG_SECURITY.authenticate()` does not check password; any known active employee email logs in as that employee with any password | CRITICAL | DA summary | HIGH |
| AES-256 key used to encrypt SSNs is a hard-coded literal in `PKG_SECURITY.pkb`, committed to version control | CRITICAL | DA summary | HIGH |
| No password/credentials table exists at all (`USER_CREDENTIALS` absent) | CRITICAL (root cause of above) | DA summary | HIGH |

## PII
| Item | Evidence | Confidence |
|---|---|---|
| SSN (encrypted, but with a compromised/hard-coded key) | DA summary | HIGH |
| Employee email (used as sole authentication identifier) | DA summary | HIGH |
| Other PII fields (DOB, address, bank account for payroll, etc.) | Not explicitly named in summaries; likely present in a payroll system but **unconfirmed** | ASSUMED — flagged, not asserted as fact |

## Technical Debt Summary
| Severity | Count | Evidence |
|---|---|---|
| Critical | 7 | TA summary |
| High | 10 | TA summary |
| Medium | 12 | TA summary |
| Low | 3 | TA summary |
| **Total** | **32** | TA summary |

Highest-priority confirmed item: **TD-11/TD-12** — `TRG_EMP_BEFORE_UPDATE` writes to `EMPLOYEE_HISTORY` are structurally broken (column-shape mismatch + disallowed CHECK values), producing a guaranteed `ORA-00904`/`ORA-02290` on every department or job change. Cross-confirmed by Data layer (escalated from "wrong columns" to "entire lifecycle beyond hire/basic-profile-edit non-functional") and Technology layer independently.

## Structural / Process Debt (non-code)
- CI/CD: 0 of 14 maturity capabilities present (TA).
- AA deliverable non-compliance: required `architecture-output/final/` file tree was not produced; everything consolidated into one root-level file (self-acknowledged).
- AA diagram/JSON inconsistency: two dependency edges drawn in `.mmd` diagrams do not exist in `dependency-graph.json`.
- AA package-count self-contradiction: 10 vs. 11 (DISC-003), unresolved.