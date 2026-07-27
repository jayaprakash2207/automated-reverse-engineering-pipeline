"""
Scan Agent Runner — Step 3
Reads file_cache.json, splits all files into chunks of 30, sends each chunk
to Claude for full extraction. Saves Chunk_N_Output.md immediately after each
chunk. Merges all chunks into DEEP_SCAN_OUTPUT.md when all chunks are done.

Resume logic: if Chunk_N_Output.md exists → skip that chunk.
              if DEEP_SCAN_OUTPUT.md exists → skip entire step.
"""

import json
import math
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).parent))
from base_runner import call_claude, output_already_exists

CHUNK_SIZE = 30
SCAN_DIR_NAME = "Scan"
DEEP_SCAN_FILE = "DEEP_SCAN_OUTPUT.md"

SCAN_CHUNK_PROMPT = """\
You are the Scan Agent. Your job is to read every file provided and extract
ALL of the following for each file:

- Every class, interface, enum, struct — with all fields and properties
- Every method signature AND full method body logic
- Every business rule, validation, constraint found in code
- Every dependency injected or referenced
- Every configuration key used
- Every database entity, table, column reference
- Every API endpoint, route, HTTP verb
- Every exception thrown and why
- Every external service called

Be thorough and complete. Do not summarise or skip anything.
This extraction is used by all downstream analysis agents — if you miss it
here, no agent will ever see it.

Format each file as:

=== FILE: <relative/path/to/file> ===
<your complete extraction>

Process every file below now.

"""


def _format_chunk(files: dict) -> str:
    parts = [SCAN_CHUNK_PROMPT]
    for path, content in files.items():
        parts.append(f"--- SOURCE: {path} ---\n{content}\n")
    return "\n".join(parts)


def run(output_dir: str) -> None:
    out = Path(output_dir)
    scan_dir = out / SCAN_DIR_NAME
    scan_dir.mkdir(parents=True, exist_ok=True)
    deep_scan_path = out / DEEP_SCAN_FILE

    # Resume: entire merge already done
    if deep_scan_path.exists() and deep_scan_path.stat().st_size > 0:
        print(f"\n[Scan Agent] DEEP_SCAN_OUTPUT.md exists — skipping entire step.")
        return

    # Load file cache
    cache_path = out / "file_cache.json"
    if not cache_path.exists():
        raise RuntimeError(
            f"file_cache.json not found: '{cache_path}'.\n"
            f"This is produced by Step 2 (Scan Once).\n"
            f"Likely cause: Step 2 hasn't completed for this --output folder, or --output points "
            f"somewhere different than where Step 2 actually wrote its results.\n"
            f"Fix: run Step 2 again, e.g.\n"
            f"  python run.py --source <your-source> --output \"{output_dir}\" --track setup"
        )

    with open(cache_path, encoding="utf-8") as f:
        cache = json.load(f)

    all_paths = list(cache.keys())
    total_files = len(all_paths)
    total_chunks = math.ceil(total_files / CHUNK_SIZE)

    print(f"\n[Scan Agent] {total_files} files → {total_chunks} chunks of {CHUNK_SIZE}")

    # Process each chunk
    for chunk_idx in range(1, total_chunks + 1):
        chunk_file = scan_dir / f"Chunk_{chunk_idx:02d}_Output.md"

        # Resume: chunk already done
        if chunk_file.exists() and chunk_file.stat().st_size > 0:
            print(f"  [Chunk {chunk_idx:02d}/{total_chunks}] Already done — skipping.")
            continue

        start = (chunk_idx - 1) * CHUNK_SIZE
        end   = min(start + CHUNK_SIZE, total_files)
        chunk_paths = all_paths[start:end]
        chunk_files = {p: cache[p] for p in chunk_paths}

        print(f"  [Chunk {chunk_idx:02d}/{total_chunks}] Processing files {start+1}–{end} ...")

        prompt = _format_chunk(chunk_files)
        output = call_claude(prompt, label=f"Scan Chunk {chunk_idx:02d}", timeout=1800)

        chunk_file.write_text(output, encoding="utf-8")
        print(f"  [Chunk {chunk_idx:02d}/{total_chunks}] Saved → {chunk_file}")

    # Merge all chunks into DEEP_SCAN_OUTPUT.md
    print(f"\n[Scan Agent] Merging {total_chunks} chunks into {DEEP_SCAN_FILE} ...")
    with open(deep_scan_path, "w", encoding="utf-8") as out_f:
        for chunk_idx in range(1, total_chunks + 1):
            chunk_file = scan_dir / f"Chunk_{chunk_idx:02d}_Output.md"
            if chunk_file.exists():
                out_f.write(chunk_file.read_text(encoding="utf-8"))
                out_f.write("\n\n")

    print(f"[Scan Agent] DEEP_SCAN_OUTPUT.md saved → {deep_scan_path}")


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--output", required=True)
    args = p.parse_args()
    run(args.output)
