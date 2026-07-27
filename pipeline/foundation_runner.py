"""
Foundation Runner
-----------------
Synthesizes all 4 layer outputs (BA, DA, TA, AA) into the
Enterprise Knowledge Graph and 4 read-only foundation views,
then generates the 20 forward-engineering documents.

Uses TWO sequential Claude calls to avoid output truncation:
  Call 1 → 5 foundation docs + forward-engineering docs 01–10
  Call 2 → forward-engineering docs 11–20 (receives KG summary as context)

Reads:
  <output>/Business_Analysis/     - BA Agent 1 + 2 output
  <output>/Data_Analysis/         - DA Agent 1 + 2 output
  <output>/Technology_Analysis/   - TA Agent 1 + 2 output
  <output>/Application_Analysis/  - AA Agent 1 + 2 output

Writes:
  <output>/Foundation_KnowledgeGraph/ENTERPRISE_KNOWLEDGE_GRAPH.json
  <output>/Foundation_KnowledgeGraph/CANONICAL_ENTERPRISE_MODEL.md
  <output>/Foundation_KnowledgeGraph/ARCHITECTURE_INVENTORY.md
  <output>/Foundation_KnowledgeGraph/TRACEABILITY_MATRIX.md
  <output>/Foundation_KnowledgeGraph/FORWARD_ENGINEERING_INPUT_MAP.md
  <output>/ForwardEngineering_Docs/01_BRD.md … 20_UI_UX_SPECIFICATION.md
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from base_runner import call_claude, save_output

# ── Call 1 prompt: Foundation KG + docs 01–10 ─────────────────────────────────

CALL1_PROMPT = """
# Foundation Synthesis Agent — Part 1 of 2

You are the Foundation / Synthesis agent. Your job is to reconcile all four
architecture layers (Business, Data, Application, Technology) into a single
Enterprise Knowledge Graph and four read-only foundation views, then produce
the first 10 forward-engineering documents.

## Rules

1. NEVER invent facts. Every node must trace to evidence in the layer outputs provided.
2. Where the same concept appears in multiple layers (e.g. "Order" in BA, DA, AA),
   merge into ONE canonical node — do not duplicate.
3. Assign confidence: HIGH (direct code evidence), MEDIUM (inferred from patterns),
   LOW (assumed from naming), ASSUMED (no evidence found).
4. Every node must carry: id, type, owner_layer, confidence, evidence (source ref).
5. Record every cross-layer conflict in normalization_log with a DISC-### id.
6. Record every unresolved question in open_questions with an OQ-### id.
7. Assumptions that cannot be verified go in assumptions with an ASMP-### id.
8. The anti-hallucination rule: if you do not know → say unknown, not a guess.
9. COMPLETENESS RULE: Mark a field MISSING only when the information genuinely
   does not appear anywhere in the layer outputs. If a table's columns appear in
   DA Agent output, list ALL of them — do not say "columns omitted for brevity".
   If a package's procedures appear in AA Agent output, list ALL of them.
10. ENUMERATE EVERYTHING: For every domain, list every entity with every field.
    For every package, list every procedure. For every form, list every trigger.
    The forward engineering agents depend on this output — incomplete data here
    means incomplete generated code downstream.
11. BUSINESS RULES: Extract EXACT values — thresholds, limits, formulas.
    "hire_date must be within 180 days of offer" is a business rule.
    "hire date validation" is not. Always prefer the specific over the general.

## Required Output — Part 1

Produce ALL of the following in this exact order, separated by markers:

=== DOCUMENT: ENTERPRISE_KNOWLEDGE_GRAPH.json ===
(full JSON — metadata, business, data, application, technology,
 cross_links, assumptions, normalization_log, open_questions)

=== DOCUMENT: CANONICAL_ENTERPRISE_MODEL.md ===
(human-readable summary of every domain, aggregate, service, API — one row per node)

=== DOCUMENT: ARCHITECTURE_INVENTORY.md ===
(deployables, databases, APIs, services, entities, tech stack, security findings, PII, debt)

=== DOCUMENT: TRACEABILITY_MATRIX.md ===
(Capability → Process → Entity → Service → API → Database → Confidence, one row per capability)

=== DOCUMENT: FORWARD_ENGINEERING_INPUT_MAP.md ===
(what is KNOWN, INFERRED, MISSING — input spec for AI-assisted code regeneration)

=== DOCUMENT: 01_BRD.md ===
(Business Requirements Document)

=== DOCUMENT: 02_BUSINESS_CAPABILITY_MODEL.md ===

=== DOCUMENT: 03_USE_CASE_SPECIFICATION.md ===

