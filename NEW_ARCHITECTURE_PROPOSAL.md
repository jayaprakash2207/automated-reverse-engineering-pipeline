# New Architecture Proposal — Token Reduction for Reverse Engineering Pipeline

> **Status:** Proposal — Not Yet Implemented
> **Author:** Jayaprakash (session: 2026-07-28)
> **Applies to:** Reverse Engineering phase only (Steps 1–13)
> **Forward Engineering:** No changes — already fully automated and working

---

## 1. Why This Proposal Exists

The current pipeline sends **whole files** to Claude in Turn 2. For a typical Oracle PL/SQL file:

- `PKG_EMPLOYEE.pkb` — 400 lines, 15 procedures → agent needs only 3
- `HRMS_EMPLOYEE.frmxml` — 600 lines, 12 triggers → agent needs only 2
- `schema/01_core_tables.sql` — 200 lines, 8 tables → agent needs only 2

Claude reads ~1,350 lines (~18,000 tokens) per agent call but uses ~20% of it.
The other 80% is wasted tokens = wasted money.

**Goal:** Send only what Claude actually needs. Keep accuracy at ~85–90%.

---

## 2. Current Architecture (Before)

```
SOURCE FILES (.sql, .pks, .pkb, .frmxml, .pllxml, .mmxml, .java, .py)
        │
        ▼
Step 1  — Layer 1 extraction (regex/AST, no AI)
        │  Extracts: class names, method signatures, table names, columns
        │  XML stored AS-IS (full whitespace, full indentation)
        ▼
Step 2  — Scan Once (cache full file contents to disk)
        │
        ▼
Step 3  — Scan Agent (Claude, 30-file chunks → DEEP_SCAN_OUTPUT.md)
        │
        ▼
Steps 4–12 — Analysis Agents (BA, DA, TA, AA)
        │
        │  TURN 1: Agent sees FILE MAP (one line per file)
        │          Agent replies: ["PKG_EMPLOYEE.pkb", "HRMS_EMPLOYEE.frmxml"]
        │
        │  TURN 2: Agent receives WHOLE FILE CONTENTS
        │          PKG_EMPLOYEE.pkb  = 400 lines (all 15 procedures)
        │          HRMS_EMPLOYEE.frmxml = 600 lines (all triggers/blocks/items)
        │          TOTAL per call: ~18,000 tokens
        ▼
Step 13 — Foundation Synthesis → 25 docs + Enterprise Knowledge Graph
```

**Problems:**
- Whole files sent even when only 2–3 symbols needed
- XML files verbose with whitespace/indentation
- No awareness of which procedures call which — agent must infer
- ~70–80% of tokens sent are irrelevant to the task

---

## 3. New Architecture (After)

