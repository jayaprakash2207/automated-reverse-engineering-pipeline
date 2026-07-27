"""
Standard Forward Engineering Pipeline — Master Orchestrator
============================================================
Sequential pipeline — 13 steps, fully resumable at every checkpoint.
Step numbers below are what actually prints as "[STEP N]" at runtime —
keep this list in sync with the _banner() calls in orchestrate() below.

Steps:
  Step  1  — Layer 1           (Python, no AI — extract names/signatures)
  Step  2  — Scan Once         (Python, no AI — cache every file in full)
  Step  3  — Scan Agent        (Claude, chunk by chunk — deep extract all files)
  Step  4  — BA Agent 1        (Claude T1+T2 — produce BA_Structural_Scout.md)
  Step  5  — BA Agent 2        (Claude T1+T2 — produce BA_Deep_Analyst.md)
  Step  6  — DA Agent 1        (Claude T1+T2 — produce DA_Data_Extractor.md)
  Step  7  — DA Agent 2        (Claude T1+T2 — produce DA_Data_Reviewer.md)
  Step  8  — TA Agent 1        (Claude T1+T2 — produce TA_Stack_Scout.md)
  Step  9  — TA Agent 2 Batch 1 (Claude — file list + first-half deep analysis)
  Step 10  — TA Agent 2 Batch 2 (Claude — second-half analysis + synthesis → TA_Deep_Analyst.md)
  Step 11  — AA Agent 1        (Claude T1+T2 — produce AA_App_Extractor.md)
  Step 12  — AA Agent 2        (Claude — produce AA_Quality_Review.md)
  Step 13  — Foundation        (Claude, 2 calls — KG + all 20 docs)

TA Agent 2 is split into two processes (steps 9-10) instead of one giant
Turn-2 call: step 9 gets the file list and deep-analyses the first half of
requested files; step 10 analyses the second half and runs the synthesis
pass. Each half is saved to disk immediately, so if step 10 fails, re-running
never redoes step 9's file list or first-half analysis — only the failed
piece is retried.

Usage:
  # Run full pipeline
  python run.py --source "https://github.com/org/repo" --output ./results

  # Run specific steps only (batch mode)
  python run.py --source "C:/path/to/repo" --output ./results --from-step 1 --to-step 3
  python run.py --source "C:/path/to/repo" --output ./results --from-step 4 --to-step 7
  python run.py --source "C:/path/to/repo" --output ./results --from-step 8 --to-step 13

  # Skip Layer 1 if already extracted
  python run.py --source "C:/path/to/repo" --output ./results --skip-layer1

Batch suggestions:
  Batch 1 (Setup)     : --from-step 1  --to-step 3   (Layer1 + Scan Once + Scan Agent)
  Batch 2 (Business)  : --from-step 4  --to-step 5   (BA Agent 1 + BA Agent 2)
  Batch 3 (Data)      : --from-step 6  --to-step 7   (DA Agent 1 + DA Agent 2)
  Batch 4 (Tech)      : --from-step 8  --to-step 10  (TA Agent 1, TA Agent 2 Batch 1+2)
  Batch 5 (App)       : --from-step 11 --to-step 12  (AA Agent 1 + AA Agent 2)
  Batch 6 (Synthesis) : --from-step 13 --to-step 13  (Foundation KG + 25 docs)
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

SCRIPT_DIR   = Path(__file__).parent.resolve()
PIPELINE_DIR = SCRIPT_DIR / "pipeline"
RUNNERS_DIR  = PIPELINE_DIR / "runners"

# ── ANSI colours ───────────────────────────────────────────────────────────────
_USE_COLOR = sys.stdout.isatty()

def _c(code, text): return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text
def green(t):  return _c("32", t)
def yellow(t): return _c("33", t)
def red(t):    return _c("31", t)
def bold(t):   return _c("1",  t)
def cyan(t):   return _c("36", t)
def dim(t):    return _c("2",  t)

_TOTAL_STEPS = 13

def _banner(step, label):
    print(f"\n{'─' * 64}")
    print(bold(cyan(f"[STEP {step}/{_TOTAL_STEPS}]  {label}")))
    print(f"{'─' * 64}")


# ── Subprocess runner ──────────────────────────────────────────────────────────

def _run(cmd: list, label: str, timeout: int = 3600, cwd: str = None) -> dict:
    t0 = time.monotonic()
    try:
        proc = subprocess.run(
            cmd, capture_output=True, text=True,
            encoding="utf-8", errors="replace",
            check=False, timeout=timeout, cwd=cwd,
        )
        return {
            "label":      label,
            "returncode": proc.returncode,
            "stdout":     proc.stdout or "",
            "stderr":     proc.stderr or "",
            "duration_s": time.monotonic() - t0,
        }
    except subprocess.TimeoutExpired:
        return {"label": label, "returncode": -1, "stdout": "",
                "stderr": f"Timed out after {timeout}s", "duration_s": time.monotonic() - t0}
    except Exception as exc:
        return {"label": label, "returncode": -1, "stdout": "",
                "stderr": str(exc), "duration_s": time.monotonic() - t0}


def _print_result(r: dict):
    ok  = r["returncode"] == 0
    dur = f"{r['duration_s']:.1f}s"
    sep = "=" * 64
    status = green("COMPLETE") if ok else red("FAILED")
    print(f"\n{sep}")
    print(f"{bold(r['label'])} — {status}  {dim('(' + dur + ')')}")
    print(sep)
    if r["stdout"].strip():
        for line in r["stdout"].rstrip().splitlines():
            print(f"  {line}")
    if not ok and r["stderr"].strip():
        # Python tracebacks put the actual exception message LAST, not
        # first — truncating from the front (the old behaviour) showed
        # nothing but stack frames and hid the one line that explains the
        # failure. Show the tail instead.
        stderr = r["stderr"].strip()
        shown = stderr[-2000:]
        if len(stderr) > 2000:
            shown = "...(truncated)...\n" + shown
        print(f"\n  {red('[stderr]')}\n{shown}")
    print()


def _run_or_exit(cmd: list, label: str, timeout: int = 3600, cwd: str = None) -> dict:
    r = _run(cmd, label, timeout, cwd=cwd)
    _print_result(r)
    if r["returncode"] != 0:
        print(red(f"\nPIPELINE STOPPED — {label} failed. Fix the issue and re-run."))
        sys.exit(1)
    return r


# ── Input resolver ─────────────────────────────────────────────────────────────

def _is_url(source: str) -> bool:
    s = source.lower()
    return s.startswith("http://") or s.startswith("https://") or s.startswith("git@")


def clone_repo(url: str, output_dir: Path) -> str:
    clone_dir = output_dir / "repo-clone" / "repo"
    clone_dir.parent.mkdir(parents=True, exist_ok=True)
    print(f"  Cloning {url} → {clone_dir}")
    r = _run(["git", "clone", "--depth", "1", url, str(clone_dir)],
             label="git clone", timeout=600)
    _print_result(r)
    if r["returncode"] != 0:
        raise RuntimeError(f"Clone failed: {r['stderr'][:400]}")
    return str(clone_dir)


# ── Individual steps ───────────────────────────────────────────────────────────

py = sys.executable


def step_layer1(source: str, pipeline_out: Path) -> dict:
    pipeline_out.mkdir(parents=True, exist_ok=True)
    return _run_or_exit(
        [py, "-m", "layer1", "--source", source, "--output", str(pipeline_out)],
        label="[STEP 1] Layer 1 — Source Extraction",
        cwd=str(PIPELINE_DIR),
    )


def step_scan_once(repo_root: str, output_dir: Path) -> dict:
    cache_path = output_dir / "file_cache.json"
    if cache_path.exists() and cache_path.stat().st_size > 0:
        print(f"\n[STEP 2] Scan Once — already done (file_cache.json exists), skipping.")
        return {"label": "[STEP 2] Scan Once", "returncode": 0,
                "stdout": "skipped", "stderr": "", "duration_s": 0.0}
    return _run_or_exit(
        [py, str(PIPELINE_DIR / "scan_runner.py"),
         "--repo-root", repo_root, "--output", str(output_dir)],
        label="[STEP 2] Scan Once — Cache All Files",
    )


def step_scan_agent(output_dir: Path) -> dict:
    deep_scan = output_dir / "DEEP_SCAN_OUTPUT.md"
    if deep_scan.exists() and deep_scan.stat().st_size > 0:
        print(f"\n[STEP 3] Scan Agent — already done (DEEP_SCAN_OUTPUT.md exists), skipping.")
        return {"label": "[STEP 3] Scan Agent", "returncode": 0,
                "stdout": "skipped", "stderr": "", "duration_s": 0.0}
    return _run_or_exit(
        [py, str(PIPELINE_DIR / "scan_agent_runner.py"), "--output", str(output_dir)],
        label="[STEP 3] Scan Agent — Deep Extract All Files",
        timeout=7200,
    )


def _agent_step(runner: str, label: str, input_dir: Path, output_dir: Path,
                scan_dir: Path, timeout: int = 3600) -> dict:
    # --output is this agent's own subfolder (where its .md gets saved);
    # --scan-dir is the pipeline ROOT, where file_cache.json and
    # DEEP_SCAN_OUTPUT.md actually live. These are NOT the same directory —
    # passing only --output here used to make every agent look for
    # file_cache.json inside its own subfolder, where it never existed.
    return _run_or_exit(
        [py, str(RUNNERS_DIR / runner),
         "--input", str(input_dir), "--output", str(output_dir),
         "--scan-dir", str(scan_dir)],
        label=label,
        timeout=timeout,
    )


def step_foundation(output_dir: Path) -> dict:
    return _run_or_exit(
        [py, str(PIPELINE_DIR / "foundation_runner.py"), "--output", str(output_dir)],
        label="[STEP 14-15] Foundation — Knowledge Graph + 20 Documents",
        timeout=7200,
    )


# ── Final summary ──────────────────────────────────────────────────────────────

def _count(path: Path) -> int:
    return sum(1 for _ in path.rglob("*") if _.is_file()) if path.exists() else 0


def print_summary(output_dir: Path, all_results: list, total_s: float):
    sep = "═" * 64
    print(f"\n{sep}")
    print(bold(green("STANDARD FORWARD ENGINEERING PIPELINE — COMPLETE")))
    print(sep)

    print(f"\n{bold('Step results:')}")
    for r in all_results:
        icon = green("OK  ") if r["returncode"] == 0 else red("FAIL")
        dur = f"({r['duration_s']:.1f}s)"
        print(f"  {icon}  {r['label']}  {dim(dur)}")

    print(f"\n{bold('Output folders:')}")
    for label, folder in [
        ("Business Analysis",    output_dir / "Business_Analysis"),
        ("Data Analysis",        output_dir / "Data_Analysis"),
        ("Technology Analysis",  output_dir / "Technology_Analysis"),
        ("Application Analysis", output_dir / "Application_Analysis"),
        ("Foundation / KG",      output_dir / "Foundation_KnowledgeGraph"),
        ("Forward Engineering",  output_dir / "ForwardEngineering_Docs"),
    ]:
        n = _count(folder)
        status = green(f"{n:>3} files") if n > 0 else dim("  —  not created")
        print(f"  {status}  {label:<24}  {dim(str(folder))}")

    mins, secs = int(total_s // 60), int(total_s % 60)
    print(f"\n  Total wall time: {bold(f'{mins}m {secs}s')}")
    print(f"\n{bold('Output root:')}  {output_dir}")
    print(sep + "\n")


# ── Main orchestrator ──────────────────────────────────────────────────────────

def orchestrate(source: str, output_dir: Path, skip_layer1: bool,
                from_step: int = 1, to_step: int = _TOTAL_STEPS,
                track: str = None) -> int:
    output_dir   = output_dir.resolve()
    pipeline_out = output_dir / "Source_Extraction"
    output_dir.mkdir(parents=True, exist_ok=True)

    if not _is_url(source):
        source = str(Path(source).resolve())

    all_results = []
    t0 = time.monotonic()

    print(f"\n{'═' * 64}")
    print(bold(cyan("STANDARD FORWARD ENGINEERING PIPELINE")))
    print(f"{'═' * 64}")
    print(f"  Source      : {source}")
    print(f"  Output root : {output_dir}")
    print(f"  Skip Layer1 : {skip_layer1}")
    if track:
        print(bold(yellow(f"  Track       : --track {track}  (steps {from_step}–{to_step})")))
    elif from_step > 1 or to_step < _TOTAL_STEPS:
        print(bold(yellow(f"  Batch mode  : steps {from_step} – {to_step} only")))
    print(f"{'═' * 64}\n")

    def _should_run(step: int) -> bool:
        return from_step <= step <= to_step

    def _skip(step: int, label: str):
        print(yellow(f"\n  [STEP {step}] {label} — skipped (outside batch range)"))
        return {"label": f"[STEP {step}] {label}", "returncode": 0,
                "stdout": "skipped (batch)", "stderr": "", "duration_s": 0.0}

    # Resolve local repo path (needed for steps 1-2; ok to skip for later batches)
    repo_root = source
    if _is_url(source) and _should_run(1):
        print(bold("Cloning remote repository..."))
        try:
            repo_root = clone_repo(source, output_dir)
            print(green(f"  Local repo: {repo_root}\n"))
        except RuntimeError as exc:
            print(red(f"  Clone failed: {exc}"))
            repo_root = ""
    elif _is_url(source):
        # Later batch — the clone must already exist
        clone_dir = output_dir / "repo-clone" / "repo"
        if clone_dir.exists():
            repo_root = str(clone_dir)

    # Output sub-folders
    ba_out = output_dir / "Business_Analysis"
    da_out = output_dir / "Data_Analysis"
    ta_out = output_dir / "Technology_Analysis"
    aa_out = output_dir / "Application_Analysis"
    for d in (ba_out, da_out, ta_out, aa_out):
        d.mkdir(parents=True, exist_ok=True)

    # ── Step 1: Layer 1 ───────────────────────────────────────────────────────
    _banner(1, "Layer 1 — Deterministic Source Extraction")
    if not _should_run(1):
        all_results.append(_skip(1, "Layer 1"))
    elif skip_layer1:
        print(yellow("  Skipped (--skip-layer1)\n"))
        all_results.append({"label": "[STEP 1] Layer 1", "returncode": 0,
                             "stdout": "skipped", "stderr": "", "duration_s": 0.0})
    else:
        all_results.append(step_layer1(repo_root or source, pipeline_out))

    # ── Step 2: Scan Once ─────────────────────────────────────────────────────
    _banner(2, "Scan Once — Cache Every File (no truncation)")
    if not _should_run(2):
        all_results.append(_skip(2, "Scan Once"))
    else:
        all_results.append(step_scan_once(repo_root, output_dir))

    # ── Step 3: Scan Agent ────────────────────────────────────────────────────
    _banner(3, "Scan Agent — Deep Extract All Files (chunk by chunk)")
    if not _should_run(3):
        all_results.append(_skip(3, "Scan Agent"))
    else:
        all_results.append(step_scan_agent(output_dir))

    # ── Step 4: BA Agent 1 ─────────────────────────────────────────────────────
    _banner(4, "BA Agent 1 — Structural Scout")
    if not _should_run(4):
        all_results.append(_skip(4, "BA Agent 1"))
    else:
        all_results.append(_agent_step("ba_agent1_runner.py",
                                       "[STEP 4] BA Agent 1 — Structural Scout",
                                       pipeline_out, ba_out, output_dir))

    # ── Step 5: BA Agent 2 ─────────────────────────────────────────────────────
    _banner(5, "BA Agent 2 — Deep Analyst")
    if not _should_run(5):
        all_results.append(_skip(5, "BA Agent 2"))
    else:
        all_results.append(_agent_step("ba_agent2_runner.py",
                                       "[STEP 5] BA Agent 2 — Deep Analyst",
                                       pipeline_out, ba_out, output_dir))

    # ── Steps 6-7: DA Track ───────────────────────────────────────────────────
    _banner(6, "DA Agent 1 — Data Extractor")
    if not _should_run(6):
        all_results.append(_skip(6, "DA Agent 1"))
    else:
        all_results.append(_agent_step("da_agent1_runner.py",
                                       "[STEP 6] DA Agent 1 — Data Extractor",
                                       pipeline_out, da_out, output_dir))

    _banner(7, "DA Agent 2 — Data Reviewer")
    if not _should_run(7):
        all_results.append(_skip(7, "DA Agent 2"))
    else:
        all_results.append(_agent_step("da_agent2_runner.py",
                                       "[STEP 7] DA Agent 2 — Data Reviewer",
                                       pipeline_out, da_out, output_dir))

    # ── Steps 8-10: TA Track (TA Agent 2 split into Batch 1 + Batch 2) ──────────
    _banner(8, "TA Agent 1 — Stack Scout")
    if not _should_run(8):
        all_results.append(_skip(8, "TA Agent 1"))
    else:
        all_results.append(_agent_step("ta_agent1_runner.py",
                                       "[STEP 8] TA Agent 1 — Stack Scout",
                                       pipeline_out, ta_out, output_dir))

    _banner(9, "TA Agent 2 Batch 1 — Deep Analyst (file list + first half)")
    if not _should_run(9):
        all_results.append(_skip(9, "TA Agent 2 Batch 1"))
    else:
        all_results.append(_agent_step("ta_agent2_batch1_runner.py",
                                       "[STEP 9] TA Agent 2 Batch 1 — Deep Analyst",
                                       pipeline_out, ta_out, output_dir, timeout=9000))

    _banner(10, "TA Agent 2 Batch 2 — Deep Analyst (second half + synthesis)")
    if not _should_run(10):
        all_results.append(_skip(10, "TA Agent 2 Batch 2"))
    else:
        all_results.append(_agent_step("ta_agent2_batch2_runner.py",
                                       "[STEP 10] TA Agent 2 Batch 2 — Deep Analyst",
                                       pipeline_out, ta_out, output_dir, timeout=14400))

    # ── Steps 11-12: AA Track ────────────────────────────────────────────────────
    _banner(11, "AA Agent 1 — App Extractor")
    if not _should_run(11):
        all_results.append(_skip(11, "AA Agent 1"))
    else:
        all_results.append(_agent_step("aa_agent1_runner.py",
                                       "[STEP 11] AA Agent 1 — App Extractor",
                                       pipeline_out, aa_out, output_dir, timeout=3600))

    _banner(12, "AA Agent 2 — Quality Review")
    if not _should_run(12):
        all_results.append(_skip(12, "AA Agent 2"))
    else:
        all_results.append(_agent_step("aa_agent2_runner.py",
                                       "[STEP 12] AA Agent 2 — Quality Review",
                                       pipeline_out, aa_out, output_dir))

    # ── Step 13: Foundation ───────────────────────────────────────────────────
    _banner(13, "Foundation — Knowledge Graph + 20 Documents")
    if not _should_run(13):
        all_results.append(_skip(13, "Foundation"))
    else:
        all_results.append(step_foundation(output_dir))

    # ── Summary ───────────────────────────────────────────────────────────────
    print_summary(output_dir, all_results, time.monotonic() - t0)

    failed = [r for r in all_results if r["returncode"] != 0]
    return 0 if not failed else 1


# ── Track map ─────────────────────────────────────────────────────────────────

_TRACKS = {
    "setup":       (1,  3),   # Layer 1 + Scan Once + Scan Agent
    "business":    (4,  5),   # BA Agent 1 + BA Agent 2
    "data":        (6,  7),   # DA Agent 1 + DA Agent 2
    "technology":  (8,  10),  # TA Agent 1 + TA Agent 2 Batch 1 + Batch 2
    "application": (11, 12),  # AA Agent 1 + AA Agent 2
    "foundation":  (13, 13),  # Foundation KG + all 25 documents
}


# ── Entry point ────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        prog="run.py",
        description="Standard Forward Engineering Pipeline — fully automated reverse engineering.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full pipeline (recommended for first run)
  python run.py --source "https://github.com/dotnet-architecture/eShopOnWeb" --output ./results
  python run.py --source "C:/projects/legacy-app" --output ./results

  # Track mode — run one architecture domain at a time (RECOMMENDED)
  python run.py --source "C:/projects/legacy-app" --output ./results --track setup
  python run.py --source "C:/projects/legacy-app" --output ./results --track business
  python run.py --source "C:/projects/legacy-app" --output ./results --track data
  python run.py --source "C:/projects/legacy-app" --output ./results --track technology
  python run.py --source "C:/projects/legacy-app" --output ./results --track application
  python run.py --source "C:/projects/legacy-app" --output ./results --track foundation

  Available tracks:
    setup        steps 1–3   Layer 1 + Scan Once + Scan Agent           ~25 min
    business     steps 4–5   BA Agent 1 + BA Agent 2                    ~30 min
    data         steps 6–7   DA Agent 1 + DA Agent 2                    ~30 min
    technology   steps 8–10  TA Agent 1 + TA Agent 2 (Batch 1 + Batch 2) ~30 min
    application  steps 11–12 AA Agent 1 + AA Agent 2                    ~30 min
    foundation   step  13    Foundation KG + 25 documents               ~30 min

  # Step range mode — power users (re-run a single step, custom ranges)
  python run.py --source "C:/projects/legacy-app" --output ./results --from-step 9 --to-step 9
""",
    )
    parser.add_argument("--source",      required=True,
                        help="GitHub URL or local folder path")
    parser.add_argument("--output",      default="./forward-engineering-output",
                        help="Root output directory (default: ./forward-engineering-output)")
    parser.add_argument("--skip-layer1", action="store_true", default=False,
                        help="Skip Layer 1 extraction (use when already extracted)")
    parser.add_argument("--track",
                        choices=list(_TRACKS.keys()),
                        metavar="TRACK",
                        help=("Run one architecture track: "
                              + ", ".join(_TRACKS.keys())))
    parser.add_argument("--from-step",  type=int, default=None,
                        metavar="N",
                        help=f"First step to run (1–{_TOTAL_STEPS}). Ignored when --track is set.")
    parser.add_argument("--to-step",    type=int, default=None,
                        metavar="N",
                        help=f"Last step to run (1–{_TOTAL_STEPS}). Ignored when --track is set.")
    args = parser.parse_args()

    # Resolve from_step / to_step from --track or --from-step/--to-step
    if args.track:
        from_step, to_step = _TRACKS[args.track]
    else:
        from_step = args.from_step if args.from_step is not None else 1
        to_step   = args.to_step   if args.to_step   is not None else _TOTAL_STEPS

    if not (1 <= from_step <= _TOTAL_STEPS):
        parser.error(f"--from-step must be between 1 and {_TOTAL_STEPS}")
    if not (1 <= to_step <= _TOTAL_STEPS):
        parser.error(f"--to-step must be between 1 and {_TOTAL_STEPS}")
    if from_step > to_step:
        parser.error("--from-step cannot be greater than --to-step")

    code = orchestrate(
        source      = args.source,
        output_dir  = Path(args.output),
        skip_layer1 = args.skip_layer1,
        from_step   = from_step,
        to_step     = to_step,
        track       = args.track,
    )
    sys.exit(code)


if __name__ == "__main__":
    main()
