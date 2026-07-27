"""
Forward Engineering Pipeline — Batch 1: Setup Phase
=====================================================
A SEPARATE pipeline from run.py (reverse engineering). Consumes the output of
run.py (or a lightweight epic/UX elaboration, if no legacy app exists) and
prepares everything needed before per-feature development can start.

Batch 1 steps (this file):
  Step 1 — Stack Selection     (decide/confirm the target stack)
  Step 2 — Elaboration         (CONDITIONAL — only if no reverse-engineered docs exist)
  Step 3 — Stack Mapping       (one shared old->new pattern contract)
  Step 4 — Scaffolder          (empty, buildable project skeleton)
  Step 5 — Sprint Planner      (ordered backlog of sprints)

Once Step 5 (Sprint Planner) succeeds, this script automatically chains straight
into run_forward_batch2.py (per-sprint development/test/review loop) using the
same --input/--output, after printing an acknowledgement banner — no separate
manual invocation needed. Pass --no-auto-batch2 to stop after Batch 1 instead
(the old behavior) and trigger Batch 2 yourself later.

Usage:
  python run_forward.py --input ./results --output ./forward_results
  python run_forward.py --input ./results --output ./forward_results --target-stack "Python, FastAPI, PostgreSQL"
  python run_forward.py --input ./results --output ./forward_results --epic ./epic.md --ux ./ux-notes.md
  python run_forward.py --input ./results --output ./forward_results --no-auto-batch2
  python run_forward.py --input ./results --output ./forward_results --only "Basket Context" --max-retries 2
"""

import argparse
import subprocess
import sys
import time
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SCRIPT_DIR = Path(__file__).parent.resolve()
FWD_DIR = SCRIPT_DIR / "pipeline_forward"

_USE_COLOR = sys.stdout.isatty()


def _c(code, text):
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text


def green(t):
    return _c("32", t)


def yellow(t):
    return _c("33", t)


def red(t):
    return _c("31", t)


def bold(t):
    return _c("1", t)


def cyan(t):
    return _c("36", t)


def dim(t):
    return _c("2", t)


_TOTAL_STEPS = 5


def _banner(step, label):
    print(f"\n{'-' * 64}")
    print(bold(cyan(f"[BATCH 1 · STEP {step}/{_TOTAL_STEPS}]  {label}")))
    print(f"{'-' * 64}")


def _run(cmd: list, label: str, timeout: int = 1800) -> dict:
    t0 = time.monotonic()
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True, encoding="utf-8", errors="replace",
            check=False, timeout=timeout,
        )
        return {
            "label": label, "returncode": proc.returncode,
            "stdout": proc.stdout or "", "stderr": proc.stderr or "",
            "duration_s": time.monotonic() - t0,
        }
    except subprocess.TimeoutExpired:
        return {"label": label, "returncode": -1, "stdout": "",
                "stderr": f"Timed out after {timeout}s", "duration_s": time.monotonic() - t0}


def _run_interactive(cmd: list, label: str, timeout: int = 1800) -> dict:
    """
    Like _run(), but does NOT capture stdout/stderr/stdin — they're shared
    directly with this terminal instead of buffered into a pipe. Required for
    any step that may call input() and needs the user to see the prompt and
    type a live response. _run()'s capture_output=True would otherwise buffer
    everything until the subprocess exits, so a prompt would never be seen
    and the user would be typing blind.
    """
    t0 = time.monotonic()
    try:
        proc = subprocess.run(cmd, timeout=timeout, check=False)
        return {"label": label, "returncode": proc.returncode, "stdout": "", "stderr": "",
                "duration_s": time.monotonic() - t0}
    except subprocess.TimeoutExpired:
        return {"label": label, "returncode": -1, "stdout": "",
                "stderr": f"Timed out after {timeout}s", "duration_s": time.monotonic() - t0}


def _print_result(r: dict, ok_codes=(0,)):
    ok = r["returncode"] in ok_codes
    dur = f"{r['duration_s']:.1f}s"
    status = green("COMPLETE") if ok else red("FAILED")
    print(f"\n{'=' * 64}")
    print(f"{bold(r['label'])} — {status}  {dim('(' + dur + ')')}")
    print("=" * 64)
    if r["stdout"].strip():
        for line in r["stdout"].rstrip().splitlines():
            print(f"  {line}")
    if not ok and r["stderr"].strip():
        print(f"\n  {red('[stderr]')} {r['stderr'][:800].strip()}")
    print()


py = sys.executable


