# Pipeline State — Agent & Team Handoff Document

> **Purpose:** This file is the single source of truth for where the pipeline stands.
> Any team member or AI agent picking up this project should read this file first.
> Last updated: 2026-07-27

---

## 1. Project Overview

This pipeline does two things end-to-end:

1. **Reverse Engineering** — reads the Oracle Forms + PL/SQL HRMS legacy codebase at `source/ts-plsql-oracle-forms-hrms/` and produces 25 architecture documents + an Enterprise Knowledge Graph in `results/`
2. **Forward Engineering** — reads those documents and generates a brand new Java 17 + Spring Boot 3 + React 18 + TypeScript + PostgreSQL application in `forward-engineering-only/forward_results/new_app/`

---

## 2. Current Status

### Phase 1 — Reverse Engineering
**STATUS: COMPLETE**

All 13 steps have been run. Output is in `results/`:
- `results/ForwardEngineering_Docs/` — 20 documents (01_BRD.md through 20_UI_UX_SPECIFICATION.md)
- `results/Foundation_KnowledgeGraph/` — Enterprise Knowledge Graph + 5 views
- `results/Business_Analysis/`, `results/Data_Analysis/`, `results/Technology_Analysis/`, `results/Application_Analysis/`

Do NOT re-run reverse engineering. The source is Oracle legacy — results are stable.

### Phase 2 — Forward Engineering
**STATUS: NOT STARTED (fresh)**

`forward-engineering-only/forward_results/` does not exist. It was deleted for a clean run.

Run command (from `forward-engineering-only/`):
```bash
python run_forward.py --input ../results --output ./forward_results
```
This automatically chains into Batch 2 after Batch 1 completes. Or run them separately:
```bash
# Batch 1 only (stack → sprint plan → scaffold, ~45 min)
python run_forward.py --input ../results --output ./forward_results --no-auto-batch2

# Batch 2 only (per-sprint dev loop, ~6-10 hours)
python run_forward_batch2.py --input ../results --output ./forward_results
```

---

## 3. Target Tech Stack

Already decided by the pipeline (stored in `forward_results/target_stack.json` once Batch 1 runs):

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 17, Spring Boot 3.x |
| **Frontend** | React 18, TypeScript |
| **Database** | PostgreSQL 15 (migrated off Oracle) |
| **Auth** | JWT with refresh tokens, AES-256 SSN encryption |
| **DB Migrations** | Flyway |
| **Backend Tests** | JUnit 5 + Testcontainers |
| **Frontend Tests** | Jest + React Testing Library |

To skip the interactive stack selection menu and use this stack directly:
```bash
python run_forward.py --input ../results --output ./forward_results \
  --target-stack "Backend: Java 17, Spring Boot 3.x | Frontend: React (TypeScript) | Database: PostgreSQL"
```

---

## 4. Sprint Backlog (6 sprints)

When forward_results exists, sprint status is in `forward_results/sprint_ledger.json`.
Each sprint status is one of: `PENDING` / `IN_PROGRESS` / `COMPLETED` / `FAILED_BLOCKED`

| # | Sprint Name | What it builds |
|---|-------------|----------------|
| 1 | **Security/Identity Context** | JWT auth, refresh tokens, AES-256 encryption, RBAC |
| 2 | **Employee Management Context** | Hire, transfer, promote, terminate, rehire lifecycle |
| 3 | **Leave Management Context** | Leave requests, approvals, balance tracking |
| 4 | **Payroll Context** | Pay periods, payroll runs, status tracking |
| 5 | **Performance Context** | Review cycles, individual performance assessments |
| 6 | **Action Audit Logging (cross-cutting)** | Tamper-evident audit log across all modules |

**Current state:** All 6 sprints are PENDING (fresh start). Run from Batch 1.

---

## 5. How Forward Engineering Works (per sprint)

For each sprint, Batch 2 runs these steps in order:

```
1. Backend Dev agent      → writes Java entities, services, controllers, SQL migrations
2. Security Reviewer      → reviews access control, adds security notes/fixes
3. Frontend Dev agent     → writes React components, hooks, API clients
4. Data Migration         → Flyway SQL scripts (conditional, --migrate-data flag)
5. Test Writer agent      → writes JUnit + Jest tests
6. Test Executor          → runs REAL npm test + mvn test via subprocess (no AI)
7. Code Review            → 3 independent reviewers check the sprint output
8. Fix Loop               → if tests/review failed: re-invoke dev agents with feedback
9. Learnings write-back   → logs root cause to LEARNINGS.json for future sprints
```

