"""
AA Agent 2 Runner — Quality Review
Validates AA Agent 1's output. No file reading needed — validation is
done against AA Agent 1's output alone.
Produces AA_Quality_Review.md with PASS / PARTIAL / FAIL verdicts.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
from base_runner import (call_claude, save_output, load_prior_output, output_already_exists)

PROMPT_FILE = Path(__file__).parent.parent.parent / "Prompts_Ready_To_Use" / "08_AA_Agent2_QualityReview.md"
OUTPUT_FILE = "AA_Quality_Review.md"


def run(input_dir: str, output_dir: str, scan_dir: str = None) -> str:
    # scan_dir is unused here — this runner only reviews AA Agent 1's prior
    # text output, no file_cache/deep_scan lookup needed. Accepted only so
    # run.py can pass --scan-dir uniformly to every agent runner.
    if output_already_exists(output_dir, OUTPUT_FILE):
        print(f"\n[AA Agent 2] Already done — skipping (found {OUTPUT_FILE})")
        return load_prior_output(output_dir, OUTPUT_FILE)

    agent1_output = load_prior_output(output_dir, "AA_App_Extractor.md")
    if not agent1_output:
        raise RuntimeError("AA Agent 1 output not found — run AA Agent 1 first.")

    print("\n[AA Agent 2] Quality Review — starting...")

    prompt_text = PROMPT_FILE.read_text(encoding="utf-8")
    prompt = (
        f"{prompt_text}\n\n"
        f"---\n\n"
        f"# Input: AA Agent 1 Full Output\n\n"
        f"{agent1_output}\n\n"
        f"Review the above output now. "
        f"Validate JSON, graph edges, evidence traceability, and completeness. "
        f"Produce your PASS / PARTIAL / FAIL verdict with specific findings."
    )

    output = call_claude(prompt, label="AA Agent 2", timeout=1800)
    save_output(output_dir, OUTPUT_FILE, output)
    print("[AA Agent 2] Complete.")
    return output


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--input",  required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--scan-dir", required=True)
    args = p.parse_args()
    run(args.input, args.output, args.scan_dir)
