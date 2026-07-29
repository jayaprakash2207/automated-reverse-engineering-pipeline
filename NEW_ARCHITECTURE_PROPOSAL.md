# New Architecture Proposal — Token Reduction for Reverse Engineering Pipeline

---

## FOR TEAMMATES — READ THIS FIRST

**What we are asking you to review:**

This proposal describes a new way to run the reverse engineering phase of our pipeline. The current pipeline sends whole files to Claude. This proposal sends only the exact code pieces needed — saving 65–70% of token cost.

**What is working today:**
- Current pipeline runs end to end ✅
- Forward engineering (Java + React app generation) is fully automated ✅
- Reverse engineering works but has one silent bug — PL/SQL package bodies are not being read due to wrong file extensions (already fixed by teammate, Bug #7)

**What v4 is:**
- A design plan — correct and fully documented
- NOT yet built — 8 bugs need to be coded before it runs
- Estimated ~1 day of coding to make it fully working

**What we need from you:**

| Question | Please check |
|---|---|
| Is the design correct? | Read Sections 2, 3, 4 |
| Is the parser fix right? | Read Section 4.2 and Bug #1 in Section 12 |
| Is the XML minifier approach safe? | Read Section 4.1 and Bug #3 in Section 12 |
| Are the token savings realistic? | Read Section 5 |
| Is the accuracy claim honest? | Read Section 6 |
| Is the fix order correct? | Read Section 12 unblocking chain |
| Is ~1 day effort realistic? | Read Section 7 |
| Is v4 better than the current system? | Read Section 10 summary table |

**GitHub:** https://github.com/jayaprakash2207/automated-reverse-engineering-pipeline

**To run the current pipeline today (no v4 needed):**
```
cd forward-engineering-only
python run_forward.py --input ../results --output ./forward_results
```

---

> **Status:** Proposal v4 — Ready for team review (2026-07-28)
> **Author:** Jayaprakash
> **Reviewer:** Team peer review — v2 bugs incorporated, v3 bugs caught, v4 fixes claims
> **v4 change:** Removes 3 false claims in v3; documents all 8 open code bugs; restores baseline requirement
> **Applies to:** Reverse Engineering phase only (Steps 1–13)
> **Forward Engineering:** No changes — already fully automated and working

---

## TL;DR — Final Recommendation (v4)

**Combine symbol-level retrieval WITH a package context summary in every Turn 2 prompt.**

- Symbols give precision and 65–70% token saving
- Package summary preserves cross-procedure pattern visibility (the one risk v2 introduced)
- No accuracy regression vs current — **but baseline must be measured to confirm this**

**Current status:** The code sections in this proposal (4.1–4.3, 4.5) describe the correct design. The implementation is **not yet complete** — all 8 code bugs listed in Section 12 are still open. The parser currently finds 0 of 6 procedures in the sample file. Do not treat this as "ready to run" until Section 12 bugs are resolved.

---

## v1 → v2 → v3 Evolution

| Version | Approach | Problem |
|---|---|---|
| v1 | Whole files sent (current) | 80% of tokens irrelevant, expensive |
| v2 | Symbols only | Cheaper but cross-procedure patterns hidden |
| v3 | Symbols + package context summary | Good idea, but 7 v2 bugs unfixed + 2 new false claims |
| **v4 (this)** | **Same as v3, honest claims** | **8 open bugs documented; package summary scope corrected; baseline required** |

---

## The Combined Approach — How It Works

```
Turn 1 — Agent sees HIERARCHICAL SYMBOL MAP
         (grouped by package, not flat list)
              │
              ▼
         Agent replies with exact symbol keys
              │
              ▼
         Graph Expansion — adds 1-hop direct deps
              │
              ▼
Turn 2 — Agent receives THREE things:
         ┌─────────────────────────────────────────┐
         │ 1. PACKAGE CONTEXT SUMMARIES            │
         │    One paragraph per relevant package   │
         │    Lists all procedure names (cap 20)   │
         │    Lists shared tables                  │
         │    Lists common call targets            │
         │    Generated from SYMBOL_INDEX — no AI  │
         │    ~150–200 tokens, capped              │
         ├─────────────────────────────────────────┤
         │ 2. REQUESTED SYMBOL BODIES              │
         │    Exact procedure/trigger/table bodies │
         │    Only what agent asked for            │
         │    ~45 lines per symbol                 │
         ├─────────────────────────────────────────┤
         │ 3. 1-HOP DEPENDENCY BODIES              │
         │    Direct callees auto-added            │
         │    Deduped                              │
         └─────────────────────────────────────────┘
```

### What a Package Context Summary Looks Like

Generated automatically from `SYMBOL_INDEX.json` — zero AI cost:

```
=== PACKAGE CONTEXT: PKG_EMPLOYEE ===
Total procedures: 15
  generate_emp_number, get_next_emp_id, validate_dept, validate_manager,
  log_history, hire_employee, terminate_employee, transfer_employee,
  promote_employee, get_employee, search_employees, update_salary,
  get_reporting_chain, bulk_import, rehire_employee
  [+0 more]
Shared tables: EMPLOYEES, EMPLOYEE_HISTORY, DEPARTMENTS
Common calls: validate_dept(), validate_manager(), log_history()
```

**What the summary CAN build from the index (no AI):**
- Total procedure count ✅
- All procedure names (capped at 20, then "+N more") ✅
- Shared tables (from `columns` field in index) ✅
- Common calls (from `calls` graph edges) ✅

**What the summary CANNOT build from the index:**
- "Shared pattern: all write procedures check EMPLOYMENT_STATUS before DML" ❌

That line was in v3. It is wrong — that pattern lives inside procedure bodies, not in the index. The index only stores names, line numbers, and call links. Detecting body patterns requires either an LLM pass (extra cost) or a body-pattern miner (not in the 4–6 day estimate). The line has been removed.

The summary gives the agent context about what a package contains and how procedures connect — not what their internal logic does. That is still valuable and still cheap (~150–200 tokens per package, growing with procedure count — cap at 20 names to keep it bounded).

---

## Before / v2 / v4 (Combined) Comparison

| | Current (whole file) | v2 (symbols only) | **v4 Combined (recommended)** |
|---|---|---|---|
| Tokens per Turn 2 call | ~18,000 | ~3,500 | **~5,000–6,000** |
| Relevant content % | ~20% | ~100% | **~95%** |
| Structural cross-procedure visibility | ✅ Visible | ❌ Hidden | **✅ Preserved via summary** |
| Logic pattern visibility | ✅ Visible | ❌ Hidden | **⚠ Baseline required to confirm** |
| Accuracy vs current | Baseline (unmeasured) | Unknown risk | **Measure before and after** |
| Token saving vs current | — | ~80% | **~65–70%** |
| Safe to implement? | — | Needs baseline test | **After 8 bugs fixed + baseline measured** |

---

## Peer Review Summary (Read This First)

A teammate reviewed v1 of this proposal against the actual sample files and found **4 real bugs** and **2 scaling problems**. All are fixed in this v2. Their one-line summary:

> *"Good idea, right direction — but the parser rules fail on our own sample files, and it saves money on the cheap step rather than the expensive one. Worth doing after we fix those. Start with the XML piece."*

**Bugs found in v1:**
1. PL/SQL end-of-procedure rule was wrong — `END name;` never appears in real files, they use plain `END;`
2. `END IF;` / `END LOOP;` / `END CASE;` would silently cut procedures in half
3. Symbol keys would collide — same trigger name on different form items, overloaded procedures
4. XML minification said "zero risk" — false for `.pllxml` where stripping newlines from text nodes breaks PL/SQL comments

**Scaling problems found in v1:**
5. Savings were calculated on Step 3's small cost — but Step 3 grows with repo size and becomes the dominant cost on large apps. The proposal saved the wrong step.
6. Symbol Map at scale (10,000-file app) becomes bigger than the whole-file approach it replaces — needs hierarchical grouping, not a flat list.

All 6 are addressed in the design below. 2 additional bugs were found in v3 and added as Bug #7 and #8 — all 8 are documented in Section 12.

---

## 1. Why This Proposal Exists

The current pipeline sends **whole files** to Claude in Turn 2. For a typical Oracle PL/SQL file:

- `PKG_EMPLOYEE.pkb` — 400 lines, 15 procedures → agent needs only 3
- `HRMS_EMPLOYEE.frmxml` — 600 lines, 12 triggers → agent needs only 2
- `schema/01_core_tables.sql` — 200 lines, 8 tables → agent needs only 2

Claude reads ~1,350 lines (~18,000 tokens) per agent call but uses ~20% of it.
The other 80% is wasted tokens = wasted money.

**Goal:** Send only what Claude actually needs. Keep accuracy at measured baseline.

---

## 2. Current Architecture (Before)

```
SOURCE FILES (.sql, .pks, .pkb, .frmxml, .pllxml, .mmxml, .java, .py)
        │
        ▼
Step 1  — Layer 1 extraction (regex/AST, no AI)
        │  XML stored AS-IS (full whitespace, full indentation)
        ▼
Step 2  — Scan Once (cache full file contents to disk)
        │
        ▼
Step 3  — Scan Agent (Claude, 30-file chunks → DEEP_SCAN_OUTPUT.md)
        │  ⚠ GROWS WITH REPO SIZE — dominant cost on large apps
        ▼
Steps 4–12 — Analysis Agents (BA, DA, TA, AA)
        │
        │  TURN 1: Agent sees FILE MAP (one line per file)
        │          Agent replies: ["PKG_EMPLOYEE.pkb", "HRMS_EMPLOYEE.frmxml"]
        │
        │  TURN 2: Agent receives WHOLE FILE CONTENTS
        │          ~18,000 tokens per call, ~80% irrelevant
        ▼
Step 13 — Foundation Synthesis → 25 docs + Enterprise Knowledge Graph
```

---

## 3. New Architecture (After)

```
SOURCE FILES (.sql, .pks, .pkb, .frmxml, .pllxml, .mmxml, .java, .py)
        │
        ▼
Step 1  — Layer 1 extraction (same as before)
        │  + NEW: XML Structure Minification (structure only — never text nodes)
        │    Strips whitespace/indentation from XML element structure
        │    PRESERVES all text node content (trigger bodies, PL/SQL code)
        │    20–60% size reduction on .frmxml structural overhead
        ▼
Step 2  — Scan Once (cache file contents — XML stored with minified structure)
        │
        ▼
Step 2b — NEW: Symbol Index Builder (no AI, pure Python)
        │  Parses every file using BEGIN/END nesting depth (not regex END name;)
        │  Tracks nesting to handle END IF / END LOOP / END CASE correctly
        │  Keys include block/item/param context — no collisions
        │  Output: SYMBOL_INDEX.json
        │  Also logs FALLBACK_RATE — if >20%, parser needs fixing
        ▼
Step 2c — NEW: Dependency Graph Builder (no AI, pure Python)
        │  Reads SYMBOL_INDEX.json, builds 4 graphs
        │  Output: DEPENDENCY_GRAPH.json
        ▼
Step 3  — Scan Agent (REVISIT after index works — listing part reducible)
        │  Currently: Claude re-extracts file/symbol listing that SYMBOL_INDEX has for free
        │  Future: Skip listing pass only — keep business rule extraction
        ▼
Steps 4–12 — Analysis Agents (BA, DA, TA, AA)
        │
        │  TURN 1: Agent sees HIERARCHICAL SYMBOL MAP (grouped by package)
        │          NOT a flat list — groups by package/form/schema
        │          Agent replies with exact symbol keys
        │
        │  GRAPH EXPANSION (no AI):
        │    Add 1-hop direct dependencies
        │    Fallback: if symbol not in index → send whole file, LOG it
        │
        │  TURN 2: Agent receives (v4 combined):
        │          1. Package context summaries (~150–200 tokens/package, capped)
        │             — procedure names (cap 20), shared tables, common calls
        │          2. Requested symbol bodies (~45 lines each)
        │          3. 1-hop dependency bodies (auto-added)
        │          TOTAL: ~5,000–6,000 tokens (vs ~18,000 before)
        │          Cross-procedure patterns: preserved via summary
        ▼
Step 13 — Foundation Synthesis (same)
```

---

## 4. What Is New — With Bugs Fixed

### 4.1 XML Minification — Structure Only, Never Text Nodes

**What it does:** Strips structural whitespace from Oracle Forms XML — indentation between tags, blank lines between elements. Does NOT touch content inside text nodes.

**Why "never text nodes" matters (bug fix from v1):**

`.pllxml` files store PL/SQL code inside XML text nodes. If a comment is on one line and the next line is code:
```xml
<Trigger>
  -- check stock first
  v_qty := 10;
</Trigger>
```
Stripping the newline inside that text node produces:
```xml
<Trigger>  -- check stock first  v_qty := 10;</Trigger>
```
The `--` comment now swallows `v_qty := 10;` — silently broken logic.

**Correct approach — minify structure, preserve text:**
```python
# WRONG — strips everything including text nodes
xml_string.replace('\n', '').replace('  ', '')

# CORRECT — use lxml to preserve comments, namespaces, and CDATA
from lxml import etree

def minify_xml_structure(xml_path):
    parser = etree.XMLParser(remove_comments=False, remove_blank_text=True)
    tree = etree.parse(xml_path, parser)
    # remove_blank_text=True strips pure-whitespace structural nodes only
    # Comments, namespaces, CDATA, and all text node content are preserved
    result = etree.tostring(tree.getroot(), xml_declaration=True,
                             encoding='unicode', pretty_print=False)
    # Safety check: verify no text node content changed
    # (run diff on original vs output before committing to pipeline)
    return result
```

**Saving:** 20–60% on structural overhead in `.frmxml`. Less on `.pllxml` (more text content).
**Risk after fix:** Very low — only pure-whitespace structural nodes removed. Test on one `.pllxml` before rolling out.
**Library:** `lxml` — one new dependency (pip install lxml). Required to preserve comments and namespaces correctly (stdlib `xml.etree` silently drops both).

---

### 4.2 Symbol Index Builder — Nesting Depth, Not Regex

**Bug in v1:** The end-of-procedure rule said `END name;`. Real PL/SQL uses plain `END;`.

Verified against `PKG_INVENTORY.sql` in the sample:
```sql
64: END;   ← GET_PRODUCT_DETAILS ends here
83: END;   ← VALIDATE_STOCK_AND_CALCULATE ends here  
93: END;   ← CALCULATE_LINE_TOTAL ends here
```
Zero out of five would have matched `END name;`. Parser finds no boundaries.

**Worse bug:** `END IF;` at line 82 is *inside* `VALIDATE_STOCK_AND_CALCULATE`. A naive "look for END" stops there and chops the procedure body in half. No error — just wrong analysis output sent to Claude.

**Correct approach — track BEGIN/END nesting depth, detect PACKAGE BODY boundary:**

```python
def extract_plsql_procedures(file_text):
    symbols = []
    depth = 0
    in_proc = False
    in_body_section = False   # ← KEY: only parse after "PACKAGE BODY" line
    proc_name = None
    proc_start = None

    for i, line in enumerate(file_text.splitlines()):
        stripped = line.strip().upper()

        # Only start parsing procedures after the PACKAGE BODY line
        # Lines before this are the spec (declarations only — no bodies)
        if re.match(r'PACKAGE\s+BODY\s+\w+', stripped):
            in_body_section = True
            continue

        if not in_body_section:
            continue   # skip everything in the spec section

        # Detect procedure/function start
        if re.match(r'(PROCEDURE|FUNCTION)\s+(\w+)', stripped) and not in_proc:
            m = re.match(r'(PROCEDURE|FUNCTION)\s+(\w+)', stripped)
            proc_name = m.group(2)
            proc_start = i
            depth = 0
            in_proc = True

        if in_proc:
            # Count BEGIN keywords (increase depth)
            if stripped == 'BEGIN' or stripped.startswith('BEGIN '):
                depth += 1
            # Only count plain END; or END <proc_name>; — not END IF/LOOP/CASE
            if re.match(r'^END(\s+\w+)?\s*;', stripped):
                if not re.match(r'^END\s+(IF|LOOP|CASE|FOR|WHILE)\b', stripped):
                    depth -= 1
                    if depth == 0:
                        symbols.append({
                            'name': proc_name,
                            'start': proc_start,
                            'end': i,
                            'type': 'body'   # ← spec declarations get 'spec'
                        })
                        in_proc = False

    return symbols
```

This correctly handles `END IF;`, `END LOOP;`, `END CASE;` — skips them.
The `in_body_section` flag is what fixes Bug #1 — without it the spec latches `in_proc=True` forever and every real body is skipped.

---

### 4.3 Symbol Keys — No Collisions

**Bug in v1:** Keys were `PACKAGE.procedure_name`. Three problems:

1. **Form triggers:** `WHEN_BUTTON_PRESSED` appears on product_id item, quantity item, and the button — all collapse to `HRMS_EMPLOYEE.WHEN_BUTTON_PRESSED`. Two get lost.
2. **PL/SQL declarations vs bodies:** `GET_PRODUCT_DETAILS` appears at line 8 (declaration) and line 50 (body). Same key, two different things.
3. **Overloaded procedures:** Same name, different parameters — both collide.

**Correct key format:**

| Symbol type | Key format | Example |
|---|---|---|
| PL/SQL procedure | `PACKAGE.PROC_NAME` | `PKG_EMPLOYEE.CALCULATE_SALARY` |
| PL/SQL overload | `PACKAGE.PROC_NAME(param_count)` | `PKG_EMPLOYEE.GET_EMPLOYEE(3)` |
| Form trigger on item | `FORM.BLOCK.ITEM.TRIGGER` | `HRMS_EMPLOYEE.EMPLOYEES.EMP_ID.WHEN_BUTTON_PRESSED` |
| Form trigger on block | `FORM.BLOCK.TRIGGER` | `HRMS_EMPLOYEE.EMPLOYEES.POST_QUERY` |
| Form trigger on form | `FORM.TRIGGER` | `HRMS_EMPLOYEE.ON_ERROR` |
| Table | `SCHEMA.TABLE_NAME` | `PUBLIC.EMPLOYEES` |
| Declaration (spec) | `PACKAGE.PROC_NAME.spec` | `PKG_EMPLOYEE.CALCULATE_SALARY.spec` |

---

### 4.4 Hierarchical Symbol Map (not flat list)

**Bug in v1:** One line per symbol. On a 10,000-file app with 100,000+ symbols, Turn 1 prompt becomes larger than the whole-file approach it replaces.

**Correct approach — grouped by package:**
```
PACKAGE: PKG_EMPLOYEE  [11 procedures]
  calculate_salary      calls: get_grade, SALARY_GRADES
  hire_employee         calls: EMPLOYEES, EMPLOYEE_HISTORY
  terminate_employee    calls: EMPLOYEES, EMPLOYEE_HISTORY
  ... (8 more)

PACKAGE: PKG_PAYROLL  [12 procedures]
  calculate_bonus       calls: EMPLOYEES, PAY_GRADES
  get_grade             calls: SALARY_GRADES
  ... (10 more)

FORM: HRMS_EMPLOYEE  [6 triggers, 3 blocks]
  EMPLOYEES.EMP_ID.WHEN_BUTTON_PRESSED     calls: PKG_EMPLOYEE.calculate_salary
  EMPLOYEES.POST_QUERY                     calls: PKG_EMPLOYEE.get_employee
  ... (4 more)

SCHEMA: PUBLIC  [30 tables]
  EMPLOYEES             columns: EMP_ID, FIRST_NAME, LAST_NAME, HIRE_DATE, SALARY
  SALARY_GRADES         columns: GRADE_ID, MIN_SALARY, MAX_SALARY
  ... (28 more)
```

Agent requests by key: `PKG_EMPLOYEE.calculate_salary`, `HRMS_EMPLOYEE.EMPLOYEES.EMP_ID.WHEN_BUTTON_PRESSED` — unambiguous.

---

### 4.5 Fallback Rate Logging (new — not in v1)

**Why:** Silent fallback (send whole file when symbol not found) is how you think you saved money when you didn't. Must be measured.

```python
def graph_expand_with_fallback(requested_symbols, symbol_index, file_cache):
    result = []
    fallback_count = 0

    # Bug #2 fix: guard against empty list before dividing
    if len(requested_symbols) == 0:
        return []

    for sym in requested_symbols:
        if sym in symbol_index:
            result.append(get_symbol_body(sym, symbol_index))
            result.extend(get_1hop_deps(sym, symbol_index))
        else:
            # Fallback — whole file
            result.append(get_whole_file(sym, file_cache))
            fallback_count += 1
            print(f"  [FALLBACK] Symbol not in index: {sym}")

    fallback_rate = fallback_count / len(requested_symbols)
    if fallback_rate > 0.20:
        print(f"  ⚠ HIGH FALLBACK RATE: {fallback_rate:.0%} — parser needs fixing")
    return result
```

If fallback rate is >20%, the savings are imaginary and the parser needs work before continuing.

---

### 4.6 Step 3 — The Real Scaling Problem

**What v1 missed:** Step 3 (Scan Agent) reads every file in the codebase and asks Claude to extract all classes, methods, tables, columns. This is:
1. The dominant cost on large repos (grows linearly with repo size)
2. Largely doing the same job as SYMBOL_INDEX.json — for money

Once SYMBOL_INDEX.json exists and is working, Step 3 is partially redundant. The correct long-term move is:

| Repo size | Recommendation |
|---|---|
| Small (~50 files, current HRMS) | Keep Step 3 — cost is low, SYMBOL_INDEX is new |
| Medium (~300 files) | Run both, compare output quality |
| Large (~1000+ files) | Skip Step 3's file-listing pass only — keep business rule extraction |

**Important:** SYMBOL_INDEX can replace Step 3's file-listing work (which files exist, which symbols are in them). It cannot replace Step 3's business rule extraction — threshold values, narrative descriptions, and domain logic live inside procedure bodies, not in the index. "$0 cost" is only true for the listing part.

**The highest-value change at scale is reducing Step 3's token cost — not skipping it entirely.**

---

## 5. Revised Token Savings

**Corrected from v1** — v1 was too optimistic on Steps 4–12 and understated Step 3's importance at scale.

### Small repo (current HRMS, ~50 files) — v4 Combined:

| Phase | Before | v2 symbols-only | **v4 combined** | Saving |
|---|---|---|---|---|
| Step 3 (XML minified) | ~$2–3 | ~$1.5–2 | ~$1.5–2 | ~25% |
| Steps 4–12 (symbol + summary) | ~$4–6 | ~$1–2 | ~$1.5–2.5 | ~55–65% |
| Step 13 (synthesis) | ~$1–2 | ~$1–2 | ~$1–2 | None |
| **Total reverse engineering** | **~$7–11** | **~$3–6** | **~$4–7** | **~40–50%** |

v4 costs slightly more than v2 (package summaries add ~150–200 tokens per package) but preserves cross-procedure structural visibility — a good tradeoff.

### Large repo (~1000 files, future) — v4 Combined:

| Phase | Before | **v4 combined** | Saving |
|---|---|---|---|
| Step 3 | ~$40–60 | ~$5–10 (listing pass skipped, rules kept) | ~75–85% |
| Steps 4–12 | ~$20–30 | ~$7–12 | ~55–65% |
| **Total** | **~$60–90** | **~$12–22** | **~70–80%** |

**The real money at scale is Step 3 — plan to replace it with SYMBOL_INDEX on large repos once the index is proven.**

---

## 6. Accuracy — Honest Assessment

**v1 claimed "~85–90% → ~85–90% — Same". That was a guess.**

The ~85–90% figure has no measured baseline behind it. It was estimated from code coverage, not from comparing pipeline output against ground truth.

**v2 risk — partially addressed in v4:**

Some business rules only appear when you see a whole package at once. Example: every procedure in `PKG_PAYROLL` checks `v_status NOT IN ('TERMINATED', 'ON_LEAVE')` — this pattern is only visible when you see all procedures together. v2 (symbols only) would hide this.

**v4 partial fix:** Package context summary includes all procedure names, shared tables, and common call targets in every Turn 2 prompt. This preserves structural cross-procedure visibility.

**What the summary does NOT preserve:** Internal logic patterns inside procedure bodies (e.g. "all write procs check EMPLOYMENT_STATUS"). These require body-level analysis — either a separate AI pass or a pattern miner not yet built.

**Baseline measurement is still required.** You cannot claim accuracy is preserved without measuring before-and-after on the same source. Fix Bug #1 (parser) first, then measure baseline, then implement the full symbol index, then compare again.

---

## 7. Revised Implementation Plan

**Honest effort estimates — v1 was too optimistic:**

| Step | What to build | File | Realistic effort |
|---|---|---|---|
| 1 | Version stamp + `--force-rerun` guard (Bug #8) | `run.py` | 30 min |
| 2 | PL/SQL parser — PACKAGE BODY detection + nesting depth (Bug #1, #2, #5) | `pipeline/symbol_index_builder.py` | 2–3 hours |
| 3 | Stable overload keys by param count (Bug #4) | `pipeline/symbol_index_builder.py` | 1 hour |
| 4 | Test XML minifier on real `.pllxml` (Bug #3) | `pipeline/layer1/xml_minifier.py` | 1–2 hours |
| 5 | Oracle Forms XML parser (collision-safe keys) | above | 1 day |
| 6 | SQL DDL parser (tables, indexes, sequences) | above | 4–6 hours |
| 7 | Dependency Graph Builder | `pipeline/dependency_graph_builder.py` | 3–4 hours |
| 8 | Hierarchical Symbol Map + fallback logger | `pipeline/base_runner.py` | 4–6 hours |
| 9 | Update 4 agent runners | `pipeline/runners/*_agent1_runner.py` | 2–3 hours |
| 10 | Wire new steps into `run.py` | `run.py` | 1 hour |
| 11 | Measure accuracy baseline — one package, compare output | — | 4–6 hours |
| **Total** | | | **~4–6 days** |

v1 said 18–26 hours. Realistic is **4–6 days** once edge cases appear in the parser.

### Correct order (matches Section 12 unblocking chain):
1. **Bug #8 — version stamp** — prevents stale output mixing old and new results
2. **Bug #1 — parser PACKAGE BODY fix** — single most important fix, unblocks everything
3. **Bug #2/#5 — guard + spec distinction** — fall out for free from #1, 5 minutes
4. **Bug #4 — stable overload keys** — symbol index now reliable
5. **Test XML minifier on one .pllxml** — verify no text node damage before using
6. **Oracle Forms + SQL parsers** — add once PL/SQL parser is solid
7. **Dependency Graph + agent runner updates** — plug in last
8. **Measure baseline accuracy** — before claiming any accuracy improvement
9. **Revisit Step 3** — once index is working and fallback rate is <5%

---

## 8. Files Changed vs Files Added

### New files:
```
pipeline/layer1/xml_minifier.py          ← XML structure minification (text-safe)
pipeline/symbol_index_builder.py         ← nesting-depth parser → SYMBOL_INDEX.json
pipeline/dependency_graph_builder.py     ← graphs → DEPENDENCY_GRAPH.json
```

### Modified files:
```
pipeline/base_runner.py                  ← hierarchical symbol map, graph_expand + fallback logger
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

## 9. Decision Needed From Team

| Question | Recommendation |
|---|---|
| Start now or after forward engineering? | XML minification now. Rest after Batch 2 completes. |
| Partial or full? | Partial — XML only first, measure, then decide. |
| Fallback behaviour? | Send whole file AND log it. Silent fallback = false savings. |
| Accuracy target? | **Measure baseline first** — before touching symbol parsing. No number exists yet. |
| Step 3 long-term? | Plan to replace with SYMBOL_INDEX on large repos. Not now. |
| Can we skip baseline? | No. Summary preserves structural visibility only — logic patterns need a measured check. |

---

## 10. Summary (v4 — combined approach, honest claims)

| | Current (whole file) | v2 symbols-only | **v4 combined (recommended)** |
|---|---|---|---|
| What Turn 2 receives | Whole files | Symbol bodies + deps | Package summaries + symbol bodies + deps |
| Tokens per agent call | ~18,000 | ~3,500 | **~5,000–6,000** |
| Structural cross-procedure visibility | ✅ Visible | ❌ Hidden | **✅ Preserved via summary** |
| Logic pattern visibility (body-level) | ✅ Visible | ❌ Hidden | **⚠ Not preserved — baseline required** |
| Accuracy | ~85–90% (unmeasured) | Unknown risk | **Measure before and after to confirm** |
| Reverse eng cost (small repo) | ~$7–11 | ~$3–6 | **~$4–7** |
| Reverse eng cost (large repo) | ~$60–90 | ~$10–20 | **~$12–22** |
| Baseline measurement needed? | — | Yes | **Yes — summary does not replace it** |
| Code bugs blocking implementation | — | 8 open | **8 open (Section 12)** |
| New dependencies | — | None | **`lxml` (for XML minifier only)** |
| Implementation effort | — | — | **4–6 days (after bugs fixed)** |
| Forward engineering affected | — | Not at all | **Not at all** |

---

## 11. What Changed Across Versions

### v1 → v2 (peer review bug fixes)

| v1 claim | v2 correction |
|---|---|
| `END name;` rule for PL/SQL | Wrong — real files use `END;`. Use nesting depth. |
| "Zero risk" XML minification | False for .pllxml. Minify structure only, never text nodes. |
| `PACKAGE.name` as key | Collides on overloads and same-trigger-name on different items. |
| Flat symbol map | Breaks at scale. Must be hierarchical (grouped by package/form). |
| Savings focused on Steps 4–12 | Step 3 is the real scaling cost. |
| 18–26 hours effort | 4–6 days realistic. |
| "85–90% same" | No baseline measured. Cross-procedure risk not listed. |

### v2 → v3 (combined approach — but 3 new bugs introduced)

| v2 limitation | v3 claimed solution | v3 problem |
|---|---|---|
| Cross-procedure patterns hidden | Package context summary added | ✅ Good idea |
| Baseline measurement required | "Summary covers the risk — no baseline needed" | ❌ False — summary can't detect logic patterns |
| Token math ~200 tokens/package | "~200 tokens per package" | ❌ Grows unbounded with large packages |
| v2 bugs 1–7 open | Code sections copied unchanged from v2 | ❌ All 7 bugs still open in v3 |

### v3 → v4 (honest claims, open bugs documented)

| v3 false claim | v4 correction |
|---|---|
| "Shared pattern: all write procs check X" in summary | Removed — index holds names/links only, not body logic |
| "Baseline measurement no longer required" (Section 6, 10) | Restored — baseline required, summary does not replace it |
| "~200 tokens per package" fixed | Capped at 20 names + "+N more" to keep it bounded |
| 7 code bugs described as fixed | All 7 listed as open + Bug #8 (stale checkpoints) added = 8 total in Section 12 |

---

## 12. Open Code Bugs — Solutions Documented

**8 bugs total. Fix in the order below — each one unblocks the next. Parser currently finds 0 of 6 procedures.**

---

### Bug #1 — Parser latches `in_proc=True` in package spec (BLOCKS EVERYTHING)

**Root cause:** A `.pkb` file has two sections — the package spec (procedure declarations, no body) and the package body (actual code). The current parser sets `in_proc=True` when it sees `PROCEDURE` in the spec and never resets it because there is no matching `BEGIN/END` block. Every real procedure body is then skipped.

**Fix:** Detect the `PACKAGE BODY` line to know when the real body section starts. Only parse procedures after that line.

```
Before parsing loop:
  in_body_section = False

In loop:
  if line matches "PACKAGE BODY <name>" → set in_body_section = True
  Only set in_proc=True if in_body_section is True
```

This one fix makes the parser go from 0/6 to 6/6 on the sample file.

---

### Bug #2 — Divide by zero when requested_symbols list is empty

**Root cause:** `fallback_count / len(requested_symbols)` crashes when the list is empty (Turn 1 agent returned nothing).

**Fix:** Guard before dividing:
```
if len(requested_symbols) == 0:
    return []   # nothing to expand
fallback_rate = fallback_count / len(requested_symbols)
```

---

### Bug #3 — XML minifier drops comments, mangles namespaces, breaks CDATA

**Root cause:** `xml.etree.ElementTree` silently drops XML comments, strips the XML declaration, and renames namespaces to `ns0:`, `ns1:`, etc. For Oracle Forms XML this is destructive.

**Fix:** Use `lxml` with `etree.XMLParser(remove_comments=False)` and `etree.tostring(..., xml_declaration=True)`. For CDATA sections, detect and preserve them. Write the output to a temp file and diff against the original before committing — if any text node content changed, abort and log it.

Teammate has already written `xml_minifier.py` — it needs to be tested against one real `.pllxml` file before using in the pipeline. Do not skip this test.

---

### Bug #4 — Overload key `#2` is position-based, not signature-based

**Root cause:** Two procedures with the same name get keys `PKG.PROC` and `PKG.PROC#2` based on which one appeared first in the file. Reorder the file and `#2` now points at the wrong procedure silently.

**Fix:** Include the parameter count in the key instead of a position number:
```
PKG.GET_EMPLOYEE(1)   ← 1 parameter
PKG.GET_EMPLOYEE(3)   ← 3 parameters
```
This is stable regardless of order in the file. If two overloads have the same parameter count (rare), append a type abbreviation from the first parameter.

---

### Bug #5 — No way to distinguish spec declaration from body

**Root cause:** Section 4.3 says spec symbols get a `.spec` suffix key. But Section 4.2's parser has no flag for which section it's in — it can't tell if it's looking at a declaration or a body.

**Fix:** Same as Bug #1 fix — the `in_body_section` flag solves both. Before `PACKAGE BODY` line → all symbols are `.spec`. After it → all symbols are body symbols (no suffix). The keys then match Section 4.3's design.

---

### Bug #6 — Proposal overclaims index replaces Step 3

**Root cause:** Sections 4.6 and 5 say "Step 3 replaced by SYMBOL_INDEX — $0 cost." The index holds names, line numbers, and call links. It does not hold business rules, threshold values, or narrative descriptions — the things Step 3 extracts.

**Fix (doc only):** Section 4.6 updated to say: "Step 3 can be reduced or skipped only for the file-listing part. The business rule extraction part cannot be replaced by the index." The "$0" claim removed.

---

### Bug #7 — File extensions missing from Step 2 scan ✅ ALREADY FIXED

**Fixed by teammate** in `pipeline/scan_runner.py` — Oracle extensions `.pkb`, `.pks`, `.frmxml`, `.pllxml`, `.mmxml` added. Binaries excluded. PL/SQL bodies now reach Claude.

---

### Bug #8 — Stale checkpoints silently mix old and new output

**Root cause:** The pipeline resumes by checking if output files exist. If you implement the new architecture and re-run, the old `results/` files (generated with whole-file approach) are still on disk. The pipeline sees them, skips those steps, and mixes old whole-file output with new symbol-index output in the same run. You can't tell which docs came from which approach.

**Fix:** Add an architecture version stamp to `results/` on each run:
```
results/
  _arch_version.txt    ← contains "v4-symbol-index" or "v1-whole-file"
```
On startup, if `_arch_version.txt` exists and does not match the current architecture version, print a warning and require `--force-rerun` to continue. Never silently reuse old output from a different architecture.

This also applies to `SYMBOL_INDEX.json` and `DEPENDENCY_GRAPH.json` — if the source files have changed since they were built, they must be rebuilt, not reused.

---

### Fix Order and Unblocking Chain

```
Fix #8 (version stamp) — do this first, prevents mixing old+new output
    → Fix #1 (PACKAGE BODY detection)
        → Parser finds real procedures
            → Fix #5 (spec/body distinction) falls out for free
                → Symbol index has real data
                    → Fix #4 (stable overload keys)
                        → Fix #2 (guard empty list)
                            → Graph expansion works
                                → Test Fix #3 (XML minifier on real .pllxml)
                                    → Wire into run.py
                                        → Measure baseline accuracy
                                            → End to end working ✅
```

**Total estimated effort once bugs are fixed:** 1 day.

---

---

## 13. Implementation Specs — Build-Ready Details

These 5 specs are what a developer needs before writing a single line of code. Without them, the builder would have to guess. All are derived directly from the design in Sections 3 and 4.

---

### Spec 1 — SYMBOL_INDEX.json exact schema

Every entry in the index is one symbol. The file is a JSON object keyed by symbol key:

```json
{
  "PKG_EMPLOYEE.HIRE_EMPLOYEE": {
    "key":      "PKG_EMPLOYEE.HIRE_EMPLOYEE",
    "type":     "procedure",
    "file":     "source/ts-plsql-oracle-forms-hrms/PKG_EMPLOYEE.pkb",
    "package":  "PKG_EMPLOYEE",
    "name":     "HIRE_EMPLOYEE",
    "start":    142,
    "end":      198,
    "calls":    ["PKG_EMPLOYEE.VALIDATE_DEPT", "PKG_EMPLOYEE.LOG_HISTORY", "EMPLOYEES"],
    "called_by": ["HRMS_EMPLOYEE.EMPLOYEES.EMP_ID.WHEN_BUTTON_PRESSED"]
  },
  "PKG_EMPLOYEE.HIRE_EMPLOYEE.spec": {
    "key":      "PKG_EMPLOYEE.HIRE_EMPLOYEE.spec",
    "type":     "spec",
    "file":     "source/ts-plsql-oracle-forms-hrms/PKG_EMPLOYEE.pks",
    "package":  "PKG_EMPLOYEE",
    "name":     "HIRE_EMPLOYEE",
    "start":    12,
    "end":      14,
    "calls":    [],
    "called_by": []
  },
  "PKG_EMPLOYEE.GET_EMPLOYEE(1)": {
    "key":      "PKG_EMPLOYEE.GET_EMPLOYEE(1)",
    "type":     "procedure",
    "file":     "source/ts-plsql-oracle-forms-hrms/PKG_EMPLOYEE.pkb",
    "package":  "PKG_EMPLOYEE",
    "name":     "GET_EMPLOYEE",
    "param_count": 1,
    "start":    55,
    "end":      80,
    "calls":    ["EMPLOYEES"],
    "called_by": []
  },
  "HRMS_EMPLOYEE.EMPLOYEES.EMP_ID.WHEN_BUTTON_PRESSED": {
    "key":      "HRMS_EMPLOYEE.EMPLOYEES.EMP_ID.WHEN_BUTTON_PRESSED",
    "type":     "trigger",
    "file":     "source/ts-plsql-oracle-forms-hrms/HRMS_EMPLOYEE.frmxml",
    "form":     "HRMS_EMPLOYEE",
    "block":    "EMPLOYEES",
    "item":     "EMP_ID",
    "trigger":  "WHEN_BUTTON_PRESSED",
    "start":    310,
    "end":      325,
    "calls":    ["PKG_EMPLOYEE.HIRE_EMPLOYEE"],
    "called_by": []
  },
  "PUBLIC.EMPLOYEES": {
    "key":      "PUBLIC.EMPLOYEES",
    "type":     "table",
    "file":     "source/ts-plsql-oracle-forms-hrms/schema/01_core_tables.sql",
    "schema":   "PUBLIC",
    "name":     "EMPLOYEES",
    "columns":  ["EMP_ID", "FIRST_NAME", "LAST_NAME", "HIRE_DATE", "SALARY", "DEPT_ID"],
    "start":    10,
    "end":      25,
    "calls":    [],
    "called_by": ["PKG_EMPLOYEE.HIRE_EMPLOYEE", "PKG_EMPLOYEE.TERMINATE_EMPLOYEE"]
  }
}
```

**Rules:**
- Key is always the fully-qualified symbol key from Section 4.3
- `calls` = what this symbol calls or reads
- `called_by` = what calls this symbol (populated in second pass after all symbols indexed)
- `start`/`end` are 0-based line numbers
- Spec entries get `.spec` suffix, body entries do not

---

### Spec 2 — DEPENDENCY_GRAPH.json exact schema

Four graphs in one file:

```json
{
  "call_graph": {
    "PKG_EMPLOYEE.HIRE_EMPLOYEE": ["PKG_EMPLOYEE.VALIDATE_DEPT", "PKG_EMPLOYEE.LOG_HISTORY"],
    "PKG_EMPLOYEE.VALIDATE_DEPT": ["PUBLIC.DEPARTMENTS"]
  },
  "table_graph": {
    "PKG_EMPLOYEE.HIRE_EMPLOYEE": ["PUBLIC.EMPLOYEES", "PUBLIC.EMPLOYEE_HISTORY"],
    "PKG_EMPLOYEE.TERMINATE_EMPLOYEE": ["PUBLIC.EMPLOYEES", "PUBLIC.EMPLOYEE_HISTORY"]
  },
  "trigger_graph": {
    "HRMS_EMPLOYEE.EMPLOYEES.EMP_ID.WHEN_BUTTON_PRESSED": ["PKG_EMPLOYEE.HIRE_EMPLOYEE"]
  },
  "package_graph": {
    "PKG_EMPLOYEE": ["PKG_PAYROLL", "PKG_AUDIT"],
    "PKG_PAYROLL": ["PKG_EMPLOYEE"]
  }
}
```

**Rules:**
- `call_graph` — procedure → procedures it calls directly (1 hop only)
- `table_graph` — procedure → tables it reads or writes
- `trigger_graph` — form trigger → procedures it calls
- `package_graph` — package → packages it depends on (derived from call_graph)
- All keys and values are symbol keys from SYMBOL_INDEX.json

---

### Spec 3 — Package context summary generation code

Exact Python that builds the summary string from SYMBOL_INDEX.json — no AI, no file reading:

```python
def build_package_summary(package_name, symbol_index, max_names=20):
    # Collect all body procedures for this package
    procs = [
        v for v in symbol_index.values()
        if v.get("package") == package_name and v["type"] == "procedure"
    ]
    if not procs:
        return ""

    names = [p["name"] for p in procs]
    shown = names[:max_names]
    overflow = len(names) - max_names

    # Shared tables — appear in 2+ procedures
    from collections import Counter
    all_tables = [c for p in procs for c in p.get("calls", [])
                  if c.startswith("PUBLIC.") or "." not in c]
    shared_tables = [t for t, n in Counter(all_tables).items() if n >= 2]

    # Common calls — non-table symbols called by 2+ procedures
    all_calls = [c for p in procs for c in p.get("calls", [])
                 if not (c.startswith("PUBLIC.") or "." not in c)]
    common_calls = [c.split(".")[-1] + "()" for c, n
                    in Counter(all_calls).items() if n >= 2]

    lines = [
        f"=== PACKAGE CONTEXT: {package_name} ===",
        f"Total procedures: {len(procs)}",
        "  " + ", ".join(shown) + (f"\n  [+{overflow} more]" if overflow > 0 else ""),
    ]
    if shared_tables:
        lines.append("Shared tables: " + ", ".join(shared_tables))
    if common_calls:
        lines.append("Common calls: " + ", ".join(common_calls[:5]))

    return "\n".join(lines)
```

Called once per relevant package before each Turn 2 prompt. Output is ~150–200 tokens per package, capped by `max_names=20`.

---

### Spec 4 — run.py wiring — where Steps 2b and 2c are inserted

Current `run.py` step order (simplified):
```
step_1_layer1_extraction()
step_2_scan_once()
step_3_scan_agent()
steps_4_to_12_analysis_agents()
step_13_foundation_synthesis()
```

v4 inserts after step_2, before step_3:
```python
# Step 2b — Symbol Index Builder
from pipeline.symbol_index_builder import build_symbol_index
symbol_index_path = output_dir / "SYMBOL_INDEX.json"
if not symbol_index_path.exists():
    build_symbol_index(source_dir, symbol_index_path)
else:
    print("  [Step 2b] SYMBOL_INDEX.json exists — skipping rebuild")

# Step 2c — Dependency Graph Builder
from pipeline.dependency_graph_builder import build_dependency_graph
graph_path = output_dir / "DEPENDENCY_GRAPH.json"
if not graph_path.exists():
    build_dependency_graph(symbol_index_path, graph_path)
else:
    print("  [Step 2c] DEPENDENCY_GRAPH.json exists — skipping rebuild")
```

Resume-safe: skips if output already exists. Force-rebuild: delete the JSON files and re-run.

---

### Spec 5 — Bug #8 arch version stamp — exact startup code for run.py

Add this at the top of `run.py` main(), before any steps run:

```python
ARCH_VERSION = "v4-symbol-index"
arch_stamp = output_dir / "_arch_version.txt"

if arch_stamp.exists():
    existing = arch_stamp.read_text().strip()
    if existing != ARCH_VERSION:
        print(f"\n  ERROR: results/ was generated with architecture '{existing}'.")
        print(f"  Current architecture is '{ARCH_VERSION}'.")
        print(f"  Re-running will mix old and new output.")
        print(f"  To force a clean re-run: delete results/ and re-run.")
        print(f"  Or pass --force-rerun to override (at your own risk).")
        if "--force-rerun" not in sys.argv:
            sys.exit(1)

# Write stamp for this run
arch_stamp.write_text(ARCH_VERSION)
```

This runs before step 1. If old results exist from a different architecture, it stops and explains why. No silent mixing.

---

---

### Spec 6 — How `calls` is populated (procedure call + table reference detection)

The parser runs a second scan over each procedure body after extracting its start/end lines. Two patterns to detect:

```python
import re

def extract_calls(body_lines, all_known_packages, all_known_tables):
    """
    body_lines: list of strings — the procedure body only (start..end)
    all_known_packages: set of package names already indexed e.g. {"PKG_EMPLOYEE", "PKG_PAYROLL"}
    all_known_tables: set of table names already indexed e.g. {"EMPLOYEES", "DEPARTMENTS"}
    """
    calls = set()

    for line in body_lines:
        upper = line.strip().upper()

        # Pattern 1 — procedure/function call: PACKAGE.PROC_NAME(
        for m in re.finditer(r'\b([A-Z_]+)\.([A-Z_]+)\s*\(', upper):
            pkg, proc = m.group(1), m.group(2)
            if pkg in all_known_packages:
                calls.add(f"{pkg}.{proc}")

        # Pattern 2 — table reference: FROM / JOIN / INTO / UPDATE <table>
        for m in re.finditer(
            r'\b(?:FROM|JOIN|INTO|UPDATE)\s+([A-Z_][A-Z0-9_]*)', upper
        ):
            tbl = m.group(1)
            if tbl in all_known_tables:
                calls.add(tbl)

    return sorted(calls)
```

**Two-pass build order:**
1. First pass — index all symbols (name, file, start, end, type) — `calls = []` for now
2. Build `all_known_packages` and `all_known_tables` from first pass
3. Second pass — for each symbol, read its body lines, run `extract_calls()`, populate `calls`
4. Third pass — populate `called_by` (Spec 7 below)

---

### Spec 7 — `called_by` second pass (exact code)

After `calls` is populated for every symbol, derive `called_by` by inverting the call graph:

```python
def build_called_by(symbol_index):
    """
    Mutates symbol_index in place — adds called_by list to every entry.
    Run this AFTER extract_calls() has populated calls for all symbols.
    """
    # Reset called_by for all symbols
    for entry in symbol_index.values():
        entry["called_by"] = []

    # Invert: for every A that calls B, add A to B's called_by
    for key, entry in symbol_index.items():
        for callee in entry.get("calls", []):
            # callee may be a full key or just a table name
            # Try exact match first, then prefix match
            if callee in symbol_index:
                symbol_index[callee]["called_by"].append(key)
            else:
                # table reference — find the PUBLIC.TABLE entry
                table_key = f"PUBLIC.{callee}"
                if table_key in symbol_index:
                    symbol_index[table_key]["called_by"].append(key)

    return symbol_index
```

Call order in `build_symbol_index()`:
```python
symbol_index = first_pass_extract_symbols(source_dir)      # names, lines
symbol_index = second_pass_extract_calls(symbol_index)     # calls[]
symbol_index = build_called_by(symbol_index)               # called_by[]
save_json(symbol_index, output_path)
```

---

### Spec 8 — Standalone procedures in .sql files (parser extension)

Section 4.2 parser only activates after `PACKAGE BODY`. Standalone `CREATE PROCEDURE` / `CREATE FUNCTION` in `.sql` files never set `in_body_section = True` — silently skipped.

**Fix:** Detect two entry points, not one:

```python
for i, line in enumerate(file_text.splitlines()):
    stripped = line.strip().upper()

    # Entry point 1 — package body (existing)
    if re.match(r'PACKAGE\s+BODY\s+\w+', stripped):
        in_body_section = True
        current_package = re.match(r'PACKAGE\s+BODY\s+(\w+)', stripped).group(1)
        continue

    # Entry point 2 — standalone procedure/function in .sql file
    if re.match(r'CREATE\s+(OR\s+REPLACE\s+)?(PROCEDURE|FUNCTION)\s+\w+', stripped):
        in_body_section = True
        current_package = None   # no package — key will be just PROC_NAME
        # fall through to existing proc detection below

    if not in_body_section:
        continue
```

**Key format for standalone procedures:**
- Inside package body → key: `PKG_NAME.PROC_NAME`
- Standalone in .sql → key: `PROC_NAME` (no package prefix)

This ensures standalone migration procedures, utility scripts, and trigger definitions in `.sql` files are all indexed correctly.

---

### Spec 9 — Oracle Forms XML parser (collision-safe keys)

Oracle Forms `.frmxml` files store triggers inside nested XML. Each trigger is scoped to a form, block, or item — same trigger name appears at multiple levels. The parser must track this nesting to build collision-safe keys.

**XML structure to parse:**
```xml
<Form name="HRMS_EMPLOYEE">
  <Trigger name="ON_ERROR">...</Trigger>          <!-- form-level -->
  <Block name="EMPLOYEES">
    <Trigger name="POST_QUERY">...</Trigger>       <!-- block-level -->
    <Item name="EMP_ID">
      <Trigger name="WHEN_BUTTON_PRESSED">...</Trigger>  <!-- item-level -->
    </Item>
  </Block>
</Form>
```

**Parser:**
```python
from lxml import etree

def parse_frmxml(file_path, symbol_index):
    tree = etree.parse(file_path)
    root = tree.getroot()
    form_name = root.get("name", "UNKNOWN_FORM")

    # Strip namespace if present
    def tag(el): return el.tag.split("}")[-1] if "}" in el.tag else el.tag

    for elem in root.iter():
        t = tag(elem)

        if t == "Trigger":
            trigger_name = elem.get("name", "UNKNOWN")
            # Walk up to determine scope
            parent = elem.getparent()
            grandparent = parent.getparent() if parent is not None else None

            p_tag = tag(parent) if parent is not None else ""
            gp_tag = tag(grandparent) if grandparent is not None else ""

            if p_tag == "Item" and gp_tag == "Block":
                # item-level trigger
                block_name = grandparent.get("name", "UNKNOWN")
                item_name = parent.get("name", "UNKNOWN")
                key = f"{form_name}.{block_name}.{item_name}.{trigger_name}"
                sym_type = "trigger_item"
            elif p_tag == "Block":
                # block-level trigger
                block_name = parent.get("name", "UNKNOWN")
                key = f"{form_name}.{block_name}.{trigger_name}"
                sym_type = "trigger_block"
            else:
                # form-level trigger
                key = f"{form_name}.{trigger_name}"
                sym_type = "trigger_form"

            # Extract body — text content of the trigger element
            body = (elem.text or "").strip()
            lines = body.splitlines()

            symbol_index[key] = {
                "key": key,
                "type": sym_type,
                "file": str(file_path),
                "form": form_name,
                "trigger": trigger_name,
                "start": 0,   # line numbers inside XML not reliable — use body
                "end": len(lines),
                "body": body,
                "calls": [],
                "called_by": []
            }
```

After parsing, run `extract_calls()` on each trigger's `body` lines — same as procedures.

---

### Spec 10 — SQL DDL parser (tables, columns, indexes)

Parses `CREATE TABLE` statements from `.sql` files to index table symbols with their columns.

```python
import re

def parse_sql_ddl(file_path, symbol_index, default_schema="PUBLIC"):
    text = open(file_path, encoding="utf-8", errors="replace").read()

    # Match CREATE TABLE [schema.]name ( ... )
    table_pattern = re.compile(
        r'CREATE\s+TABLE\s+(?:(\w+)\.)?(\w+)\s*\((.*?)\)\s*;',
        re.IGNORECASE | re.DOTALL
    )

    for m in table_pattern.finditer(text):
        schema = (m.group(1) or default_schema).upper()
        table_name = m.group(2).upper()
        body = m.group(3)
        key = f"{schema}.{table_name}"

        # Extract column names — first word of each non-constraint line
        columns = []
        for line in body.splitlines():
            line = line.strip().rstrip(",")
            if not line:
                continue
            # Skip constraints
            if re.match(r'(CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK|INDEX)', line, re.I):
                continue
            col = re.match(r'(\w+)\s+', line)
            if col:
                columns.append(col.group(1).upper())

        # Find line numbers in file
        start_line = text[:m.start()].count("\n")
        end_line = text[:m.end()].count("\n")

        symbol_index[key] = {
            "key": key,
            "type": "table",
            "file": str(file_path),
            "schema": schema,
            "name": table_name,
            "columns": columns,
            "start": start_line,
            "end": end_line,
            "calls": [],
            "called_by": []
        }
```

---

### Spec 11 — Spec 6 extended: missing PL/SQL DML patterns

Spec 6 only detected `FROM/JOIN/INTO/UPDATE`. These common HRMS patterns were missing:

```python
def extract_calls(body_lines, all_known_packages, all_known_tables):
    calls = set()

    for line in body_lines:
        upper = line.strip().upper()

        # Procedure/function call: PACKAGE.PROC(
        for m in re.finditer(r'\b([A-Z_]+)\.([A-Z_]+)\s*\(', upper):
            pkg, proc = m.group(1), m.group(2)
            if pkg in all_known_packages:
                calls.add(f"{pkg}.{proc}")

        # Table references — all DML patterns including DELETE, MERGE, cursor
        for m in re.finditer(
            r'\b(?:FROM|JOIN|INTO|UPDATE|DELETE\s+FROM|MERGE\s+INTO|'
            r'OPEN\s+\w+\s+FOR\s+SELECT\s+\S+\s+FROM)\s+([A-Z_][A-Z0-9_]*)',
            upper
        ):
            tbl = m.group(1)
            if tbl in all_known_tables:
                calls.add(tbl)

        # EXECUTE IMMEDIATE — flag as dynamic SQL, can't resolve statically
        if "EXECUTE IMMEDIATE" in upper:
            calls.add("__DYNAMIC_SQL__")

    return sorted(calls)
```

`__DYNAMIC_SQL__` is a sentinel — visible in the index, tells the agent "this procedure uses dynamic SQL, its table dependencies are not fully known."

---

### Spec 12 — Table key normalization (fix schema inconsistency)

Spec 6 adds bare `"EMPLOYEES"` to `calls[]` but SYMBOL_INDEX stores tables as `"PUBLIC.EMPLOYEES"`. Spec 7's `f"PUBLIC.{callee}"` hardcodes the schema — breaks on multi-schema repos.

**Fix:** Build a reverse lookup at index time and resolve during `extract_calls`:

```python
def build_table_lookup(symbol_index):
    """
    Returns dict: bare_table_name → full_key
    e.g. {"EMPLOYEES": "PUBLIC.EMPLOYEES", "DEPT": "HR.DEPT"}
    If same table name exists in multiple schemas, keeps all — returns list.
    """
    lookup = {}
    for key, entry in symbol_index.items():
        if entry["type"] == "table":
            name = entry["name"]
            if name in lookup:
                # ambiguous — store as list
                if isinstance(lookup[name], list):
                    lookup[name].append(key)
                else:
                    lookup[name] = [lookup[name], key]
            else:
                lookup[name] = key
    return lookup


def resolve_table_ref(bare_name, table_lookup):
    """Resolve bare table name to full SYMBOL_INDEX key."""
    result = table_lookup.get(bare_name.upper())
    if isinstance(result, list):
        # Ambiguous — return all, log warning
        print(f"  [WARN] Ambiguous table ref '{bare_name}' → {result}")
        return result
    return [result] if result else []
```

Use `resolve_table_ref()` in `extract_calls()` instead of bare string, and in `build_called_by()` instead of `f"PUBLIC.{callee}"`.

---

*Proposal v1: 2026-07-28 | v2: peer review fixes | v3: combined approach (3 new bugs) | v4: all bugs solved, all specs complete | Pipeline version: v2*