=== DOCUMENT: 04_BUSINESS_PROCESS_MODEL.md ===

=== DOCUMENT: 05_DOMAIN_MODEL.md ===
(with DDD bounded contexts and Mermaid context maps)

=== DOCUMENT: 06_DATA_DICTIONARY.md ===

=== DOCUMENT: 07_DATA_MODEL_SPECIFICATION.md ===
(including physical schema and SQL DDL)

=== DOCUMENT: 08_ERD.md ===

=== DOCUMENT: 09_DATA_FLOW_DIAGRAM.md ===

=== DOCUMENT: 10_SERVICE_CATALOG.md ===

CRITICAL RULES:
- Output ALL document content as plain text using the === DOCUMENT: <filename> === markers.
- Do NOT use file writing tools. Do NOT write files. Do NOT use any tools at all.
- Every document must appear in full — nothing else will be captured.
- End your response after 10_SERVICE_CATALOG.md. Do NOT write docs 11–20 yet.

---
"""

# ── Call 2 prompt: docs 11–20 ─────────────────────────────────────────────────

CALL2_PROMPT = """
# Foundation Synthesis Agent — Part 2 of 2

You are given the Enterprise Knowledge Graph and foundation views already produced
in Part 1. Your job is to generate forward-engineering documents 11–20.

Each document must be:
- Grounded in the Knowledge Graph — cite node IDs where relevant
- Technology-neutral where the target stack is unresolved
- Written at senior-architect level
- Self-contained — a developer should be able to implement from each document alone

Produce ALL of the following in order, separated by markers:

=== DOCUMENT: 11_API_CONTRACT_SPECIFICATION.md ===
(full REST contracts for all endpoints)

=== DOCUMENT: 12_TECHNOLOGY_BLUEPRINT.md ===

=== DOCUMENT: 13_SECURITY_ARCHITECTURE.md ===
(including RBAC model and modernization plan)

=== DOCUMENT: 14_NFR_SPECIFICATION.md ===

=== DOCUMENT: 15_FORWARD_ENGINEERING_SPECIFICATION.md ===
(generation rules and validation gates)

=== DOCUMENT: 16_GENERATION_MANIFEST.json ===
(machine-readable JSON — leave target_stack empty)

=== DOCUMENT: 17_FORWARD_ENGINEERING_READINESS_REPORT.md ===
(scored readiness assessment)

=== DOCUMENT: 18_DEPLOYMENT_ARCHITECTURE.md ===

=== DOCUMENT: 19_FRONTEND_ARCHITECTURE.md ===

=== DOCUMENT: 20_UI_UX_SPECIFICATION.md ===

CRITICAL RULES:
- Output ALL document content as plain text using the === DOCUMENT: <filename> === markers.
- Do NOT use file writing tools. Do NOT write files. Do NOT use any tools at all.
- Every document must appear in full — nothing else will be captured.

---

# Enterprise Knowledge Graph and Foundation Views (from Part 1)

