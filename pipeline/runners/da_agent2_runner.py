"""
DA Agent 2 Runner — Data Reviewer
Two-turn approach:
  Turn 1: send DA Agent 1 output + FILE MAP → Claude replies with files it needs
  Turn 2: send requested DEEP_SCAN sections → Claude produces DA_Data_Reviewer.md
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from base_runner import (call_claude, load_layer1, load_file_cache,
                         build_file_map, extract_deep_scan_sections,
                         save_output, load_prior_output, output_already_exists)

PROMPT_FILE = Path(__file__).parent.parent.parent / "Prompts_Ready_To_Use" / "04_DA_Agent2_DataReviewer.md"
OUTPUT_FILE = "DA_Data_Reviewer.md"

TURN1_INSTRUCTION = """\
You are DA Agent 2 — Data Reviewer.

DA Agent 1 has extracted the data model (provided below).
Your job: validate every finding, resolve uncertainties, and produce a
complete verified data architecture document.

Below is DA Agent 1's output followed by the complete FILE MAP.
Tell me exactly which files you need to read to verify the findings.
If DA Agent 1's output is sufficient to validate, reply with an empty array [].

Reply with ONLY a valid JSON array of file paths. No explanation. No markdown.

DA Agent 1 Output:
"""

TURN2_INSTRUCTION = """\
You are DA Agent 2 — Data Reviewer.

The file contents you requested are provided below (extracted from the deep scan).
Now validate DA Agent 1's findings and produce DA_Data_Reviewer.md.

"""


def run(input_dir: str, output_dir: str, scan_dir: str) -> str:
    if output_already_exists(output_dir, OUTPUT_FILE):
        print(f"\n[DA Agent 2] Already done — skipping (found {OUTPUT_FILE})")
        return load_prior_output(output_dir, OUTPUT_FILE)

    agent1_output = load_prior_output(output_dir, "DA_Data_Extractor.md")
    if not agent1_output:
        raise RuntimeError("DA Agent 1 output not found — run DA Agent 1 first.")

    print("\n[DA Agent 2] Data Reviewer — starting...")

    layer1     = load_layer1(input_dir)
    file_cache = load_file_cache(scan_dir)
    file_map   = build_file_map(layer1.get("source_code", []), file_cache)
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")

    # Turn 1
    turn1_prompt = TURN1_INSTRUCTION + agent1_output + "\n\nFILE MAP:\n" + file_map
    print("  [DA Agent 2] Turn 1 — requesting file list...")
    turn1_output = call_claude(turn1_prompt, label="DA Agent 2 Turn 1", timeout=300)

    try:
        requested_files = json.loads(turn1_output.strip())
        if not isinstance(requested_files, list):
            raise ValueError
    except Exception:
        import re
        m = re.search(r'\[.*?\]', turn1_output, re.DOTALL)
        requested_files = json.loads(m.group()) if m else []

    print(f"  [DA Agent 2] Requested {len(requested_files)} files.")

    # Turn 2
    sections = extract_deep_scan_sections(scan_dir, requested_files) if requested_files else ""
    turn2_prompt = (
        f"{prompt_text}\n\n"
        f"---\n\n"
        f"{TURN2_INSTRUCTION}"
        f"# DA Agent 1 Output\n\n{agent1_output}\n\n"
        + (f"# Requested File Contents (from deep scan)\n\n{sections}\n\n" if sections else "")
        + "Begin review and produce DA_Data_Reviewer.md now."
    )

    print("  [DA Agent 2] Turn 2 — running review...")
    output = call_claude(turn2_prompt, label="DA Agent 2 Turn 2", timeout=1800)
    save_output(output_dir, OUTPUT_FILE, output)
    print("[DA Agent 2] Complete.")
    return output


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--scan-dir", required=True)
    args = p.parse_args()
    run(args.input, args.output, args.scan_dir)
