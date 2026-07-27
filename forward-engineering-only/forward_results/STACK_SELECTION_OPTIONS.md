## Stack Selection — Candidate Target Technology Stacks

**Note on grounding**: The Technology Blueprint explicitly defers RDBMS vendor, application-tier language/framework, and frontend framework to "a stakeholder-driven stack-selection exercise" (§4) — no target stack was supplied in the source documents. The options below are built from the **capability requirements** in §3 of the Blueprint and the derived NFRs in Doc 14. Performance/throughput, availability/SLA, and scalability targets are explicitly **undefined** in the source (NFR spec §8) — none of these options is differentiated on scale/latency because there is no evidence to differentiate against; that must come from stakeholders before final commitment.

## Option 1 — Java / Spring Boot, React, PostgreSQL (migrate off Oracle)

**Frontend**: React (with TypeScript)
**Backend**: Java 17, Spring Boot 3.x
**Database**: PostgreSQL (new schema, migrated off Oracle)

Spring Security gives a real authentication/authorization service out of the box (NFR-S1), directly closing the confirmed `PKG-SECURITY.authenticate` bypass. Spring's transaction management (`@Transactional`) makes it straightforward to satisfy NFR-R2 (fail the parent transaction if an audit write fails, rather than swallowing it as `PKG_AUDIT.log_action` does today). Flyway/Liquibase give versioned, reviewable, application-tier-owned migrations — replacing the trigger-based `EMPLOYEE_HISTORY` side effects the Blueprint calls out (§3.1). Business rules externalize cleanly as discrete `@Service` classes/modules, one per `BR-*`, satisfying NFR-M1. PostgreSQL supports column-level (`pgcrypto`) or application-layer encryption combined with an external KMS/secrets manager (Vault, AWS/Azure KMS) for NFR-S2/S3. Tradeoff: this path means an actual RDBMS migration off Oracle (schema + data migration risk, especially given `ASMP-002` flags the 30-table schema completeness as unconfirmed), and Java/Spring has a heavier ceremony/learning curve than the other options if the team isn't already JVM-familiar.

## Option 2 — Node.js/NestJS (TypeScript), React, PostgreSQL

**Frontend**: React (TypeScript)
**Backend**: Node.js, NestJS (TypeScript)
**Database**: PostgreSQL

A single language (TypeScript) across frontend and backend can reduce ramp-up time and context-switching for a team without deep JVM/.NET experience. NestJS's modular architecture (modules/providers/guards) maps naturally onto "one rule module per `BR-*`" (NFR-M1) and onto building a dedicated auth module (NFR-S1) with libraries like Passport/CASL for authz. TypeORM/Prisma provide versioned migrations satisfying the app-tier-owned-migration requirement (§3.1), and Prisma's schema-first approach makes it easy to CI-lint for orphaned objects (NFR-D1). Postgres + pgcrypto/external KMS covers NFR-S2/S3 as in Option 1. Tradeoff: Node's ecosystem for enterprise-grade transactional guarantees and long-running batch/payroll processing (`VS-04`, still undecided sync vs. async) is less battle-tested than the JVM/.NET options, and the same full Oracle→Postgres migration risk from Option 1 applies here too.

## Option 3 — Angular, C#/.NET 8 (ASP.NET Core), Oracle Database (schema retained)

**Frontend**: Angular
**Backend**: C#, ASP.NET Core 8 (Web API)
**Database**: Oracle Database (existing `SCHEMA-001` retained, business logic moved out of PL/SQL)

This option avoids an RDBMS migration entirely — it keeps the confirmed 30-table Oracle schema in place while moving all business logic out of triggers/packages into the application tier, which is exactly what the Blueprint requires (§3.1: "replace database-trigger side effects... application-tier-owned migrations") without also taking on schema-migration risk. ASP.NET Core Identity + custom providers deliver the real auth service (NFR-S1); EF Core migrations (against Oracle via the Oracle EF Core provider) give versioned, reviewable schema changes. .NET's `TransactionScope`/EF Core transactions support the fail-parent-transaction requirement for audit writes (NFR-R2). Azure Key Vault or a self-hosted equivalent handles externalized key management (NFR-S2/S3). Angular's opinionated, batteries-included structure suits a team that wants enforced conventions across 13 modules. Tradeoff: staying on Oracle preserves ongoing licensing/ops costs the Blueprint flags as an explicitly undecided factor (§4), and this stack is the most "enterprise-heavy" of the three, which may not suit a greenfield CI/CD build (0/14 capabilities today, per NFR-O1) if the team lacks .NET/Angular experience.

---

All three options satisfy the non-negotiable capability requirements (externalized KMS, app-tier migrations, no literal trigger porting, real auth service, structured non-swallowing audit log, greenfield CI/CD). The primary axis of difference is **Oracle retention vs. migration** (Option 3 vs. Options 1/2) and **team-familiarity/language-uniformity** (Option 2's single-language TypeScript stack vs. the JVM/.NET options). No scale or latency SLA was available in the source material to further differentiate — that input is needed from stakeholders before finalizing.

```json
[
  {"id": 1, "frontend": "React (TypeScript)", "backend": "Java 17, Spring Boot 3.x", "database": "PostgreSQL (migrated off Oracle)"},
  {"id": 2, "frontend": "React (TypeScript)", "backend": "Node.js, NestJS (TypeScript)", "database": "PostgreSQL (migrated off Oracle)"},
  {"id": 3, "frontend": "Angular", "backend": "C#, ASP.NET Core 8", "database": "Oracle Database (existing schema retained)"}
]
```