```
SOURCE FILES (.sql, .pks, .pkb, .frmxml, .pllxml, .mmxml, .java, .py)
        │
        ▼
Step 1  — Layer 1 extraction (same as before)
        │  + NEW: XML Canonicalization & Minification
        │    Strip whitespace/indentation from .frmxml/.pllxml/.mmxml
        │    20–60% size reduction before anything else runs
        ▼
Step 2  — Scan Once (cache file contents — XML stored minified)
        │
        ▼
Step 2b — NEW: Symbol Index Builder (no AI, pure Python)
        │  Parses every file, extracts each symbol individually:
        │    PL/SQL .pkb  → each PROCEDURE / FUNCTION separately
        │    PL/SQL .pks  → each signature separately
        │    .frmxml      → each TRIGGER / BUTTON / BLOCK
        │    .sql schema  → each TABLE / INDEX / SEQUENCE
        │    .java        → each METHOD / CLASS
        │  Output: SYMBOL_INDEX.json
        ▼
Step 2c — NEW: Dependency Graph Builder (no AI, pure Python)
        │  Reads SYMBOL_INDEX.json, builds 4 graphs:
        │    Call Graph    — procedure → procedures it calls
        │    Table Graph   — procedure → tables it touches
        │    Trigger Graph — form trigger → procedure → table
        │    Package Graph — package → all its procedures
        │  Output: DEPENDENCY_GRAPH.json
        ▼
Step 3  — Scan Agent (same — but XML already minified = fewer tokens)
        │
        ▼
Steps 4–12 — Analysis Agents (BA, DA, TA, AA)
        │
        │  TURN 1: Agent sees SYMBOL MAP (one line per symbol)
        │          Agent replies: ["PKG_EMPLOYEE.calculate_salary",
        │                          "PKG_PAYROLL.calculate_bonus",
        │                          "EMPLOYEES.table_definition"]
        │
        │  GRAPH EXPANSION (no AI — pure Python):
        │    For each requested symbol, look up DEPENDENCY_GRAPH
        │    Add direct dependencies (1 hop only)
        │    Deduplicate
        │    Example: calculate_salary → adds get_grade + SALARY_GRADES
        │
        │  TURN 2: Agent receives SYMBOL BODIES ONLY
        │          calculate_salary body  = ~45 lines
        │          calculate_bonus body   = ~30 lines
        │          get_grade body         = ~20 lines  (auto-added dep)
        │          EMPLOYEES table def    = ~25 lines
        │          SALARY_GRADES table    = ~15 lines  (auto-added dep)
        │          TOTAL per call: ~3,500 tokens
        ▼
Step 13 — Foundation Synthesis (same — KG + 25 docs)
```

---

## 4. What Is New — Detailed

### 4.1 XML Minification (Step 1 add-on)

**File to change:** `pipeline/layer1/` (add minification step after extraction)

**What it does:** Strips all indentation, blank lines, and unnecessary whitespace from Oracle Forms XML files before they enter the cache.

**Before:**
```xml
<Form name="HRMS_EMPLOYEE" version="10g">
  <Block name="EMPLOYEES">
    <Item
      name="EMP_ID"
      dataType="NUMBER"
      required="true">
    </Item>
    <Item
      name="FIRST_NAME"
      dataType="CHAR"
      maxLength="50">
    </Item>
  </Block>
</Form>
```

**After:**
```xml
<Form name="HRMS_EMPLOYEE" version="10g"><Block name="EMPLOYEES"><Item name="EMP_ID" dataType="NUMBER" required="true"/><Item name="FIRST_NAME" dataType="CHAR" maxLength="50"/></Block></Form>
```

**Saving:** 20–60% on `.frmxml`/`.pllxml`/`.mmxml` files
**Risk:** Zero — whitespace is not semantically meaningful in XML
**Library:** Python standard `xml.etree.ElementTree` — no new dependency

---

### 4.2 Symbol Index Builder (Step 2b — new file)

**New file:** `pipeline/symbol_index_builder.py`

**What it does:** Parses every source file and creates one entry per symbol (procedure, function, trigger, table, form block). Each entry stores the file path, line numbers, what it calls, and what calls it.

**Output — `SYMBOL_INDEX.json`:**
```json
{
  "PKG_EMPLOYEE.calculate_salary": {
    "file": "plsql/PKG_EMPLOYEE.pkb",
    "type": "procedure",
    "lines": [120, 165],
    "package": "PKG_EMPLOYEE",
    "calls": ["PKG_PAYROLL.get_grade", "SALARY_GRADES"],
    "called_by": ["HRMS_EMPLOYEE.WHEN-BUTTON-PRESSED"]
  },
  "PKG_PAYROLL.get_grade": {
    "file": "plsql/PKG_PAYROLL.pkb",
    "type": "procedure",
    "lines": [45, 72],
    "package": "PKG_PAYROLL",
    "calls": ["SALARY_GRADES"],
    "called_by": ["PKG_EMPLOYEE.calculate_salary"]
  },
  "HRMS_EMPLOYEE.WHEN-BUTTON-PRESSED": {
    "file": "forms/HRMS_EMPLOYEE.frmxml",
    "type": "trigger",
    "lines": [45, 52],
    "form": "HRMS_EMPLOYEE",
    "calls": ["PKG_EMPLOYEE.calculate_salary"],
    "called_by": []
  },
  "EMPLOYEES.table_definition": {
    "file": "schema/01_core_tables.sql",
    "type": "table",
    "lines": [1, 35],
    "columns": ["EMP_ID", "FIRST_NAME", "LAST_NAME", "HIRE_DATE", "SALARY"],
    "calls": [],
    "called_by": ["PKG_EMPLOYEE.calculate_salary", "PKG_EMPLOYEE.hire_employee"]
  }
}
```

