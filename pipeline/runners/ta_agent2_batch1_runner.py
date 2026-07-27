"""
TA Agent 2 Runner — Deep Analyst — Batch 1 of 2
Splits the old single giant Turn 2 call (all requested files in one prompt)
into two smaller file batches, each its own process/step. This shrinks the
prompt+expected-output size per Claude call and makes the work resumable at
a finer grain: if Batch 1 succeeds and Batch 2 later fails, re-running does
NOT redo Batch 1 or the Turn 1 file-list request.

  Turn 1:   send TA Agent 1 output + FILE MAP → Claude replies with files it
            needs. Cached to ta_agent2_requested_files.json so a retry of
            this script — or ta_agent2_batch2_runner.py — never re-asks.
  Batch 1:  deep-analyse the first half of the requested files →
            TA_Deep_Analyst_Batch1.md

Run ta_agent2_batch2_runner.py next — it analyses the second half and runs
the Synthesis Pass to produce the final TA_Deep_Analyst.md.
"""

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from base_runner import (call_claude, load_layer1, load_file_cache,
                         build_file_map, extract_deep_scan_sections,
                         save_output, load_prior_output, output_already_exists)

PROMPT_FILE = Path(__file__).parent.parent.parent / "Prompts_Ready_To_Use" / "06_TA_Agent2_DeepAnalyst.md"
FINAL_OUTPUT_FILE     = "TA_Deep_Analyst.md"
BATCH1_OUTPUT_FILE    = "TA_Deep_Analyst_Batch1.md"
REQUESTED_FILES_CACHE = "ta_agent2_requested_files.json"

TURN1_INSTRUCTION = """\
You are TA Agent 2 — Technology Deep Analyst.

TA Agent 1 has mapped the technology stack (provided below).
Your job: go deeper — identify architecture patterns, security setup,
caching strategy, logging/observability, performance characteristics,
and deployment topology.

Below is TA Agent 1's output followed by the complete FILE MAP.
Tell me exactly which files you need to read to do your job.
If TA Agent 1's output is sufficient, reply with an empty array [].

Reply with ONLY a valid JSON array of file paths. No explanation. No markdown.

TA Agent 1 Output:
"""

BATCH1_INSTRUCTION = """\
You are TA Agent 2 — Technology Deep Analyst.

This is a two-batch analysis. You are analysing BATCH 1 of 2 (the first half
of the requested files). Produce ONLY the per-chunk analysis stages from the
instructions above — Stage 2 (Technology Stack Assessment), Stage 3
(Architecture Pattern Catalog), Stage 4 (NFR Registry), and Stage 5
(Technical Debt & Risk Register) — for the files provided below.

Do NOT run the Synthesis Pass (Stages 6, 7, 8) and do NOT produce the Final
Response Assembly — a second batch will analyse the remaining files, and a
separate synthesis step will combine both batches into the final document.

Start AP-, NFR-, and TD- numbering at 01 — Batch 2 will continue numbering
from where you leave off.

"""


def _split_files(requested_files: list) -> tuple:
    mid = math.ceil(len(requested_files) / 2)
    return requested_files[:mid], requested_files[mid:]


def run(input_dir: str, output_dir: str, scan_dir: str) -> None:
    if output_already_exists(output_dir, FINAL_OUTPUT_FILE):
        print(f"\n[TA Agent 2 Batch 1] Already done — skipping (found {FINAL_OUTPUT_FILE})")
        return

    agent1_output = load_prior_output(output_dir, "TA_Stack_Scout.md")
    if not agent1_output:
        raise RuntimeError("TA Agent 1 output not found — run TA Agent 1 first.")

    print("\n[TA Agent 2 Batch 1] Deep Analyst — starting...")

    cache_path = Path(output_dir) / REQUESTED_FILES_CACHE
    if cache_path.exists() and cache_path.stat().st_size > 0:
        requested_files = json.loads(cache_path.read_text(encoding="utf-8"))
        print(f"  [TA Agent 2 Batch 1] Using cached file list ({len(requested_files)} files) — Turn 1 skipped.")
    else:
        layer1     = load_layer1(input_dir)
        file_cache = load_file_cache(scan_dir)
        file_map   = build_file_map(layer1.get("source_code", []), file_cache)

        turn1_prompt = TURN1_INSTRUCTION + agent1_output + "\n\nFILE MAP:\n" + file_map
        print("  [TA Agent 2 Batch 1] Turn 1 — requesting file list...")
        turn1_output = call_claude(turn1_prompt, label="TA Agent 2 Turn 1", timeout=300)

        try:
            requested_files = json.loads(turn1_output.strip())
            if not isinstance(requested_files, list):
                raise ValueError
        except Exception:
            import re
            m = re.search(r'\[.*?\]', turn1_output, re.DOTALL)
            requested_files = json.loads(m.group()) if m else []

        print(f"  [TA Agent 2 Batch 1] Requested {len(requested_files)} files.")
        cache_path.write_text(json.dumps(requested_files, indent=2), encoding="utf-8")

    batch1_files, batch2_files = _split_files(requested_files)
    print(f"  [TA Agent 2 Batch 1] Split: {len(batch1_files)} file(s) in batch 1, {len(batch2_files)} in batch 2.")

    if output_already_exists(output_dir, BATCH1_OUTPUT_FILE):
        print(f"  [TA Agent 2 Batch 1] Already done — skipping (found {BATCH1_OUTPUT_FILE})")
        return

    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")
    sections = extract_deep_scan_sections(scan_dir, batch1_files) if batch1_files else ""
    batch1_prompt = (
        f"{prompt_text}\n\n"
        f"---\n\n"
        f"{BATCH1_INSTRUCTION}"
        f"# TA Agent 1 Output\n\n{agent1_output}\n\n"
        + (f"# Requested File Contents — Batch 1 of 2\n\n{sections}\n\n" if sections else "")
        + "Begin Batch 1 deep technology analysis now."
    )

    print("  [TA Agent 2 Batch 1] Running analysis...")
    output = call_claude(batch1_prompt, label="TA Agent 2 Batch 1", timeout=1800)
    save_output(output_dir, BATCH1_OUTPUT_FILE, output)
    print("[TA Agent 2 Batch 1] Complete. Run ta_agent2_batch2_runner.py next.")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--scan-dir", required=True)
    args = p.parse_args()
    run(args.input, args.output, args.scan_dir)