"""


# ── Helpers ────────────────────────────────────────────────────────────────────

def _load_layer_outputs(output_dir: str) -> dict:
    """Load only the Agent 2 outputs — Agent 1 outputs are already summarised inside them."""
    base = Path(output_dir)
    layers = {}
    for folder, key in [
        ("Business_Analysis",    "BA_Deep_Analyst.md"),
        ("Data_Analysis",        "DA_Data_Reviewer.md"),
        ("Technology_Analysis",  "TA_Deep_Analyst.md"),
        ("Application_Analysis", "AA_Quality_Review.md"),
    ]:
        path = base / folder / key
        if path.exists():
            layers[key] = path.read_text(encoding="utf-8")
            print(f"  Loaded: {folder}/{key} ({len(layers[key])} chars)")
        else:
            print(f"  Missing (will proceed without): {folder}/{key}")
            layers[key] = ""
    return layers


def _split_documents(text: str) -> dict:
    import re
    docs = {}
    pattern = re.compile(r"=== DOCUMENT:\s*(.+?)\s*===", re.IGNORECASE)
    parts = pattern.split(text)
    i = 1
    while i < len(parts) - 1:
        filename = parts[i].strip()
        content  = parts[i + 1].strip()
        docs[filename] = content
        i += 2
    return docs


def _save_docs(docs: dict, foundation_dir: Path, fwd_eng_dir: Path) -> list:
    foundation_files = {
        "ENTERPRISE_KNOWLEDGE_GRAPH.json",
        "CANONICAL_ENTERPRISE_MODEL.md",
        "ARCHITECTURE_INVENTORY.md",
        "TRACEABILITY_MATRIX.md",
        "FORWARD_ENGINEERING_INPUT_MAP.md",
    }
    saved = []
    for filename, content in docs.items():
        if filename in foundation_files:
            path = foundation_dir / filename
        else:
            path = fwd_eng_dir / filename
        path.write_text(content, encoding="utf-8")
        saved.append(str(path))
        print(f"  Saved → {path}")
    return saved


# ── Main ───────────────────────────────────────────────────────────────────────

def run(output_dir: str) -> None:
    print("\n[Foundation] Loading all layer outputs...")
    layers = _load_layer_outputs(output_dir)

    all_layer_text = "\n\n".join(
        f"## {key}\n\n{content}"
        for key, content in layers.items()
        if content
    )

    foundation_dir = Path(output_dir) / "Foundation_KnowledgeGraph"
    fwd_eng_dir    = Path(output_dir) / "ForwardEngineering_Docs"
    foundation_dir.mkdir(parents=True, exist_ok=True)
    fwd_eng_dir.mkdir(parents=True, exist_ok=True)

    part1_raw = Path(output_dir) / "Foundation_Raw_Output_Part1.md"
    part2_raw = Path(output_dir) / "Foundation_Raw_Output_Part2.md"

    # ── Call 1: KG + foundation docs + docs 01–10 ─────────────────────────────
    if part1_raw.exists() and part1_raw.stat().st_size > 0:
        print("\n[Foundation] Call 1 — already done, loading saved output...")
        call1_output = part1_raw.read_text(encoding="utf-8")
        docs1 = _split_documents(call1_output)
        print(f"  Loaded {len(docs1)} documents from previous run.")
    else:
        print("\n[Foundation] Call 1 — Enterprise Knowledge Graph + docs 01–10...")
        call1_prompt = (
            f"{CALL1_PROMPT}\n\n"
            f"# All Layer Outputs\n\n"
            f"{all_layer_text}\n\n"
            f"Begin Part 1 now."
        )
        call1_output = call_claude(call1_prompt, label="Foundation Call 1 (KG + docs 01-10)", timeout=3600, allow_tools=False)
        save_output(output_dir, "Foundation_Raw_Output_Part1.md", call1_output)
        docs1 = _split_documents(call1_output)
        saved1 = _save_docs(docs1, foundation_dir, fwd_eng_dir)
        print(f"  Call 1: {len(saved1)} documents saved.")
        if not docs1:
            print("  [Warning] Call 1 — no markers found. Saving raw output.")
            save_output(str(foundation_dir), "Foundation_Call1_Raw.md", call1_output)

    # ── Call 2: docs 11–20 (receives KG JSON only, not full Call 1 output) ──────
    if part2_raw.exists() and part2_raw.stat().st_size > 0:
        print("\n[Foundation] Call 2 — already done, loading saved output...")
        call2_output = part2_raw.read_text(encoding="utf-8")
        docs2 = _split_documents(call2_output)
        print(f"  Loaded {len(docs2)} documents from previous run.")
    else:
        # Extract only the KG JSON from Call 1 output — not the full 10 documents
        kg_json = docs1.get("ENTERPRISE_KNOWLEDGE_GRAPH.json", "")
        if not kg_json:
            # Fallback: send full call1 output if KG was not parsed
            kg_context = call1_output[:40000]
        else:
            kg_context = f"```json\n{kg_json}\n```"

        print("\n[Foundation] Call 2 — docs 11–20...")
        call2_prompt = (
            f"{CALL2_PROMPT}"
            f"{kg_context}\n\n"
            f"Begin Part 2 now."
        )
        call2_output = call_claude(call2_prompt, label="Foundation Call 2 (docs 11-20)", timeout=3600, allow_tools=False)
        save_output(output_dir, "Foundation_Raw_Output_Part2.md", call2_output)
        docs2 = _split_documents(call2_output)
        saved2 = _save_docs(docs2, foundation_dir, fwd_eng_dir)
        print(f"  Call 2: {len(saved2)} documents saved.")
        if not docs2:
            print("  [Warning] Call 2 — no markers found. Saving raw output.")
            save_output(str(fwd_eng_dir), "Foundation_Call2_Raw.md", call2_output)

    total = len(docs1) + len(docs2)
    print(f"\n[Foundation] Complete — {total} documents saved.")
    print(f"  Foundation_KnowledgeGraph: {foundation_dir}")
    print(f"  ForwardEngineering_Docs:   {fwd_eng_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Foundation Runner — synthesise all layers into Enterprise Knowledge Graph"
    )
    parser.add_argument("--output", required=True,
                        help="Root output directory containing the *_Analysis/ folders")
    args = parser.parse_args()
    run(args.output)