**Parser rules per file type:**

| File type | Symbol boundary | Start pattern | End pattern |
|---|---|---|---|
| `.pkb` | Procedure/Function | `PROCEDURE name IS` / `FUNCTION name` | `END name;` |
| `.pks` | Procedure signature | `PROCEDURE name(` | `;` |
| `.frmxml` | Trigger | `<Trigger name="..."` | `</Trigger>` |
| `.frmxml` | Block | `<Block name="..."` | `</Block>` |
| `.sql` | Table | `CREATE TABLE name` | `);` |
| `.sql` | Index/Sequence | `CREATE INDEX/SEQUENCE` | `;` |
| `.java` | Method | `public/private/protected ... name(` | closing `}` |

---

### 4.3 Dependency Graph Builder (Step 2c — new file)

**New file:** `pipeline/dependency_graph_builder.py`

**What it does:** Reads `SYMBOL_INDEX.json` and builds 4 directed graphs showing all relationships between symbols.

**Output — `DEPENDENCY_GRAPH.json`:**
```json
{
  "call_graph": {
    "PKG_EMPLOYEE.calculate_salary": ["PKG_PAYROLL.get_grade"],
    "PKG_PAYROLL.get_grade": [],
    "HRMS_EMPLOYEE.WHEN-BUTTON-PRESSED": ["PKG_EMPLOYEE.calculate_salary"]
  },
  "table_graph": {
    "PKG_EMPLOYEE.calculate_salary": ["EMPLOYEES", "SALARY_GRADES"],
    "PKG_EMPLOYEE.hire_employee": ["EMPLOYEES", "EMPLOYEE_HISTORY"]
  },
  "trigger_graph": {
    "HRMS_EMPLOYEE.WHEN-BUTTON-PRESSED": {
      "calls": "PKG_EMPLOYEE.calculate_salary",
      "touches_tables": ["EMPLOYEES", "SALARY_GRADES"]
    }
  },
  "package_graph": {
    "PKG_EMPLOYEE": [
      "calculate_salary", "hire_employee", "terminate_employee",
      "transfer_employee", "promote_employee", "get_employee"
    ]
  }
}
```

**Used by:** Graph Expansion step between Turn 1 and Turn 2

---

### 4.4 Symbol Map (replaces File Map in Turn 1)

**Files to change:** All 4 agent runners (`ba_agent1_runner.py`, `da_agent1_runner.py`, `aa_agent1_runner.py`, `ta_agent1_runner.py`) and `base_runner.py`

**What changes:** `build_file_map()` replaced with `build_symbol_map()` which reads `SYMBOL_INDEX.json` and produces one line per symbol instead of one line per file.

**Before (File Map sent to Turn 1):**
```
plsql/PKG_EMPLOYEE.pkb
plsql/PKG_PAYROLL.pkb
plsql/PKG_LEAVE.pkb
schema/01_core_tables.sql
forms/HRMS_EMPLOYEE.frmxml
```

