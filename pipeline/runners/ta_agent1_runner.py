"""
TA Agent 1 Runner — Stack Scout
Two-turn approach:
  Turn 1: send FILE MAP + Config.json → Claude replies with files it needs
  Turn 2: send requested DEEP_SCAN sections → Claude produces TA_Stack_Scout.md
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from base_runner import (call_claude, load_layer1, load_file_cache,
                         build_file_map, extract_deep_scan_sections,
                         save_output, load_prior_output, output_already_exists)

PROMPT_FILE = Path(__file__).parent.parent.parent / "Prompts_Ready_To_Use" / "05_TA_Agent1_StackScout.md"
OUTPUT_FILE = "TA_Stack_Scout.md"

TURN1_INSTRUCTION = """\
You are TA Agent 1 — Technology Stack Scout.

Your job: map the complete technology stack — every framework, library,
NuGet/npm package, DI registration, middleware pipeline entry, infrastructure
component, container setup, and CI/CD pipeline in this codebase.

Below is the Layer 1 config summary followed by the complete FILE MAP.
Tell me exactly which files you need to read to do your job.

Reply with ONLY a valid JSON array of file paths. No explanation. No markdown.

"""

TURN2_INSTRUCTION = """\
You are TA Agent 1 — Technology Stack Scout.

The file contents you requested are provided below (extracted from the deep scan).
Now perform your full stack scan and produce TA_Stack_Scout.md.

"""


def run(input_dir: str, output_dir: str, scan_dir: str) -> str:
    if output_already_exists(output_dir, OUTPUT_FILE):
        print(f"\n[TA Agent 1] Already done — skipping (found {OUTPUT_FILE})")
        return load_prior_output(output_dir, OUTPUT_FILE)

    print("\n[TA Agent 1] Stack Scout — starting...")

    layer1     = load_layer1(input_dir)
    file_cache = load_file_cache(scan_dir)
    file_map   = build_file_map(layer1.get("source_code", []), file_cache)
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")

    cfg = layer1.get("config", {})
    config_context = json.dumps({
        "all_params":         cfg.get("all_params", [])[:60],
        "connection_strings": cfg.get("connection_strings", []),
        "feature_flags":      cfg.get("feature_flags", []),
    }, indent=2, ensure_ascii=False)

    # Turn 1
    turn1_prompt = (
        TURN1_INSTRUCTION
        + f"Layer 1 Config Summary:\n```json\n{config_context}\n```\n\n"
        + "FILE MAP:\n" + file_map
    )
    print("  [TA Agent 1] Turn 1 — requesting file list...")
    turn1_output = call_claude(turn1_prompt, label="TA Agent 1 Turn 1", timeout=300)

    try:
        requested_files = json.loads(turn1_output.strip())
        if not isinstance(requested_files, list):
            raise ValueError
    except Exception:
        import re
        m = re.search(r'\[.*?\]', turn1_output, re.DOTALL)
        requested_files = json.loads(m.group()) if m else []

    print(f"  [TA Agent 1] Requested {len(requested_files)} files.")

    # Turn 2
    sections = extract_deep_scan_sections(scan_dir, requested_files)
    turn2_prompt = (
        f"{prompt_text}\n\n"
        f"---\n\n"
        f"{TURN2_INSTRUCTION}"
        f"# Layer 1 Config Summary\n\n```json\n{config_context}\n```\n\n"
        f"# Requested File Contents (from deep scan)\n\n{sections}\n\n"
        f"Begin technology stack scan now."
    )

    print("  [TA Agent 1] Turn 2 — running analysis...")
    output = call_claude(turn2_prompt, label="TA Agent 1 Turn 2", timeout=1800)
    save_output(output_dir, OUTPUT_FILE, output)
    print("[TA Agent 1] Complete.")
    return output


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--scan-dir", required=True)
    args = p.parse_args()
    run(args.input, args.output, args.scan_dir)
