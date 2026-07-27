"""
Forward Engineering — Step 5: Sprint (Work) Planner
Breaks the overall scope into an ordered backlog of sprints — one per bounded
context / feature area — sequenced by dependency.

Prefers the Traceability Matrix (richest dependency signal) but degrades
gracefully to Domain Model + Service Catalog if it's missing or incomplete —
this pipeline must not crash just because an earlier reverse-engineering run
left a gap.
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, save_json, output_already_exists,
                       load_reverse_engineering_docs, has_reverse_engineering_docs)

OUTPUT_FILE = "SPRINT_BACKLOG.json"
LIGHTWEIGHT_DIR = "Lightweight_Docs"

PLANNER_PROMPT = """\
You are the Sprint Planner agent. Break the system described below into an ORDERED
backlog of sprints — one sprint per bounded context / cohesive feature area — so
that a sprint never appears before the sprints it depends on.

Some inputs may be marked "(not available)" — if so, base the plan on whatever
IS available; do not fail or refuse just because one input is missing.

Reply with ONLY a valid JSON array, no markdown, no explanation, in this exact shape:
[
  {{"sprint": 1, "name": "<bounded context name>", "depends_on": [], "rationale": "<why this order>"}},
  {{"sprint": 2, "name": "<bounded context name>", "depends_on": [1], "rationale": "<why>"}}
]

--- DOMAIN MODEL ---
{domain_model}

--- TRACEABILITY MATRIX ---
{traceability}

--- SERVICE CATALOG ---
{service_catalog}
"""


def _extract_json_array(text: str):
    try:
        data = json.loads(text.strip())
        if isinstance(data, list):
            return data
    except Exception:
        pass
    m = re.search(r"\[.*\]", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group())
        except Exception:
            return None
    return None


def run(input_dir: str, output_dir: str) -> dict:
    if output_already_exists(output_dir, OUTPUT_FILE):
        print(f"\n[Sprint Planner] Already done — skipping (found {OUTPUT_FILE})")
        return {"status": "done"}

    print("\n[Sprint Planner] Building the ordered work plan...")

    if has_reverse_engineering_docs(input_dir):
        docs = load_reverse_engineering_docs(input_dir).get("forward_docs", {})
        domain_model = docs.get("05_DOMAIN_MODEL.md", "(not available)")
        service_catalog = docs.get("10_SERVICE_CATALOG.md", "(not available)")
        kg = load_reverse_engineering_docs(input_dir).get("knowledge_graph", {})
        traceability = kg.get("TRACEABILITY_MATRIX.md", "(not available — proceeding without it)")
    else:
        lw_dir = Path(output_dir) / LIGHTWEIGHT_DIR
        domain_model = (lw_dir / "02_DOMAIN_DATA_MODEL_SKETCH.md").read_text(encoding="utf-8") \
            if (lw_dir / "02_DOMAIN_DATA_MODEL_SKETCH.md").exists() else "(not available)"
        service_catalog = (lw_dir / "03_API_SERVICE_SKETCH.md").read_text(encoding="utf-8") \
            if (lw_dir / "03_API_SERVICE_SKETCH.md").exists() else "(not available)"
        traceability = "(not available — lightweight scenario, single feature scope)"

    if domain_model == "(not available)" and service_catalog == "(not available)":
        print("\n[Sprint Planner] BLOCKED — no domain/service documentation found at all.")
        return {"status": "blocked", "reason": "no_input_material"}

    prompt = PLANNER_PROMPT.format(
        domain_model=domain_model, traceability=traceability, service_catalog=service_catalog,
    )
    output = call_claude(prompt, label="Sprint Planner", timeout=900, allow_tools=False)
    backlog = _extract_json_array(output)

    if not backlog:
        print("  [Warning] Could not parse a sprint backlog — saving raw output for review.")
        save_json(output_dir, "Sprint_Planner_Raw_Output.json", {"raw": output})
        return {"status": "failed", "reason": "unparseable_output"}

    save_json(output_dir, OUTPUT_FILE, backlog)
    print(f"  {len(backlog)} sprints planned: {[s.get('name') for s in backlog]}")
    return {"status": "done", "sprints": backlog}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    result = run(args.input, args.output)
    sys.exit(0 if result["status"] == "done" else 3)
