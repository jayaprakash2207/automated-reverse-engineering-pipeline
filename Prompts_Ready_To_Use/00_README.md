# Ready-to-Use Prompts — Reverse Engineering Pipeline

These are the complete, fully working prompts for reverse engineering any legacy codebase into an enterprise architecture package.

**Paste each prompt directly into Claude. No assembly needed. No missing parts.**

> **⚠️ These are for MANUAL / interactive use** — you paste them into Claude and point Claude at a live codebase (open folder in VS Code, uploaded zip, or pasted tree). They expect a human in the loop and a real source tree.
>
> They are **NOT** the prompts the automated `run_pipeline.py` uses. That headless pipeline uses its own data-driven prompts (`layer2/layer2_prompt.md`, `data-architecture/DA_*`, etc.) which consume Layer 1's extracted JSON and write files silently. Do not wire these interactive prompts into the headless runner — they will stall waiting for human input.

---

## The 8 Prompts — Run In This Order

```
STEP 1 → 01_BA_Agent1_StructuralScout.md      Business layer scan
STEP 2 → 02_BA_Agent2_DeepAnalyst.md          Business layer deep analysis
STEP 3 → 03_DA_Agent1_DataExtractor.md        Data layer extraction
STEP 4 → 04_DA_Agent2_DataReviewer.md         Data layer review
STEP 5 → 05_TA_Agent1_StackScout.md           Technology layer scan
STEP 6 → 06_TA_Agent2_DeepAnalyst.md          Technology layer deep analysis
STEP 7 → 07_AA_Agent1_AppExtractor.md         Application layer extraction
STEP 8 → 08_AA_Agent2_QualityReview.md        Application layer quality review
```

---

## How to Run Each Prompt

### Step 1 — Open Claude (claude.ai or Claude Code)

### Step 2 — Start a new conversation

### Step 3 — Paste the prompt file contents

Copy the entire contents of the `.md` file and paste it as your first message.

### Step 4 — Provide the codebase

After pasting the prompt, either:
- Open the codebase folder in VS Code and use Claude Code
- Upload a zip of the codebase
- Paste the file tree

### Step 5 — Run Agent 1, then feed output to Agent 2

Each layer has 2 agents. Agent 2 needs Agent 1's output to work.
Always run Agent 1 first and paste its output before running Agent 2.

---

## Layer-by-Layer Guide

### Business Layer (Steps 1 + 2)

**Agent 1 (01_BA_Agent1_StructuralScout.md)**
- Scans the codebase structure — entities, routes, state values, roles
- Produces 6 inventory files
- Does NOT interpret meaning — just maps what exists

**Agent 2 (02_BA_Agent2_DeepAnalyst.md)**
- Reads Agent 1's 6 files
- Reads deep into method bodies and validation logic
- Produces: Business Capability Map, Process Flows, Business Rules, Stakeholder Matrix, Value Stream Maps, Pain Points

---

### Data Layer (Steps 3 + 4)

**Agent 1 (03_DA_Agent1_DataExtractor.md)**
- Scans all entities, migrations, repositories, queries
- Attempts live DB connection (documents exact error if it fails)
- Produces 13 output files: schema catalogue, ERD, data dictionary, PII inventory, data flow map, etc.

**Agent 2 (04_DA_Agent2_DataReviewer.md)**
- Reviews Agent 1's 13 files
- Validates schema, relationships, data quality findings
- Produces review report with verified findings

---

### Technology Layer (Steps 5 + 6)

**Agent 1 (05_TA_Agent1_StackScout.md)**
- Scans all config files, dependency manifests, CI/CD pipelines, infrastructure files
- Maps every technology component, version, and integration endpoint
- Produces 6 inventory files — no interpretation, facts only

**Agent 2 (06_TA_Agent2_DeepAnalyst.md)**
- Reads Agent 1's 6 files
- Analyzes patterns, risks, NFRs, security posture, tech debt
- Produces: Technology Blueprint, Security Assessment, NFR analysis, Migration Risk report

---

### Application Layer (Steps 7 + 8)

**Agent 1 (07_AA_Agent1_AppExtractor.md)**
- Scans all services, interfaces, APIs, dependency wiring, call flows
- Runs 6 internal phases: inventory → parse → evidence → final → forward-engineering → security
- Produces full application architecture with dependency graph, violation register, API contracts

**Agent 2 (08_AA_Agent2_QualityReview.md)**
- Reviews Agent 1's output
- Validates JSON, graph edges, evidence traceability, completeness
- Produces PASS / PARTIAL / FAIL verdict with specific findings

---

## What You Get After All 8 Steps

All outputs feed into the **Foundation Layer** (Knowledge Graph synthesis) which produces:
- Enterprise Knowledge Graph (all nodes from all 4 layers)
- Canonical Enterprise Model
- Traceability Matrix
- Forward Engineering Input Map

Then from there → the **20 Forward Engineering Documents**.

---

## Tips

- Run each agent in a **fresh conversation** — do not mix layers in the same chat
- Always paste Agent 1's complete output before running Agent 2 in the same conversation
- If Agent 1 flags LOW CONFIDENCE items → resolve them before running Agent 2
- For large codebases → Agent 1 will process in chunks; let it finish all chunks before running Agent 2
- These prompts work on **any language/framework** — not just .NET
