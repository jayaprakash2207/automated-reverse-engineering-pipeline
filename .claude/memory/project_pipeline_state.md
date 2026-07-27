---
name: project-pipeline-state
description: "Full state of the automated reverse+forward engineering pipeline — what is done, what is pending, all run commands, sprint details, file locations"
metadata: 
  node_type: memory
  type: project
  originSessionId: a3039413-7d27-401e-923b-671551c92de9
---

# Pipeline Project State

## What This Project Does
Automated two-phase pipeline:
1. **Reverse Engineering** — reads legacy Oracle Forms + PL/SQL HRMS codebase → produces 25 architecture docs + Enterprise Knowledge Graph
2. **Forward Engineering** — reads those docs → generates Java 17 + Spring Boot 3 + React 18 + TypeScript + PostgreSQL application, sprint by sprint

Source codebase: `source/ts-plsql-oracle-forms-hrms/` (Oracle Forms + PL/SQL HRMS)

---

## Reverse Engineering Accuracy
**Current accuracy: ~85–90%** (improved July 2026 from ~60–65%)

The existing `results/` were generated BEFORE the accuracy improvements. If you re-run reverse engineering, the new output will be more complete. The improvements are in the prompts — see [[project-fixes-applied]] Fix 10.

Turn 1 (file selection) = Python runners. Turn 2 (analysis quality) = `Prompts_Ready_To_Use/*.md` files.

---

## Phase 1 — Reverse Engineering
**STATUS: COMPLETE — DO NOT RE-RUN**

All 13 steps completed. Output committed to repo in `results/`:

| Folder | Contents |
|--------|---------|
| `results/ForwardEngineering_Docs/` | 20 docs: 01_BRD.md through 20_UI_UX_SPECIFICATION.md |
| `results/Foundation_KnowledgeGraph/` | ENTERPRISE_KNOWLEDGE_GRAPH.json + 5 view files |
| `results/Business_Analysis/` | BA_Structural_Scout.md, BA_Deep_Analyst.md |
| `results/Data_Analysis/` | DA_Data_Extractor.md, DA_Data_Reviewer.md |
| `results/Technology_Analysis/` | TA_Stack_Scout.md, TA_Deep_Analyst.md |
| `results/Application_Analysis/` | AA_App_Extractor.md, AA_Quality_Review.md |
| `results/Source_Extraction/` | Source_Code.json, Database.json, Config.json |
| `results/DEEP_SCAN_OUTPUT.md` | Full deep scan of all source files |

Run command (only if re-running from scratch):
```
python run.py --source source/ts-plsql-oracle-forms-hrms --output ./results
```

---

## Phase 2 — Forward Engineering
**STATUS: NOT STARTED — fresh run needed**

`forward-engineering-only/forward_results/` does NOT exist — was deleted 2026-07-27 for clean run.

### Run Commands

