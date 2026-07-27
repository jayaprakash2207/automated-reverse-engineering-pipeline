"""
TA Agent 2 Runner — Deep Analyst — Batch 2 of 2
Reads the cached file list and Batch 1 output produced by
ta_agent2_batch1_runner.py, deep-analyses the remaining files, then runs the
Synthesis Pass (Stages 6-8 + Final Response Assembly) to produce the final
TA_Deep_Analyst.md.

Resumable at each step:
  - If TA_Deep_Analyst_Batch2.md already exists, the batch-2 analysis call
    is skipped and only the synthesis call is (re)run.
  - If TA_Deep_Analyst.md already exists, this whole step is skipped.
This means a failure in the synthesis call never forces Batch 2's (or
Batch 1's) analysis to be redone.
"""

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from base_runner import (call_claude, extract_deep_scan_sections,
                         save_output, load_prior_output, output_already_exists)

PROMPT_FILE = Path(__file__).parent.parent.parent / "Prompts_Ready_To_Use" / "06_TA_Agent2_DeepAnalyst.md"
FINAL_OUTPUT_FILE     = "TA_Deep_Analyst.md"
BATCH1_OUTPUT_FILE    = "TA_Deep_Analyst_Batch1.md"
BATCH2_OUTPUT_FILE    = "TA_Deep_Analyst_Batch2.md"
REQUESTED_FILES_CACHE = "ta_agent2_requested_files.json"

BATCH2_INSTRUCTION = """\
You are TA Agent 2 — Technology Deep Analyst.

This is a two-batch analysis. Batch 1's chunk analysis is provided below for
context and ID continuation. You are now analysing BATCH 2 of 2 (the second
half of the requested files). Produce ONLY the per-chunk analysis stages —
Stage 2, Stage 3, Stage 4, and Stage 5 — for the files provided below.

Do NOT run the Synthesis Pass (Stages 6, 7, 8) and do NOT produce the Final
Response Assembly — that happens in a separate step after this.

Continue AP-, NFR-, and TD- numbering from Batch 1's last ID — do not restart
at 01 and do not repeat Batch 1's findings.

"""

SYNTHESIS_INSTRUCTION = """\
You are TA Agent 2 — Technology Deep Analyst.

Both batches of chunk analysis are complete and provided below. Run the
Synthesis Pass (Stages 6, 7, and 8) using both chunk analyses as your
complete cross-layer picture, then assemble and deliver the Final Response —
all 8 outputs — exactly as specified in the Final Response Assembly section
of the instructions above.

"""


def _split_files(requested_files: list) -> tuple:
    mid = math.ceil(len(requested_files) / 2)
    return requested_files[:mid], requested_files[mid:]


def run(output_dir: str, scan_dir: str) -> str:
    if output_already_exists(output_dir, FINAL_OUTPUT_FILE):
        print(f"\n[TA Agent 2 Batch 2] Already done — skipping (found {FINAL_OUTPUT_FILE})")
        return load_prior_output(output_dir, FINAL_OUTPUT_FILE)

    agent1_output = load_prior_output(output_dir, "TA_Stack_Scout.md")
    if not agent1_output:
        raise RuntimeError("TA Agent 1 output not found — run TA Agent 1 first.")

    cache_path = Path(output_dir) / REQUESTED_FILES_CACHE
    if not cache_path.exists():
        raise RuntimeError(
            "No cached file list found — run ta_agent2_batch1_runner.py first."
        )
    requested_files = json.loads(cache_path.read_text(encoding="utf-8"))

    batch1_output = load_prior_output(output_dir, BATCH1_OUTPUT_FILE)
    if not batch1_output:
        raise RuntimeError(
            f"{BATCH1_OUTPUT_FILE} not found — run ta_agent2_batch1_runner.py first."
        )

    print("\n[TA Agent 2 Batch 2] Deep Analyst — starting...")

    _, batch2_files = _split_files(requested_files)
    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")

    batch2_output = load_prior_output(output_dir, BATCH2_OUTPUT_FILE)
    if batch2_output:
        print(f"  [TA Agent 2 Batch 2] Already done — skipping (found {BATCH2_OUTPUT_FILE})")
    elif not batch2_files:
        print("  [TA Agent 2 Batch 2] No files in batch 2 — nothing to analyse.")
    else:
        sections = extract_deep_scan_sections(scan_dir, batch2_files)
        batch2_prompt = (
            f"{prompt_text}\n\n"
            f"---\n\n"
            f"{BATCH2_INSTRUCTION}"
            f"# TA Agent 1 Output\n\n{agent1_output}\n\n"
            f"# Batch 1 Chunk Analysis (for context and ID continuation)\n\n{batch1_output}\n\n"
            f"# Requested File Contents — Batch 2 of 2\n\n{sections}\n\n"
            "Begin Batch 2 deep technology analysis now."
        )
        print("  [TA Agent 2 Batch 2] Running analysis...")
        batch2_output = call_claude(batch2_prompt, label="TA Agent 2 Batch 2", timeout=1800)
        save_output(output_dir, BATCH2_OUTPUT_FILE, batch2_output)

    print("  [TA Agent 2 Batch 2] Running synthesis pass...")
    synthesis_prompt = (
        f"{prompt_text}\n\n"
        f"---\n\n"
        f"{SYNTHESIS_INSTRUCTION}"
        f"# TA Agent 1 Output\n\n{agent1_output}\n\n"
        f"# Batch 1 Chunk Analysis\n\n{batch1_output}\n\n"
        + (f"# Batch 2 Chunk Analysis\n\n{batch2_output}\n\n" if batch2_output else "")
        + "Run the Synthesis Pass and Final Response Assembly now."
    )
    output = call_claude(synthesis_prompt, label="TA Agent 2 Synthesis", timeout=1800)
    save_output(output_dir, FINAL_OUTPUT_FILE, output)
    print("[TA Agent 2 Batch 2] Complete.")
    return output


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True, help="Unused — kept for interface parity with other agent steps.")
    p.add_argument("--output", required=True)
    p.add_argument("--scan-dir", required=True)
    args = p.parse_args()
    run(args.output, args.scan_dir)