**After (Symbol Map sent to Turn 1):**
```
PKG_EMPLOYEE.calculate_salary     [procedure]  calls: get_grade, SALARY_GRADES
PKG_EMPLOYEE.hire_employee        [procedure]  calls: EMPLOYEES, EMPLOYEE_HISTORY
PKG_EMPLOYEE.terminate_employee   [procedure]  calls: EMPLOYEES, EMPLOYEE_HISTORY
PKG_PAYROLL.calculate_bonus       [procedure]  calls: EMPLOYEES, PAY_GRADES
PKG_PAYROLL.get_grade             [procedure]  calls: SALARY_GRADES
EMPLOYEES.table_definition        [table]      columns: EMP_ID, FIRST_NAME, SALARY...
HRMS_EMPLOYEE.WHEN-BUTTON-PRESSED [trigger]    calls: PKG_EMPLOYEE.calculate_salary
```

Agent can now request exactly the symbols it needs — no whole files.

---

### 4.5 Graph Expansion (new function in base_runner.py)

**What it does:** After Turn 1 returns a list of requested symbols, this function looks up each symbol in `DEPENDENCY_GRAPH.json` and adds its direct dependencies (1 hop).

**Example:**
```
Turn 1 requests:          Graph expander adds:       Final Turn 2 receives:
calculate_salary    →     get_grade (called by it)   calculate_salary body
                          SALARY_GRADES (table used) get_grade body
                                                     SALARY_GRADES definition
```

**Why 1 hop only:** Going deeper (2–3 hops) risks including too many symbols and defeating the purpose. The agent can always ask for more in the analysis if needed.

**Fallback:** If a requested symbol is not found in the index (parser missed it), the whole file is sent instead — same as current behaviour. No accuracy regression.

---

## 5. Token Savings — Detailed Numbers

For the Oracle HRMS source (`source/ts-plsql-oracle-forms-hrms`):

### Per Turn 2 call (BA Agent example):

| | Before | After |
|---|---|---|
| Files/symbols sent | 3 whole files | 8 symbol bodies |
| PKG_EMPLOYEE.pkb | 400 lines (all 15 procs) | 3 procedures × ~45 lines = 135 lines |
| PKG_PAYROLL.pkb | 350 lines (all 12 procs) | 2 procedures × ~40 lines = 80 lines |
| HRMS_EMPLOYEE.frmxml | 600 lines (full XML) | 2 triggers × ~25 lines = 50 lines + auto-deps ~65 lines |
| **Total** | **~1,350 lines / ~18,000 tokens** | **~330 lines / ~3,500 tokens** |
| **Saving** | — | **~80%** |

### Across all 9 agent calls (Steps 4–12):

| | Before | After |
|---|---|---|
| Total tokens for Steps 4–12 | ~160,000 | ~32,000–50,000 |
| Saving | — | ~65–80% |
| Cost at $3/MTok (Sonnet) | ~$0.48 | ~$0.10–0.15 |

### Full pipeline:

| Phase | Before | After | Saving |
|---|---|---|---|
| Step 3 (Scan Agent — XML minified) | ~$2–3 | ~$1.5–2 | ~25% |
| Steps 4–12 (Analysis agents) | ~$4–6 | ~$1–2 | ~65–80% |
| Step 13 (Synthesis) | ~$1–2 | ~$1–2 | None |
| **Total reverse engineering** | **~$7–11** | **~$3–6** | **~50–60%** |

---

## 6. Accuracy & Quality Assessment

| Aspect | Before | After | Change |
|---|---|---|---|
| Schema coverage | ~85–90% | ~85–90% | Same |
| Procedure coverage | ~85–90% | ~85–90% | Same |
| Form trigger coverage | ~85–90% | ~85–90% | Same |
| Output quality | Good | Slightly better | Less noise in context |
| Risk of missing symbols | Low | Low + fallback | Fallback covers parser gaps |

**Why quality improves slightly:** Agent context is 100% relevant symbols. No irrelevant procedures diluting the analysis. Agent focuses entirely on requested logic.

**New risk:** Symbol parser boundary detection. Mitigated by fallback — if symbol not in index, whole file sent.

---