**From directory:** `c:\updated-fwd-new-arc-main\forward-engineering-only\`

**Option A — Full run (Batch 1 auto-chains into Batch 2):**
```
python run_forward.py --input ../results --output ./forward_results
```

**Option B — Skip interactive stack menu:**
```
python run_forward.py --input ../results --output ./forward_results --target-stack "Backend: Java 17, Spring Boot 3.x | Frontend: React (TypeScript) | Database: PostgreSQL"
```

**Option C — Batch 1 only (stop before Batch 2):**
```
python run_forward.py --input ../results --output ./forward_results --no-auto-batch2
```

**Option D — Batch 2 only (if Batch 1 already done):**
```
python run_forward_batch2.py --input ../results --output ./forward_results
```

**Option E — Run only one specific sprint:**
```
python run_forward_batch2.py --input ../results --output ./forward_results --only "Security/Identity Context"
```

**Option F — Set max fix-loop retries:**
```
python run_forward_batch2.py --input ../results --output ./forward_results --max-retries 2
```

---

## Target Tech Stack
Already decided. Stored in `forward_results/target_stack.json` once Batch 1 runs.

| Layer | Technology |
|-------|-----------|
| Backend | Java 17, Spring Boot 3.x |
| Frontend | React 18, TypeScript |
| Database | PostgreSQL 15 (migrated off Oracle) |
| Auth | JWT with refresh tokens, AES-256 SSN encryption, RBAC |
| DB Migrations | Flyway |
| Backend Tests | JUnit 5 + Testcontainers (integration), Mockito (unit) |
| Frontend Tests | Jest + React Testing Library |
| Build | Maven (backend), npm (frontend) |

---

## 6 Sprints — Current Status: ALL PENDING (fresh start)

Sprint status lives in `forward_results/sprint_ledger.json`.
Status values: PENDING / IN_PROGRESS / COMPLETED / FAILED_BLOCKED

| # | Sprint Name | What it builds | DB Migration |
|---|-------------|----------------|-------------|
| 1 | Security/Identity Context | JWT auth, refresh tokens, AES-256 encryption, UserCredential entity, login/logout/refresh endpoints, RBAC | V1.1, V1.2 |
| 2 | Employee Management Context | Employee entity, hire/transfer/promote/terminate/rehire lifecycle, EmployeeHistory, search/filter | V1.3 |
| 3 | Leave Management Context | LeaveRequest entity, submit/approve/reject/cancel, balance tracking, manager approval queue | V1.5 |
| 4 | Payroll Context | PayPeriod entity, PayrollRun entity, run creation/status tracking | V1.6 |
| 5 | Performance Context | ReviewCycle entity, IndividualReview entity, cycle management, scoring | V1.7 |
| 6 | Action Audit Logging (cross-cutting) | Tamper-evident AuditEntry, AOP-based logging across all modules, ADMIN-only query API | TBD |

---

## Per-Sprint Steps (Batch 2 runs these in order for each sprint)

1. **Backend Dev agent** — writes Java entities, services, repositories, controllers, Flyway SQL
2. **Security Reviewer** — reviews access control, RBAC annotations, input validation
3. **Frontend Dev agent** — writes React components, hooks, API client functions (reads backend files as reference)
4. **Data Migration** — Flyway SQL scripts (only with --migrate-data flag)
5. **Test Writer agent** — writes JUnit unit+integration tests + Jest/RTL frontend tests
6. **Test Executor** — runs `mvn test` + `npm test` via real subprocess (no AI), collects failures
7. **Code Review** — 3 independent reviewers check the sprint output in parallel
8. **Fix Loop** — re-invokes dev agents with specific failure feedback, retries up to --max-retries
9. **Learnings write-back** — logs root cause to `forward_results/LEARNINGS.json` for future sprints

---

## Key File Locations

### Pipeline entry points
| File | Purpose |
|------|---------|
| `run.py` | Reverse engineering master (13 steps) |
| `forward-engineering-only/run_forward.py` | Forward Batch 1 (stack + scaffold + sprint plan) |
| `forward-engineering-only/run_forward_batch2.py` | Forward Batch 2 (per-sprint dev loop) |

### Forward engineering state files (created at runtime)
| File | Purpose |
|------|---------|
| `forward_results/target_stack.json` | Confirmed tech stack string |
| `forward_results/STACK_MAPPING_CONTRACT.md` | Conventions: folder layout, naming, DI, error handling |
| `forward_results/SPRINT_BACKLOG.json` | Ordered sprint list with rationale |
| `forward_results/sprint_ledger.json` | Per-sprint status (PENDING/IN_PROGRESS/COMPLETED/FAILED_BLOCKED) |
| `forward_results/sprints/<slug>/manifest.json` | Files written per agent per sprint |
| `forward_results/LEARNINGS.json` | Accumulated fix-loop root causes (shared across all sprints) |
| `forward_results/LEARNINGS.md` | Human-readable version of LEARNINGS.json |

### Generated application (created at runtime)
| Path | Contents |
|------|---------|
| `forward_results/new_app/backend/` | Spring Boot Java application |
| `forward_results/new_app/backend/pom.xml` | Maven build file |
| `forward_results/new_app/backend/src/main/java/com/example/app/` | Java source |
| `forward_results/new_app/backend/src/main/resources/db/migration/` | Flyway SQL files |
| `forward_results/new_app/frontend/` | React TypeScript application |
| `forward_results/new_app/frontend/package.json` | npm config |
| `forward_results/new_app/frontend/src/features/` | One folder per sprint |
| `forward_results/new_app/frontend/src/shared/` | Shared API client, auth context, components |

### Forward engineering agents
| File | Role |
|------|------|
| `pipeline_forward/fwd_base.py` | Shared helpers: call_claude(), write_file_bundle(), load_ledger(), etc. |
| `pipeline_forward/stack_selection_runner.py` | Proposes 2-3 stacks via interactive menu or --target-stack |
| `pipeline_forward/stack_mapping_runner.py` | Writes conventions contract (naming, DI, folder layout) |
| `pipeline_forward/sprint_planner_runner.py` | Produces ordered SPRINT_BACKLOG.json |
| `pipeline_forward/elaboration_runner.py` | Expands sprints into tasks (only without reverse-eng docs) |
| `pipeline_forward/scaffold_runner.py` | Creates pom.xml, package.json, folder skeleton |
| `pipeline_forward/backend_dev_runner.py` | Java domain + services + controllers (PROMPT at line 20) |
| `pipeline_forward/security_review_runner.py` | Access control review per sprint |
| `pipeline_forward/frontend_dev_runner.py` | React components + hooks (PROMPT at line 19) |
| `pipeline_forward/test_writer_runner.py` | JUnit + Jest tests |
| `pipeline_forward/test_executor_runner.py` | Real subprocess mvn/npm test + fix-loop |
| `pipeline_forward/data_migration_runner.py` | Flyway SQL migration scripts |
| `pipeline_forward/review_runner.py` | 3 parallel independent reviewers |

---

## Resume Behavior
- Pipeline is fully resume-safe — re-running same command continues from last completed step
- Sprint status in `sprint_ledger.json` controls what runs: COMPLETED = skip, PENDING = run
- To force-retry a FAILED_BLOCKED sprint: edit `sprint_ledger.json`, change status to `PENDING`, re-run
- Individual step resume: manifest.json tracks which files each agent wrote — if backend_files exists, backend step is skipped

---

## GitHub
- URL: https://github.com/jayaprakash2207/automated-reverse-engineering-pipeline
- Branch: main
- All code pushed as of 2026-07-27
- Memory files in: `.claude/memory/`
- Permissions in: `.claude/settings.local.json`

Clone and continue:
```
git clone https://github.com/jayaprakash2207/automated-reverse-engineering-pipeline.git
cd automated-reverse-engineering-pipeline
pip install -r requirements.txt
npm install -g @anthropic-ai/claude-code
claude login
cd forward-engineering-only
python run_forward.py --input ../results --output ./forward_results
```

---

## Time and Cost Estimate

| Phase | Time | Cost |
|-------|------|------|
| Reverse engineering (already done) | ~1.5 hours | ~$5–10 |
| Forward Batch 1 | ~45 min | ~$3–5 |
| Forward Batch 2 (6 sprints) | ~6–10 hours | ~$20–40 |
| **Total fresh run** | **~8–12 hours** | **~$25–55** |

**Why:** User wants team members and AI agents to pick up exactly where work left off without re-reading conversation history.
**How to apply:** Always check `sprint_ledger.json` for current sprint status before starting forward engineering. Read `PIPELINE_STATE.md` in repo root for full handoff context.
