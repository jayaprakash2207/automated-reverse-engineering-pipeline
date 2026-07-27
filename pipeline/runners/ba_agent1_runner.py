"""
BA Agent 1 Runner — Structural Scout
Two-turn approach:
  Turn 1: send FILE MAP → Claude replies with JSON list of files it needs
  Turn 2: send requested DEEP_SCAN sections → Claude produces BA_Structural_Scout.md
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from base_runner import (call_claude, load_layer1, load_file_cache,
                         build_file_map, extract_deep_scan_sections,
                         save_output, load_prior_output, output_already_exists)

PROMPT_FILE = Path(__file__).parent.parent.parent / "Prompts_Ready_To_Use" / "01_BA_Agent1_StructuralScout.md"
OUTPUT_FILE = "BA_Structural_Scout.md"

TURN1_INSTRUCTION = """\
You are BA Agent 1 — Business Structure Scout.

Your job: identify ALL business entities, aggregate roots, value objects,
state machines, domain events, business roles, and the ubiquitous language
of this codebase.

Below is the complete FILE MAP of the codebase — one line per file.
Study your job description, study the file names and summaries, then tell me
exactly which files you need to read to do your job.

Reply with ONLY a valid JSON array of file paths. No explanation. No markdown.
Example: ["src/Domain/Order.cs", "src/Services/OrderService.cs"]

FILE MAP:
"""

TURN2_INSTRUCTION = """\
You are BA Agent 1 — Business Structure Scout.

The file contents you requested are provided below (extracted from the deep scan).
Now perform your full analysis and produce BA_Structural_Scout.md.

"""


def run(input_dir: str, output_dir: str, scan_dir: str) -> str:
    if output_already_exists(output_dir, OUTPUT_FILE):
        print(f"\n[BA Agent 1] Already done — skipping (found {OUTPUT_FILE})")
        return load_prior_output(output_dir, OUTPUT_FILE)

    print("\n[BA Agent 1] Structural Scout — starting...")

    layer1      = load_layer1(input_dir)
    file_cache  = load_file_cache(scan_dir)
    file_map    = build_file_map(layer1.get("source_code", []), file_cache)
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")

    # Turn 1 — ask Claude which files it needs
    turn1_prompt = TURN1_INSTRUCTION + file_map
    print("  [BA Agent 1] Turn 1 — requesting file list...")
    turn1_output = call_claude(turn1_prompt, label="BA Agent 1 Turn 1", timeout=300)

    try:
        requested_files = json.loads(turn1_output.strip())
        if not isinstance(requested_files, list):
            raise ValueError("not a list")
    except Exception:
        # Fallback: extract JSON array from output
        import re
        m = re.search(r'\[.*?\]', turn1_output, re.DOTALL)
        requested_files = json.loads(m.group()) if m else []

    print(f"  [BA Agent 1] Requested {len(requested_files)} files: {requested_files[:5]}{'...' if len(requested_files) > 5 else ''}")

    # Turn 2 — send deep scan sections + prompt, get analysis
    sections = extract_deep_scan_sections(scan_dir, requested_files)
    layer1_context = json.dumps({
        "extraction_summary": layer1.get("summary", {}),
        "database": {
            "ef_entities": layer1.get("database", {}).get("ef_entities", [])[:30],
            "tables":      layer1.get("database", {}).get("tables", [])[:30],
        },
        "config": {
            "business_params": layer1.get("config", {}).get("business_params", [])[:30],
            "feature_flags":   layer1.get("config", {}).get("feature_flags", [])[:20],
        },
    }, indent=2, ensure_ascii=False)

    turn2_prompt = (
        f"{prompt_text}\n\n"
        f"---\n\n"
        f"{TURN2_INSTRUCTION}"
        f"# Layer 1 Summary\n\n```json\n{layer1_context}\n```\n\n"
        f"# Requested File Contents (from deep scan)\n\n{sections}\n\n"
        f"Begin producing BA_Structural_Scout.md now."
    )

    print("  [BA Agent 1] Turn 2 — running analysis...")
    output = call_claude(turn2_prompt, label="BA Agent 1 Turn 2", timeout=1800)
    save_output(output_dir, OUTPUT_FILE, output)
    print("[BA Agent 1] Complete.")
    return output


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--scan-dir", required=True)
    args = p.parse_args()
    run(args.input, args.output, args.scan_dir)