## 7. Implementation Plan

| Step | What to build | File | Effort |
|---|---|---|---|
| 1 | XML minification | `pipeline/layer1/xml_minifier.py` | 2–3 hours |
| 2 | Symbol Index Builder | `pipeline/symbol_index_builder.py` | 4–6 hours |
| 3 | Dependency Graph Builder | `pipeline/dependency_graph_builder.py` | 3–4 hours |
| 4 | `build_symbol_map()` in base_runner | `pipeline/base_runner.py` | 2–3 hours |
| 5 | Graph expansion function | `pipeline/base_runner.py` | 2–3 hours |
| 6 | Update 4 agent runners | `pipeline/runners/*_agent1_runner.py` | 2–3 hours |
| 7 | Wire new steps into `run.py` | `run.py` | 1 hour |
| 8 | Test on HRMS source, verify output | — | 2–3 hours |
| **Total** | | | **~18–26 hours** |

### Recommended order:
1. XML minification first — isolated, zero risk, immediate saving
2. Symbol Index + Dependency Graph — build and verify output files
3. Update base_runner + agent runners — plug into existing flow
4. Full pipeline test run on HRMS source

---

## 8. Files Changed vs Files Added

### New files (pure Python, no AI):
```
pipeline/layer1/xml_minifier.py          ← XML canonicalization + minification
pipeline/symbol_index_builder.py         ← parses all source → SYMBOL_INDEX.json
pipeline/dependency_graph_builder.py     ← builds graphs → DEPENDENCY_GRAPH.json
```

### Modified files:
```
pipeline/base_runner.py                  ← add build_symbol_map(), graph_expand()
pipeline/runners/ba_agent1_runner.py     ← use symbol map in Turn 1
pipeline/runners/da_agent1_runner.py     ← use symbol map in Turn 1
pipeline/runners/aa_agent1_runner.py     ← use symbol map in Turn 1
pipeline/runners/ta_agent1_runner.py     ← use symbol map in Turn 1
run.py                                   ← add Step 2b, Step 2c calls
```

### Unchanged:
```
Everything in forward-engineering-only/  ← no changes at all
Prompts_Ready_To_Use/*.md               ← no changes
pipeline/runners/*_agent2_runner.py     ← no changes
pipeline/foundation_runner.py           ← no changes
results/                                ← existing outputs untouched
```

---

## 9. What Is NOT Changing

- Forward engineering (Batch 1 + 2) — fully working, no changes needed
- All 25 output documents — same format, same content
- Enterprise Knowledge Graph — same structure
- Agent prompts — same `.md` files in `Prompts_Ready_To_Use/`
- Resume-safe behaviour — still checkpointed at every step
- GitHub URL — same repo

---

## 10. Decision Needed From Team

| Question | Options |
|---|---|
| Implement now or after forward engineering completes? | Now / After Batch 2 |
| Start with XML minification only (low risk) or full new arch? | Partial / Full |
| Acceptable parser fallback behaviour? | Send whole file (proposed) / Fail loudly |
| Target accuracy after change? | Keep ~85–90% / Push for higher |

---

## 11. Summary

| | Before | After |
|---|---|---|
| What Turn 2 receives | Whole files | Symbol bodies + direct deps only |
| Tokens per agent call | ~18,000 | ~3,500 |
| Total pipeline cost | ~$25–55 | ~$15–35 |
| Reverse engineering cost | ~$7–11 | ~$3–6 |
| Accuracy | ~85–90% | ~85–90% |
| New dependencies | None | None (stdlib only) |
| Implementation effort | — | ~18–26 hours |
| Forward engineering affected | — | Not at all |

**Recommendation:** Implement XML minification immediately (2–3 hours, zero risk). Plan Symbol Index + Dependency Graph for the next session after forward engineering completes.

---

*Proposal written: 2026-07-28 | Pipeline version: v2 | Source: ts-plsql-oracle-forms-hrms*