def main():
    parser = argparse.ArgumentParser(
        prog="run_forward.py",
        description="Forward Engineering Pipeline (Batch 1 — Setup Phase). Separate from run.py.",
    )
    parser.add_argument("--input", default="./results",
                        help="Reverse-engineering pipeline output dir (default: ./results)")
    parser.add_argument("--output", default="./forward_results",
                        help="Root output dir for this pipeline (default: ./forward_results)")
    parser.add_argument("--target-stack", default=None,
                        help='e.g. "Python, FastAPI, PostgreSQL" — omit to have Claude propose options')
    parser.add_argument("--epic", default=None, help="Path to an epic/user-story file (no-legacy-app scenario)")
    parser.add_argument("--ux", default=None, help="Path to a UX description file (no-legacy-app scenario)")
    parser.add_argument("--no-auto-batch2", action="store_true", default=False,
                        help="Stop after Batch 1 instead of automatically chaining into Batch 2")
    parser.add_argument("--migrate-data", action="store_true", default=False,
                        help="Passed through to Batch 2: enable Data Migration script generation")
    parser.add_argument("--max-retries", type=int, default=3,
                        help="Passed through to Batch 2: fix-loop retry cap per sprint")
    parser.add_argument("--only", default=None,
                        help="Passed through to Batch 2: run just one sprint by name")
    args = parser.parse_args()

    input_dir = str(Path(args.input).resolve())
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'=' * 64}")
    print(bold(cyan("FORWARD ENGINEERING PIPELINE — BATCH 1 (SETUP)")))
    print(f"{'=' * 64}")
    print(f"  Input  (reverse-engineering results): {input_dir}")
    print(f"  Output (this pipeline)               : {output_dir}")
    print(f"{'=' * 64}\n")

    t0 = time.monotonic()

    # ── Step 1: Stack Selection ────────────────────────────────────────────
    _banner(1, "Stack Selection")
    cmd = [py, str(FWD_DIR / "stack_selection_runner.py"), "--input", input_dir, "--output", str(output_dir)]
    if args.target_stack:
        cmd += ["--target-stack", args.target_stack]
        r = _run(cmd, "[STEP 1] Stack Selection")
        _print_result(r, ok_codes=(0, 3))
    else:
        print(cyan(
            "  No --target-stack given — Claude will propose options and ask you to\n"
            "  choose right here in this terminal.\n"
        ))
        r = _run_interactive(cmd, "[STEP 1] Stack Selection")
        print()
    if r["returncode"] == 3:
        print(yellow(bold(
            "\nPIPELINE PAUSED (not failed) — target stack not yet confirmed.\n"
            "This terminal isn't interactive, so review STACK_SELECTION_OPTIONS.md in the output "
            'folder, then re-run this exact command with --target-stack "<your choice>".'
        )))
        sys.exit(0)
    if r["returncode"] != 0:
        print(red(f"\nPIPELINE STOPPED — {r['label']} failed. Fix the issue and re-run."))
        sys.exit(1)

    # ── Step 2: Elaboration (conditional) ──────────────────────────────────
    _banner(2, "Requirements Elaboration (conditional — skipped if legacy docs exist)")
    cmd = [py, str(FWD_DIR / "elaboration_runner.py"), "--input", input_dir, "--output", str(output_dir)]
    if args.epic:
        cmd += ["--epic", args.epic]
    if args.ux:
        cmd += ["--ux", args.ux]
    r = _run(cmd, "[STEP 2] Elaboration")
    _print_result(r, ok_codes=(0, 3))
    if r["returncode"] == 3:
        print(red(bold(
            "\nPIPELINE STOPPED — no legacy documentation found and no --epic/--ux supplied.\n"
            "Re-run with --epic <file> and/or --ux <file>."
        )))
        sys.exit(1)
    if r["returncode"] != 0:
        print(red(f"\nPIPELINE STOPPED — {r['label']} failed. Fix the issue and re-run."))
        sys.exit(1)

    # ── Step 3: Stack Mapping ───────────────────────────────────────────────
    _banner(3, "Stack Mapping")
    r = _run([py, str(FWD_DIR / "stack_mapping_runner.py"), "--input", input_dir, "--output", str(output_dir)],
              "[STEP 3] Stack Mapping")
    _print_result(r)
    if r["returncode"] != 0:
        print(red(f"\nPIPELINE STOPPED — {r['label']} failed. Fix the issue and re-run."))
        sys.exit(1)

    # ── Step 4: Scaffolder ──────────────────────────────────────────────────
    _banner(4, "Environment Scaffolding")
    r = _run([py, str(FWD_DIR / "scaffold_runner.py"), "--input", input_dir, "--output", str(output_dir)],
              "[STEP 4] Scaffolder", timeout=1800)
    _print_result(r)
    if r["returncode"] != 0:
        print(red(f"\nPIPELINE STOPPED — {r['label']} failed. Fix the issue and re-run."))
        sys.exit(1)

    # ── Step 5: Sprint Planner ───────────────────────────────────────────────
    _banner(5, "Sprint (Work) Planner")
    r = _run([py, str(FWD_DIR / "sprint_planner_runner.py"), "--input", input_dir, "--output", str(output_dir)],
              "[STEP 5] Sprint Planner")
    _print_result(r)
    if r["returncode"] != 0:
        print(red(f"\nPIPELINE STOPPED — {r['label']} failed. Fix the issue and re-run."))
        sys.exit(1)

    total = time.monotonic() - t0
    mins, secs = int(total // 60), int(total % 60)
    print(f"\n{'=' * 64}")
    print(bold(green("BATCH 1 (SETUP) — COMPLETE")))
    print("=" * 64)
    print(f"  Output root: {output_dir}")
    print(f"  Total time : {mins}m {secs}s")
    print("=" * 64 + "\n")

    if args.no_auto_batch2:
        print("  --no-auto-batch2 given — stopping here. Run Batch 2 manually with:")
        print(f'    python run_forward_batch2.py --input "{input_dir}" --output "{output_dir}"\n')
        return

    print(bold(cyan(
        "Batch 1 acknowledged as complete — automatically starting Batch 2 "
        "(per-sprint development/test/review loop) now.\n"
    )))

    batch2_cmd = [py, str(SCRIPT_DIR / "run_forward_batch2.py"),
                  "--input", input_dir, "--output", str(output_dir),
                  "--max-retries", str(args.max_retries)]
    if args.migrate_data:
        batch2_cmd += ["--migrate-data"]
    if args.only:
        batch2_cmd += ["--only", args.only]

    r2 = _run_interactive(batch2_cmd, "[BATCH 2] Per-Sprint Development Cycle", timeout=None)
    sys.exit(r2["returncode"])


if __name__ == "__main__":
    main()
