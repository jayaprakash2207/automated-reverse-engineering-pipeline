<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=300&section=header&text=Automated%20Reverse%20%26%20Forward%20Engineering%20Pipeline&fontSize=34&fontColor=ffffff&fontAlignY=38&desc=Transform%20any%20legacy%20codebase%20into%2025%20architecture%20documents%20%2B%20working%20modern%20code%20—%20fully%20automated%20with%20Claude%20AI&descAlignY=60&descSize=14&animation=fadeIn" width="100%"/>

<br/>

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Claude AI](https://img.shields.io/badge/Claude-AI%20Agents-D97706?style=for-the-badge&logo=anthropic&logoColor=white)](https://anthropic.com)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.x-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

<br/>

> **The world's first fully automated pipeline that reads a legacy codebase, reverse-engineers it into 25 architecture documents + an Enterprise Knowledge Graph, then forward-engineers a clean modern application — end to end, zero human involvement.**

<br/>

[🚀 Quick Start](#-quick-start) · [🧠 How It Works](#-how-it-works) · [📄 What It Produces](#-what-it-produces) · [🏗️ Architecture](#️-architecture) · [🔧 Configuration](#-configuration) · [📊 Example Output](#-example-output)

<br/>

</div>

---

## ✨ What This Does

Point this pipeline at **any legacy codebase** — a GitHub URL or a local folder. Walk away. Come back to:

1. **25 architecture documents** — BRD, ERD, API contracts, security architecture, domain model, and more
2. **An Enterprise Knowledge Graph** — every entity, service, API, and table, cross-linked and evidence-cited
3. **A working modern application** — Java 17 + Spring Boot 3 backend, React 18 + TypeScript frontend, PostgreSQL database — generated sprint by sprint

<br/>

<div align="center">

| | Manual (traditional) | This Pipeline |
|---|:---:|:---:|
| ⏱️ Time to full architecture | 2–4 weeks | **~1.5 hours** |
| 👤 Human involvement | Every step | **Zero** |
| 📄 Documents produced | Varies | **25 docs + KG** |
| 🔁 Reproducible | No | **Yes — re-run anytime** |
| 🔍 Evidence-cited findings | Depends on analyst | **Every single finding** |
| 💻 Working code generated | Months | **Per sprint, automated** |

</div>

---

## 🚀 Quick Start

### Step 1 — Install dependencies

```bash
pip install -r requirements.txt
```

```bash
npm install -g @anthropic-ai/claude-code
```

```bash
claude login
```

---

### Step 2 — Run Reverse Engineering (~1.5 hours)

**From a local folder:**
```bash
python run.py --source "C:/projects/my-legacy-app" --output ./results
```

**From a GitHub URL:**
```bash
python run.py --source "https://github.com/org/your-legacy-app" --output ./results
```

Produces 25 documents + Enterprise Knowledge Graph in `./results/`.

---

### Step 3 — Run Forward Engineering (~6–10 hours)

```bash
cd forward-engineering-only
```

**Batch 1** — stack selection, conventions contract, scaffold, sprint planning (~45 min):
```bash
python run_forward.py --input ../results --output ./forward_results
```

> Batch 1 automatically chains into Batch 2. To run them separately, use `--no-auto-batch2`.

**Batch 2** — per-sprint development loop, 6 sprints (~6–10 hours):
```bash
python run_forward_batch2.py --input ../results --output ./forward_results
```

**Skip the interactive stack menu** (use this exact stack):
```bash
python run_forward.py --input ../results --output ./forward_results --target-stack "Backend: Java 17, Spring Boot 3.x | Frontend: React (TypeScript) | Database: PostgreSQL"
```

Generated application code is written to `forward_results/new_app/`.

---

### Step 4 — Resume After Interruption

The pipeline is fully resume-safe. If it stops for any reason, just re-run the same command:
```bash
python run_forward_batch2.py --input ../results --output ./forward_results
```
It continues from the last completed sprint step — nothing is lost.

**If a sprint is stuck (`FAILED_BLOCKED`)**, edit `forward_results/sprint_ledger.json`, change the status to `PENDING`, then re-run.

---

## 🧠 How It Works

The pipeline runs **13 sequential steps** across two phases.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 1 — REVERSE ENGINEERING                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Step 1 ──► Layer 1 Extraction    (regex / AST, zero AI)               │
│             ├── Auto-detect languages (.NET, Java, Python, JS, PL/SQL) │
│             ├── Extract classes, methods, properties                    │
│             ├── Extract DB schema (tables, procs, EF entities)          │
│             └── Extract config, logs, business events                   │
│                                                                         │
│  Step 2 ──► Scan Once             (cache every file, full content)      │
│  Step 3 ──► Scan Agent            (Claude deep-extracts in 30-file      │
│                                    chunks → DEEP_SCAN_OUTPUT.md)        │
│                                                                         │
│  Steps 4–5  ► Business Analysis   (entities, domains, DDD, ubiquitous  │
│                                    language, state machines)            │
│  Steps 6–7  ► Data Analysis       (schema, normalization, PII, flows)  │
│  Steps 8–10 ► Technology Analysis (stack, NFR, security, tech debt)    │
│  Steps 11–12► Application Analysis(controllers, services, APIs)        │
│                                                                         │
│  Step 13 ──► Foundation Synthesis (KG + 5 views + 20 documents)        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     PHASE 2 — FORWARD ENGINEERING                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Batch 1 ──► Stack Selection → Stack Mapping Contract → Scaffolding     │
│              → Sprint Planning (ordered backlog with rationale)         │
│                                                                         │
│  Batch 2 ──► Per-Sprint Development Loop (× 6 sprints):                 │
│              Backend Dev → Security Review → Frontend Dev               │
│              → Test Writer → Test Executor (real subprocess, no LLM)   │
│              → 3-Reviewer Code Review → Fix Loop → Learnings write-back │
│                                                                         │
│  Sprints: Security/Identity → Employee Management → Leave Management    │
│           → Payroll → Performance Reviews → Audit Logging (cross-cut)  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### The Two-Turn Agent Pattern

Every analysis agent uses a unique two-turn design that maximises efficiency:

- **Turn 1** — Agent sees a one-line-per-file FILE MAP → replies with JSON list of exactly which files it needs
- **Turn 2** — Agent receives only those sections from the deep scan → produces its analysis

**Each file is read once and distributed precisely. Zero redundant reads. Zero wasted tokens.**

### Resume-Safe by Design

Every step writes its output to disk immediately. Kill the process at any time — re-run the same command and it continues exactly where it stopped. Each sprint is checkpointed independently so a crash never loses completed work.

### Generated Tech Stack

When run against the included Oracle HRMS sample, the pipeline selected:

| Layer | Technology |
|-------|-----------|
| **Backend** | Java 17, Spring Boot 3.x |
| **Frontend** | React 18, TypeScript |
| **Database** | PostgreSQL 15 (migrated off Oracle) |
| **Auth** | JWT with refresh tokens, AES-256 encryption |
| **Testing** | JUnit 5 + Testcontainers (backend), Jest + React Testing Library (frontend) |

---

## 📄 What It Produces

```
results/
│
├── Source_Extraction/
│   ├── Source_Code.json              ← all classes, methods, properties
│   ├── Database.json                 ← tables, procs, views, EF entities
│   ├── Config.json                   ← parameters, feature flags, connection strings
│   └── Extraction_Summary.json       ← metadata, counts, ready_for_layer2 flag
│
├── Business_Analysis/
│   ├── BA_Structural_Scout.md        ← business entities, state machines, domains
│   └── BA_Deep_Analyst.md            ← DDD, bounded contexts, ubiquitous language
│
├── Data_Analysis/
│   ├── DA_Data_Extractor.md          ← schema, normalization, PII inventory
│   └── DA_Data_Reviewer.md           ← data flows, quality assessment
│
├── Technology_Analysis/
│   ├── TA_Stack_Scout.md             ← tech stack, frameworks, patterns
│   └── TA_Deep_Analyst.md            ← NFR, security posture, technical debt map
│
├── Application_Analysis/
│   ├── AA_App_Extractor.md           ← controllers, services, endpoints
│   └── AA_Quality_Review.md          ← completeness, gap analysis
│
├── Foundation_KnowledgeGraph/
│   ├── ENTERPRISE_KNOWLEDGE_GRAPH.json    ← full structured KG, all evidence-cited
│   ├── CANONICAL_ENTERPRISE_MODEL.md      ← human-readable entity summary
│   ├── ARCHITECTURE_INVENTORY.md          ← every deployable, DB, API, service
│   ├── TRACEABILITY_MATRIX.md             ← capability → process → entity → API → DB
│   └── FORWARD_ENGINEERING_INPUT_MAP.md   ← known / inferred / missing
│
└── ForwardEngineering_Docs/
    ├── 01_BRD.md                          ← Business Requirements Document
    ├── 02_BUSINESS_CAPABILITY_MODEL.md
    ├── 03_USE_CASE_SPECIFICATION.md
    ├── 04_BUSINESS_PROCESS_MODEL.md
    ├── 05_DOMAIN_MODEL.md
    ├── 06_DATA_DICTIONARY.md
    ├── 07_DATA_MODEL_SPECIFICATION.md
    ├── 08_ERD.md
    ├── 09_DATA_FLOW_DIAGRAM.md
    ├── 10_SERVICE_CATALOG.md
    ├── 11_API_CONTRACT_SPECIFICATION.md
    ├── 12_TECHNOLOGY_BLUEPRINT.md
    ├── 13_SECURITY_ARCHITECTURE.md
    ├── 14_NFR_SPECIFICATION.md
    ├── 15_FORWARD_ENGINEERING_SPECIFICATION.md
    ├── 16_GENERATION_MANIFEST.json
    ├── 17_FORWARD_ENGINEERING_READINESS_REPORT.md
    ├── 18_DEPLOYMENT_ARCHITECTURE.md
    ├── 19_FRONTEND_ARCHITECTURE.md
    └── 20_UI_UX_SPECIFICATION.md
```

**Total: 25 documents + 1 Enterprise Knowledge Graph + 5 foundation views**

### Forward Engineering Output

After Batch 2 completes, `forward_results/new_app/` contains a fully buildable application:

```
forward_results/new_app/
│
├── backend/                          ← Spring Boot 3 Java application
│   ├── pom.xml
│   └── src/main/java/com/example/app/
│       ├── security/                 ← JWT auth, refresh tokens, AES-256 encryption
│       ├── employee/                 ← Full employee lifecycle management
│       ├── leave/                    ← Leave requests, approvals, balance tracking
│       ├── payroll/                  ← Pay periods and payroll run management
│       ├── performance/              ← Review cycles and individual assessments
│       └── audit/                    ← Tamper-evident audit logging (cross-cutting)
│
├── frontend/                         ← React 18 + TypeScript application
│   ├── src/features/                 ← One folder per sprint (auth, employee, leave...)
│   └── src/shared/                   ← Shared API client, auth context, components
│
└── backend/src/main/resources/db/migration/
    ├── V1.1__create_user_credentials.sql
    ├── V1.2__create_refresh_tokens.sql
    ├── V1.3__create_employees.sql
    ├── V1.5__create_leave_requests.sql
    ├── V1.6__create_pay_periods_and_payroll_runs.sql
    └── V1.7__create_review_cycles_and_individual_reviews.sql
```

> **To regenerate:** delete `forward_results/` and re-run Batch 1 + Batch 2. The pipeline resumes from any interruption automatically.

---

## 🏗️ Architecture

### Repository Structure

```
automated-reverse-engineering-pipeline/
│
├── run.py                              ← Master orchestrator (13 steps, resumable)
├── requirements.txt
│
├── pipeline/
│   ├── layer1/                         ← Step 1: Deterministic extraction (no AI)
│   │   ├── language_detector.py        ← Auto-detects language by file extension counts
│   │   ├── file_filter.py              ← Excludes tests, build output, vendor dirs
│   │   ├── database_extractor.py       ← SQL DDL, EF Core, Oracle packages
│   │   ├── config_extractor.py         ← appsettings.json, .env, web.config, yaml
│   │   └── extractors/
│   │       ├── dotnet_extractor.py     ← C# / VB.NET regex parser
│   │       ├── java_extractor.py
│   │       ├── python_extractor.py     ← AST-based
│   │       ├── javascript_extractor.py
│   │       ├── plsql_extractor.py
│   │       └── oracle_forms_extractor.py
│   │
│   ├── base_runner.py                  ← Shared: call_claude(), build_file_map()
│   ├── scan_runner.py                  ← Step 2: Full file content cache
│   ├── scan_agent_runner.py            ← Step 3: 30-file chunk deep extraction
│   ├── foundation_runner.py            ← Step 13: KG + 20 documents
│   │
│   └── runners/                        ← Steps 4–12: 8 specialised agents
│       ├── ba_agent1_runner.py / ba_agent2_runner.py
│       ├── da_agent1_runner.py / da_agent2_runner.py
│       ├── ta_agent1_runner.py / ta_agent2_batch1_runner.py / ta_agent2_batch2_runner.py
│       └── aa_agent1_runner.py / aa_agent2_runner.py
│
├── Prompts_Ready_To_Use/               ← 8 Claude agent system prompts (plain markdown)
│
├── forward-engineering-only/           ← Phase 2: Code generation pipeline
│   ├── run_forward.py                  ← Batch 1: stack selection → sprint planning
│   ├── run_forward_batch2.py           ← Batch 2: per-sprint dev loop
│   └── pipeline_forward/
│       ├── fwd_base.py                 ← Shared helpers: call_claude, write_file_bundle
│       ├── stack_selection_runner.py   ← Proposes 2-3 stacks, interactive menu
│       ├── stack_mapping_runner.py     ← Writes conventions contract
│       ├── sprint_planner_runner.py    ← Breaks work into ordered sprints
│       ├── elaboration_runner.py       ← Expands each sprint into tasks
│       ├── scaffold_runner.py          ← Creates project structure + config files
│       ├── backend_dev_runner.py       ← Domain entities, business rules, API endpoints
│       ├── security_review_runner.py   ← Per-sprint security review
│       ├── frontend_dev_runner.py      ← React screens wired to backend API
│       ├── test_writer_runner.py       ← Writes unit + integration tests
│       ├── test_executor_runner.py     ← Real subprocess build + test (no LLM) + fix-loop
│       ├── data_migration_runner.py    ← Flyway SQL migration scripts
│       └── review_runner.py            ← 3 independent reviewers, reconciled
│
├── .claude/
│   └── settings.local.json             ← Pre-approved Claude Code permissions (portable JDK/Maven, C:\ access)
│
├── PIPELINE_STATE.md                   ← Team & agent handoff doc — current status, run commands, fixes
│
└── source/                             ← Sample codebases included for testing
    ├── eShopOnWeb/                     ← Microsoft .NET e-commerce sample
    └── ts-plsql-oracle-forms-hrms/     ← Oracle Forms + PL/SQL legacy HRMS
```

### Supported Source Languages

| Language | File Extensions | Extraction Method |
|---|---|---|
| C# / VB.NET | `.cs` `.vb` | Regex — classes, interfaces, methods, attributes, EF entities |
| Java | `.java` | Regex — classes, annotations, Spring beans |
| Python | `.py` | AST — functions, classes, decorators |
| JavaScript / TypeScript | `.js` `.ts` `.jsx` `.tsx` | Regex — functions, classes, exports |
| PL/SQL | `.sql` `.pks` `.pkb` `.prc` | Regex — packages, procedures, triggers |
| Oracle Forms | `.frmxml` `.mmxml` `.pllxml` | XML parser — form triggers, buttons, field properties |

---

## 🔧 Configuration

### All Run Options

```bash
# Full pipeline (all 13 steps, ~1.5 hours)
python run.py --source <source> --output ./results

# Run one track at a time (safe to mix and match)
python run.py --source <source> --output ./results --track setup        # Steps 1–3
python run.py --source <source> --output ./results --track business     # Steps 4–5
python run.py --source <source> --output ./results --track data         # Steps 6–7
python run.py --source <source> --output ./results --track technology   # Steps 8–10
python run.py --source <source> --output ./results --track application  # Steps 11–12
python run.py --source <source> --output ./results --track foundation   # Step 13

# Re-run a specific step (e.g. only step 9)
python run.py --source <source> --output ./results --from-step 9 --to-step 9

# Skip Layer 1 if already done
python run.py --source <source> --output ./results --skip-layer1
```

### Forward Engineering

```bash
cd forward-engineering-only

# Batch 1: stack selection → scaffold → sprint planning
python run_forward.py --input ../results --output ./forward_results

# Batch 2: per-sprint development loop (6 sprints, ~6-10 hours)
python run_forward_batch2.py --input ../results --output ./forward_results

# Skip the interactive menu by specifying the stack upfront
python run_forward.py --input ../results --output ./forward_results \
  --target-stack "Backend: Java 17, Spring Boot 3.x | Frontend: React (TypeScript) | Database: PostgreSQL"
```

### Environment Variables

```bash
# Override Claude model (default: claude-sonnet-4-6)
export PIPELINE_CLAUDE_MODEL="claude-opus-4-8"

# Skip Testcontainers integration tests (default: skip)
export PIPELINE_SKIP_INTEGRATION_TESTS=1   # skip (default — no Docker needed)
export PIPELINE_SKIP_INTEGRATION_TESTS=0   # run full integration suite (needs Docker)

# Portable JDK/Maven (no admin rights required — point to extracted zip locations)
export JAVA_HOME="C:\tools\jdk21\jdk-21.0.11+10"
export MAVEN_HOME="C:\tools\apache-maven-3.9.6"
```

### No Admin Rights Required

The pipeline fully supports locked-down / no-admin environments. Java and Maven do **not** need to be installed via an installer — the test executor automatically falls back to portable zip extractions:

```bash
# Download Temurin JDK 21 portable zip (no installer) from adoptium.net
# Extract to C:\tools\jdk21\

# Download Apache Maven 3.9.6 zip from archive.apache.org/dist/maven/maven-3/3.9.6/
# Extract to C:\tools\apache-maven-3.9.6\

# Set env vars and run — no admin prompt, no PATH changes needed
set JAVA_HOME=C:\tools\jdk21\jdk-21.0.11+10
set MAVEN_HOME=C:\tools\apache-maven-3.9.6
python run_forward_batch2.py --input ../results --output ./forward_results
```

---

## 📊 Example Output

This repo includes a **complete example run** against the Oracle Forms + PL/SQL legacy HRMS (`source/ts-plsql-oracle-forms-hrms`), with all 25 output documents and the Enterprise Knowledge Graph in `results/`.

To regenerate the forward engineering output (Java + React application), run Batch 1 + Batch 2 — the pipeline is fully resumable and idempotent.

### Enterprise Knowledge Graph (excerpt)

```json
{
  "business_nodes": [
    {
      "id": "BN-001",
      "type": "Aggregate",
      "name": "Employee",
      "confidence": "HIGH",
      "evidence": "EMPLOYEES table, PKG_EMPLOYEE package, EMPLOYEE_FORM Oracle Form",
      "relationships": [
        { "target": "BN-002", "type": "has_many", "cardinality": "1:many" }
      ]
    }
  ],
  "assumptions": [],
  "open_questions": [
    { "id": "OQ-001", "question": "Is LEAVE_BALANCE recalculated on approval or on accrual schedule?" }
  ]
}
```

### Forward-Engineered Application (6 Sprints)

The pipeline generates a working **Java 17 + Spring Boot 3 + React 18 + TypeScript + PostgreSQL** HRMS from the legacy Oracle PL/SQL source:

| Sprint | What was built |
|--------|---------------|
| **1 — Security/Identity** | JWT auth, refresh tokens, AES-256 SSN encryption, role-based access |
| **2 — Employee Management** | Full lifecycle: hire, transfer, promote, terminate, rehire |
| **3 — Leave Management** | Submission, manager approval/rejection, balance tracking |
| **4 — Payroll** | Pay periods, payroll runs, status tracking |
| **5 — Performance Reviews** | Review cycles, individual assessments, scoring |
| **6 — Audit Logging** | Tamper-evident, fail-closed, cross-cutting across all modules |

---

## 🛡️ Design Principles

### Anti-Hallucination
Every node in the Enterprise Knowledge Graph **must cite source file + line numbers**. Confidence is graded `HIGH` (direct evidence) / `MEDIUM` (inferred) / `LOW` (assumed). Unverifiable claims go into a separate `assumptions[]` list — never silently into the main graph.

### Token Efficiency
Files are read once (Step 2), deep-extracted once (Step 3). Each agent requests only the sections it needs via the two-turn pattern. A typical 300-file codebase uses ~40% fewer tokens than naive whole-repo prompting.

### Business-Artifact Tagging
Every extracted method is checked against business keywords (`validate`, `calculate`, `process`, `approve`, `authorize`, `notify`, etc.). Business-critical logic is automatically separated from technical plumbing.

### Fail-Forward Fix Loop
The forward engineering phase never blocks on a failing sprint. The fix-loop feeds test failures back to developer agents, retries up to `--max-retries` times, logs root causes to `LEARNINGS.json` so later sprints benefit, and marks irrecoverable sprints as `FAILED_BLOCKED` while continuing with independent ones.

### Sprint-Level Checkpointing
Every sprint writes its generated files, manifests, and ledger status to disk atomically. A crash, power cut, or rate-limit pause loses at most one in-progress agent call — re-running the same command resumes from the exact sprint step that was interrupted.

---

## 🤝 Team Handoff & Resuming Work

### For team members picking up this project

Read **[PIPELINE_STATE.md](PIPELINE_STATE.md)** first — it contains:
- Exact current status of every phase and sprint
- Run commands to continue from where work left off
- All critical bugs already fixed (don't re-investigate them)
- Portable JDK/Maven setup for no-admin machines
- Key file locations, prompt architecture, and cost estimates

### For AI agents continuing sprint work

1. Read `PIPELINE_STATE.md` for full context
2. Check `forward-engineering-only/forward_results/sprint_ledger.json` for sprint status
3. Reset any `FAILED_BLOCKED` sprint to `PENDING` and re-run Batch 2
4. `.claude/settings.local.json` pre-approves all permissions needed for portable tool setup

### Cloning and continuing on a new machine

```bash
git clone https://github.com/jayaprakash2207/automated-reverse-engineering-pipeline.git
cd automated-reverse-engineering-pipeline
pip install -r requirements.txt
npm install -g @anthropic-ai/claude-code && claude login

# Reverse engineering already done — results/ is in the repo
# Run forward engineering (picks up from where it left off):
cd forward-engineering-only
python run_forward.py --input ../results --output ./forward_results
```

---

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/my-improvement`
3. Commit your changes with descriptive messages
4. Push and open a Pull Request

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=120&section=footer" width="100%"/>

**Built with ❤️ using [Claude AI](https://anthropic.com) · [Python](https://python.org) · [Spring Boot](https://spring.io) · [React](https://react.dev)**

⭐ **Star this repo if it saved you weeks of work!**

</div>