**Resume behavior:** If the pipeline stops mid-sprint, re-running continues from the last completed step. Sprint manifests in `forward_results/sprints/<slug>/manifest.json` track exactly which files each agent wrote.

---

## 6. Environment Setup (No Admin Rights Required)

### Python dependencies
```bash
pip install -r requirements.txt
```

### Java (required for backend test execution)
No installer needed. Download portable zip from https://adoptium.net
```
Extract to: C:\tools\jdk21\jdk-21.0.11+10
Set env:    JAVA_HOME=C:\tools\jdk21\jdk-21.0.11+10
```

### Maven (required for backend test execution)
No installer needed. Download from https://archive.apache.org/dist/maven/maven-3/3.9.6/binaries/
```
Extract to: C:\tools\apache-maven-3.9.6
Set env:    MAVEN_HOME=C:\tools\apache-maven-3.9.6
```

The test executor (`pipeline_forward/test_executor_runner.py`) automatically detects these portable paths via `JAVA_HOME` and `MAVEN_HOME` environment variables. No PATH modification needed.

### Claude API
```bash
npm install -g @anthropic-ai/claude-code
claude login
```

---

## 7. Critical Fixes Already Applied

These bugs were discovered and fixed — do NOT revert them:

| File | Fix |
|------|-----|
| `pipeline_forward/test_executor_runner.py` | Added `_tool()` resolver that falls back to portable JDK/Maven paths when tools are not on system PATH. Without this: `WinError 2` (file not found) when running `mvn` or `java`. |
| `forward_results/new_app/frontend/jest.config.cjs` | Single CJS jest config. Old code had 3 conflicting configs (jest.config.js + jest.config.ts + jest.config.cjs). Keep only `.cjs`. |
| `forward_results/new_app/frontend/src/shared/api/httpClient.ts` | Replaced `import.meta.env.VITE_API_BASE_URL` with `process.env` fallback. Jest is CommonJS — it cannot parse `import.meta`. |
| `forward_results/new_app/frontend/jest.importMetaSetup.cjs` | Stubs `globalThis.importMeta` for Jest CJS environment. |
| `forward_results/new_app/frontend/src/App.tsx` | Changed named export to `export default`. Required by e2e test `import App from "../../App"`. |

**Note:** `forward_results/` was deleted for a fresh run. When the pipeline regenerates these files, the test executor's fix-loop will handle any new frontend test failures automatically.

---

## 8. Key File Locations

### Pipeline entry points
| File | Purpose |
|------|---------|
| `run.py` | Reverse engineering master (13 steps) |
| `forward-engineering-only/run_forward.py` | Forward engineering Batch 1 (stack + scaffold + sprint plan) |
| `forward-engineering-only/run_forward_batch2.py` | Forward engineering Batch 2 (per-sprint dev loop) |

### Reverse engineering output (DO NOT DELETE)
| Path | Contents |
|------|---------|
| `results/ForwardEngineering_Docs/` | 20 documents — the knowledge base for forward engineering |
| `results/Foundation_KnowledgeGraph/` | Enterprise Knowledge Graph JSON + views |

### Forward engineering state (regenerated by pipeline)
| Path | Contents |
|------|---------|
| `forward_results/target_stack.json` | Confirmed tech stack |
| `forward_results/STACK_MAPPING_CONTRACT.md` | Conventions contract (folder layout, naming, DI rules) |
| `forward_results/SPRINT_BACKLOG.json` | Ordered sprint list with rationale |
| `forward_results/sprint_ledger.json` | Per-sprint PENDING/IN_PROGRESS/COMPLETED/FAILED_BLOCKED |
| `forward_results/sprints/<slug>/manifest.json` | Files written per agent per sprint |
| `forward_results/LEARNINGS.json` | Accumulated fix-loop root causes (shared across sprints) |
| `forward_results/new_app/` | Generated application code |

