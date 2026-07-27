---
name: project-pipeline-state
description: "Full state of the automated reverse+forward engineering pipeline — what is done, what is pending, how to resume sprints"
metadata: 
  node_type: memory
  type: project
  originSessionId: a3039413-7d27-401e-923b-671551c92de9
---

# Pipeline Project State

## Reverse Engineering — COMPLETE
All 13 steps done. Output in `results/`. Do NOT re-run.
- `results/ForwardEngineering_Docs/` — 20 docs (01_BRD.md … 20_UI_UX_SPECIFICATION.md)
- `results/Foundation_KnowledgeGraph/` — Enterprise Knowledge Graph JSON + 5 views
- Source codebase: `source/ts-plsql-oracle-forms-hrms/` (Oracle Forms + PL/SQL HRMS)

## Forward Engineering — NOT STARTED (fresh)
`forward-engineering-only/forward_results/` was deleted for a clean run on 2026-07-27.

Run command (from `forward-engineering-only/`):
```
python run_forward.py --input ../results --output ./forward_results
```
Automatically chains into Batch 2. Or run separately:
```
python run_forward_batch2.py --input ../results --output ./forward_results
```

## Target Stack (already decided)
Backend: Java 17, Spring Boot 3.x | Frontend: React (TypeScript) | Database: PostgreSQL
To skip interactive menu: `--target-stack "Backend: Java 17, Spring Boot 3.x | Frontend: React (TypeScript) | Database: PostgreSQL"`

## 6 Sprints (all PENDING — fresh start)
1. Security/Identity Context — JWT, refresh tokens, AES-256, RBAC
2. Employee Management Context — hire/transfer/promote/terminate/rehire
3. Leave Management Context — requests, approvals, balance
4. Payroll Context — pay periods, payroll runs
5. Performance Context — review cycles, individual assessments
6. Action Audit Logging (cross-cutting) — tamper-evident audit log

Sprint status lives in `forward_results/sprint_ledger.json`. Reset FAILED_BLOCKED → PENDING to retry.

## GitHub
https://github.com/jayaprakash2207/automated-reverse-engineering-pipeline — branch: main — all pushed as of 2026-07-27

**Why:** User wants team members and agents to be able to pick up exactly where work left off without re-reading the whole conversation history.
**How to apply:** Always check `forward_results/sprint_ledger.json` for current sprint status before starting any forward engineering work. Read `PIPELINE_STATE.md` in repo root for full handoff context.
