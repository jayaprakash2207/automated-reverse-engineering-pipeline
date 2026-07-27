# Deployment Architecture
## Forward Engineering Document 18

### 1. Baseline

The EKG confirms 0 of 14 CI/CD maturity capabilities present in the source system — "confirmed absent, not just unscanned." This is treated as a clean-slate finding: there is no existing pipeline to extend, migrate, or reconcile with. This document specifies the 14-capability target set generically (technology-neutral, consistent with `12_TECHNOLOGY_BLUEPRINT.md` §4 deferring platform choice) and a phased plan to reach it.

### 2. The 14 Target Capabilities

The specific 14 capabilities scanned for were not enumerated in the EKG (content beyond the "0 of 14" count is `MISSING`). Absent that list, this document specifies the **standard capability set** any senior architect would scan for, so that Document 18 remains actionable despite the gap. This substitute list should be reconciled against the original 14 once recovered:

1. Source control branching/PR policy
2. Automated build on commit
3. Automated unit test execution in CI
4. Automated integration test execution in CI
5. Static code analysis / linting gate
6. Security/dependency scanning (SAST/SCA)
7. Secrets scanning (directly relevant — the hard-coded key defect, `PKG-SECURITY`, would have been caught by this)
8. Automated schema migration tooling (versioned, reviewable — replacing the current implicit trigger-based side effects, `TD-11`/`TD-12`)
9. Environment promotion pipeline (dev → staging → prod)
10. Automated deployment (no manual artifact copying)
11. Rollback capability
12. Infrastructure-as-code for environment provisioning
13. Centralized logging/monitoring
14. Alerting tied to defined SLOs

### 3. Environment Topology (capability-level, stack-neutral)

- **Dev**: full stack, seeded with synthetic data only. Given the confirmed presence of real-shaped PII fields (SSN encryption in `PKG-SECURITY`), synthetic/masked data is mandatory in any non-production environment — this is a direct consequence of `OQ-001` being unresolved; treat all non-prod data as if it *might* be production-derived PII until proven otherwise.
- **Staging**: production-topology mirror for pre-release validation, including the VG-01..VG-07 validation gates from Document 15 running as CI steps.
- **Production**: gated by Phase 0–4 of the Security Architecture modernization plan (Document 13) — specifically, Phase 0 (key rotation) must complete **before** any production cutover, regardless of overall migration timeline.

### 4. CI/CD Pipeline Stages (mapped to Document 15's validation gates)

```
commit → build → unit tests → VG-02 (defect non-reproduction) → VG-03 (rule single-sourcing)
       → VG-05 (diagram/graph consistency) → integration tests → VG-04 (audit fail-closed)
       → VG-01 (schema completeness) → package/artifact → deploy to staging
       → smoke tests incl. VG-06 (leave-approval gap closure e2e) → manual gate for prod → deploy to prod
```

`VG-07` (open-question escalation) is a pipeline **blocker**, not a stage — it prevents the payroll/review-cycle domains from entering the pipeline at all until `OQ-003` is resolved (see Document 17 §5).

### 5. Rollback and Data Safety

Given the source system's confirmed history of silent/loud data-write failures (`TD-11`, `TD-12`, `DISC-006`), any deployment architecture for this system must treat **migration reversibility** as a first-class deployment concern: every schema migration tied to employee-history or audit-log tables must ship with a tested down-migration before it is allowed past the staging gate.

### 6. Explicitly Deferred

Specific cloud provider, container orchestrator, IaC tool, and observability vendor selection are deferred to the stack decision in `12_TECHNOLOGY_BLUEPRINT.md` §4. This document specifies capability and gate requirements that any concrete platform choice must satisfy.