### Forward engineering agents
| File | Role |
|------|------|
| `pipeline_forward/stack_selection_runner.py` | Picks tech stack (interactive menu or --target-stack) |
| `pipeline_forward/stack_mapping_runner.py` | Writes conventions contract |
| `pipeline_forward/sprint_planner_runner.py` | Breaks work into ordered sprints |
| `pipeline_forward/scaffold_runner.py` | Creates project skeleton (pom.xml, package.json, etc.) |
| `pipeline_forward/backend_dev_runner.py` | Writes Java domain, services, controllers |
| `pipeline_forward/security_review_runner.py` | Reviews access control per sprint |
| `pipeline_forward/frontend_dev_runner.py` | Writes React components wired to backend API |
| `pipeline_forward/test_writer_runner.py` | Writes JUnit + Jest tests |
| `pipeline_forward/test_executor_runner.py` | Runs real builds + tests via subprocess + fix-loop |
| `pipeline_forward/data_migration_runner.py` | Writes Flyway SQL migration scripts |
| `pipeline_forward/review_runner.py` | 3 parallel independent reviewers |

### Source codebase (legacy input)
| Path | Contents |
|------|---------|
| `source/ts-plsql-oracle-forms-hrms/` | Oracle Forms + PL/SQL HRMS — the legacy app being modernized |
| `source/eShopOnWeb/` | Microsoft .NET sample (alternate test source) |

---

## 9. How Prompts Work

**Reverse engineering agents** use standalone markdown prompt files in `Prompts_Ready_To_Use/`:
- `01_BA_Agent1_StructuralScout.md`, `02_BA_Agent2_DeepAnalyst.md`, etc.
- Edit the `.md` file to change a prompt — no Python changes needed.

**Forward engineering agents** have prompts hardcoded as Python string constants (`PROMPT = """..."""`) inside each `_runner.py` file:
- `backend_dev_runner.py` line 20 — backend developer prompt
- `frontend_dev_runner.py` line 19 — frontend developer prompt
- etc.
- The `run()` function injects reverse engineering documents into `{domain_model}`, `{brd}`, `{api_contract}` etc. at runtime via `.format()`.

---

## 10. Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|---------|
| `WinError 2` running mvn/java | Maven/JDK not on PATH | Set `JAVA_HOME` and `MAVEN_HOME` env vars pointing to portable zip extractions |
| `import.meta` SyntaxError in Jest | Jest is CJS, Vite is ESM | Already handled in `jest.config.cjs` via `diagnostics: false` + process.env fallback |
| Sprint marked `FAILED_BLOCKED` | Test failures exceeded max retries | Reset to `PENDING` in `sprint_ledger.json` and re-run |
| `npm install` fails with `esbuild ENOENT` | Stale node_modules from another machine | Delete `frontend/node_modules/` and re-run `npm install` |
| Multiple jest config files | AI generated duplicate configs | Keep only `jest.config.cjs`, delete `jest.config.js` and `jest.config.ts` |
| Code files with ` ```typescript ` on line 1 | AI code fence artifact | Run strip script or manually remove first and last line |

---

## 11. GitHub Repository

- **URL:** https://github.com/jayaprakash2207/automated-reverse-engineering-pipeline
- **Branch:** `main`
- **All commits pushed** as of 2026-07-27

To continue work on a new machine:
```bash
git clone https://github.com/jayaprakash2207/automated-reverse-engineering-pipeline.git
cd automated-reverse-engineering-pipeline
pip install -r requirements.txt
npm install -g @anthropic-ai/claude-code
claude login

# Reverse engineering is already done — results/ is in the repo
# Just run forward engineering:
cd forward-engineering-only
python run_forward.py --input ../results --output ./forward_results
```

---

## 12. Token / Cost Estimate

| Phase | Approx Time | Approx Cost |
|-------|------------|-------------|
| Reverse engineering (already done) | ~1.5 hours | ~$5–10 |
| Forward Batch 1 (stack + scaffold) | ~45 min | ~$3–5 |
| Forward Batch 2 (6 sprints × dev loop) | ~6–10 hours | ~$20–40 |
| **Total (fresh run)** | **~8–12 hours** | **~$25–55** |

The fix-loop is the wildcard — each failed test re-invokes a Claude agent. Worst case doubles the Batch 2 cost.

---

*This file is auto-maintained. Update the "Current Status" section after major milestones.*
