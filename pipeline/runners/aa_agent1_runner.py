"""
AA Agent 1 Runner — Application Extractor
Two-turn approach:
  Turn 1: send FILE MAP + Source_Code.json → Claude replies with files it needs
  Turn 2: send requested DEEP_SCAN sections → Claude produces AA_App_Extractor.md
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from base_runner import (call_claude, load_layer1, load_file_cache,
                         build_file_map, extract_deep_scan_sections,
                         save_output, load_prior_output, output_already_exists)

PROMPT_FILE = Path(__file__).parent.parent.parent / "Prompts_Ready_To_Use" / "07_AA_Agent1_AppExtractor.md"
OUTPUT_FILE = "AA_App_Extractor.md"

TURN1_INSTRUCTION = """\
You are AA Agent 1 — Application Architecture Extractor.

Your job: map the complete application layer — every API endpoint, MediatR
command and query, handler, application service, interface, DI wiring, and
the full use case map (endpoint → handler → service → repository → database).

Below is the Layer 1 source summary followed by the complete FILE MAP.
Tell me exactly which files you need to read to do your job.

Reply with ONLY a valid JSON array of file paths. No explanation. No markdown.

"""

TURN2_INSTRUCTION = """\
You are AA Agent 1 — Application Architecture Extractor.

The file contents you requested are provided below (extracted from the deep scan).
Now perform your full extraction and produce AA_App_Extractor.md.

"""


def run(input_dir: str, output_dir: str, scan_dir: str) -> str:
    if output_already_exists(output_dir, OUTPUT_FILE):
        print(f"\n[AA Agent 1] Already done — skipping (found {OUTPUT_FILE})")
        return load_prior_output(output_dir, OUTPUT_FILE)

    print("\n[AA Agent 1] App Extractor — starting...")

    layer1     = load_layer1(input_dir)
    file_cache = load_file_cache(scan_dir)
    file_map   = build_file_map(layer1.get("source_code", []), file_cache)
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")

    source_context = json.dumps({
        "extraction_summary": layer1.get("summary", {}),
        "database":           layer1.get("database", {}),
        "config":             layer1.get("config", {}),
    }, indent=2, ensure_ascii=False)

    # Turn 1
    turn1_prompt = (
        TURN1_INSTRUCTION
        + f"Layer 1 Summary:\n```json\n{source_context}\n```\n\n"
        + "FILE MAP:\n" + file_map
    )
    print("  [AA Agent 1] Turn 1 — requesting file list...")
    turn1_output = call_claude(turn1_prompt, label="AA Agent 1 Turn 1", timeout=300)

    try:
        requested_files = json.loads(turn1_output.strip())
        if not isinstance(requested_files, list):
            raise ValueError
    except Exception:
        import re
        m = re.search(r'\[.*?\]', turn1_output, re.DOTALL)
        requested_files = json.loads(m.group()) if m else []

    print(f"  [AA Agent 1] Requested {len(requested_files)} files.")

    # Turn 2
    sections = extract_deep_scan_sections(scan_dir, requested_files)
    turn2_prompt = (
        f"{prompt_text}\n\n"
        f"---\n\n"
        f"{TURN2_INSTRUCTION}"
        f"# Layer 1 Summary\n\n```json\n{source_context}\n```\n\n"
        f"# Requested File Contents (from deep scan)\n\n{sections}\n\n"
        f"Begin application architecture extraction now."
    )

    print("  [AA Agent 1] Turn 2 — running analysis...")
    output = call_claude(turn2_prompt, label="AA Agent 1 Turn 2", timeout=2400)
    save_output(output_dir, OUTPUT_FILE, output)
    print("[AA Agent 1] Complete.")
    return output


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--scan-dir", required=True)
    args = p.parse_args()
    run(args.input, args.output, args.scan_dir)
