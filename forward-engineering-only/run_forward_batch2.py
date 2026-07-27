"""
Forward Engineering Pipeline — Batch 2: Per-Sprint Development Cycle
======================================================================
Runs AFTER run_forward.py (Batch 1) has produced a confirmed target stack,
a Stack Mapping contract, a scaffolded project, and an ordered SPRINT_BACKLOG.json.

For each sprint, in backlog order:
  6.  Backend Developer agent      — domain, business rules, API endpoints
  7.  Security Reviewer agent      — access control (kept separate on purpose)
  8.  Frontend Developer agent     — screens, wired to the backend's API surface
  9.  Data Migration (conditional) — only with --migrate-data; script only, never
                                      touches a real database
  10. Test-Writer agent            — unit / integration / e2e tests
  11. Test Executor                — REAL subprocess build + test run, no LLM
  12. Independent Review           — 3 blind, parallel reviewers, reconciled
  13. Fix loop                     — same agents (6/7/8), re-invoked with the
                                      reviewers' findings, capped at --max-retries
  14. Learnings write-back         — root cause logged so later sprints don't
                                      repeat it

A sprint that still fails after the retry cap is marked FAILED_BLOCKED in the
sprint ledger and the run CONTINUES to independent sprints — one stuck sprint
does not stop the whole batch. Every write to the ledger is atomic (temp file +
rename) — a crash mid-write can never be mistaken for a completed sprint.

Usage:
  python run_forward_batch2.py --input ./results --output ./forward_results
  python run_forward_batch2.py --input ./results --output ./forward_results --migrate-data
  python run_forward_batch2.py --input ./results --output ./forward_results --max-retries 2
  python run_forward_batch2.py --input ./results --output ./forward_results --only "Basket Context"
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent / "pipeline_forward"))
from fwd_base import (load_ledger, update_ledger_entry, append_learning, load_learnings_text)  # noqa: E402

import backend_dev_runner  # noqa: E402
import security_review_runner  # noqa: E402
import frontend_dev_runner  # noqa: E402
import data_migration_runner  # noqa: E402
import test_writer_runner  # noqa: E402
import test_executor_runner  # noqa: E402
import review_runner  # noqa: E402

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_USE_COLOR = sys.stdout.isatty()


def _c(code, text):
    return f"\033[{code}m{text}\033[0m" if _USE_COLOR else text


def green(t): return _c("32", t)
def yellow(t): return _c("33", t)
def red(t): return _c("31", t)
def bold(t): return _c("1", t)
def cyan(t): return _c("36", t)
def dim(t): return _c("2", t)


def _banner(sprint_idx, total, name, attempt=None):
    label = f"SPRINT {sprint_idx}/{total} — {name}"
    if attempt:
        label += f"  (fix-loop attempt {attempt})"
    print(f"\n{'#' * 70}")
    print(bold(cyan(label)))
    print(f"{'#' * 70}")


def _load_sprint_backlog(output_dir: Path) -> list:
    path = output_dir / "SPRINT_BACKLOG.json"
    if not path.exists():
        print(red(f"\nERROR: {path} not found. Run Batch 1 (run_forward.py) first."))
        sys.exit(1)
    import json
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _run_one_sprint(sprint: dict, input_dir: str, output_dir: str,
                     migrate_data: bool, max_retries: int) -> str:
    """Returns final status string: PASSED | FAILED_BLOCKED"""
    sprint_name = sprint["name"]
    feedback = None

    for attempt in range(1, max_retries + 2):  # attempt 1 = first try, then up to max_retries fixes
        is_retry = attempt > 1
        if is_retry:
            print(yellow(f"\n  -- Fix-loop attempt {attempt - 1}/{max_retries} for '{sprint_name}' --"))

        update_ledger_entry(output_dir, sprint_name, status="IN_PROGRESS", attempts=attempt - 1)

        try:
            backend_dev_runner.run(sprint, input_dir, output_dir, feedback=feedback)
            security_review_runner.run(sprint, input_dir, output_dir, feedback=feedback)
            frontend_dev_runner.run(sprint, input_dir, output_dir, feedback=feedback)
            data_migration_runner.run(sprint, input_dir, output_dir, migrate_data=migrate_data)
            test_writer_runner.run(sprint, input_dir, output_dir, feedback=feedback)
            test_result = test_executor_runner.run(sprint, output_dir)
        except Exception as exc:
            # Deliberately broad: a hard Claude CLI failure (RuntimeError from
            # call_claude), an encoding crash, a None where a string was
            # expected — whatever shape the next unforeseen bug takes, it
            # should not crash the whole multi-sprint batch. Treat it like a
            # failed attempt and let the existing retry loop below decide
            # whether to try again or give up on just this one sprint.
            print(red(f"\n  Sprint '{sprint_name}' attempt {attempt} raised an unhandled error: {exc}"))
            feedback = f"The previous attempt failed with an unexpected error, not a review finding:\n{exc}"
            if attempt - 1 >= max_retries:
                update_ledger_entry(output_dir, sprint_name, status="FAILED_BLOCKED", attempts=attempt - 1)
                append_learning(
                    output_dir, sprint_name,
                    issue="Unhandled agent-call failure",
                    root_cause=str(exc)[:800],
                    fix_applied=f"None successful within {max_retries} attempts",
                    outcome="FAILED_BLOCKED",
                )
                print(red(f"\n  Sprint '{sprint_name}' — FAILED_BLOCKED after {max_retries} "
                           f"fix-loop attempts (unhandled errors)."))
                return "FAILED_BLOCKED"
            continue

        if test_result["status"] == "blocked":
            # Environment/tooling problem, not a code problem — retrying won't help.
            update_ledger_entry(output_dir, sprint_name, status="FAILED_BLOCKED",
                                 notes=[f"Test Executor blocked: {test_result.get('message')}"])
            append_learning(output_dir, sprint_name,
                             issue="Could not execute tests",
                             root_cause=test_result.get("message", "unknown tooling issue"),
                             fix_applied="none — needs environment fix, not a code fix",
                             outcome="FAILED_BLOCKED")
            return "FAILED_BLOCKED"

        review = review_runner.run(sprint, input_dir, output_dir, test_result)

        if test_result.get("passed") and review["overall"] == "PASS":
            update_ledger_entry(output_dir, sprint_name, status="PASSED", attempts=attempt - 1)
            print(green(f"\n  Sprint '{sprint_name}' — PASSED (attempt {attempt})"))
            return "PASSED"

        # Not passing — build feedback for the next attempt.
        findings = list(review.get("consolidated_findings", []))
        if not test_result.get("passed"):
            findings.append(
                f"[test-executor] Real test run failed (exit code {test_result.get('returncode')}): "
                f"{test_result.get('stderr_tail', '')[-500:]}"
            )
        feedback = "\n".join(f"- {f}" for f in findings)

        if attempt - 1 >= max_retries:
            update_ledger_entry(output_dir, sprint_name, status="FAILED_BLOCKED", attempts=attempt - 1)
            append_learning(
                output_dir, sprint_name,
                issue="Sprint failed review/tests after retry cap",
                root_cause=feedback[:800],
                fix_applied=f"None successful within {max_retries} attempts",
                outcome="FAILED_BLOCKED",
            )
            print(red(f"\n  Sprint '{sprint_name}' — FAILED_BLOCKED after {max_retries} fix-loop attempts."))
            return "FAILED_BLOCKED"

    return "FAILED_BLOCKED"  # unreachable, defensive


def main():
    parser = argparse.ArgumentParser(
        prog="run_forward_batch2.py",
        description="Forward Engineering Pipeline — Batch 2 (per-sprint development cycle).",
    )
    parser.add_argument("--input", default="./results")
    parser.add_argument("--output", default="./forward_results")
    parser.add_argument("--migrate-data", action="store_true", default=False,
                        help="Enable Data Migration script generation (still never touches a real DB)")
    parser.add_argument("--max-retries", type=int, default=3)
    parser.add_argument("--only", default=None,
                        help="Run just one sprint by name (for testing a single sprint)")
    args = parser.parse_args()

    input_dir = str(Path(args.input).resolve())
    output_dir = Path(args.output).resolve()

    backlog = _load_sprint_backlog(output_dir)
    if args.only:
        backlog = [s for s in backlog if s["name"] == args.only]
        if not backlog:
            print(red(f"No sprint named {args.only!r} found in SPRINT_BACKLOG.json"))
            sys.exit(1)

    print(f"\n{'=' * 70}")
    print(bold(cyan("FORWARD ENGINEERING PIPELINE — BATCH 2 (PER-SPRINT DEVELOPMENT)")))
    print(f"{'=' * 70}")
    print(f"  Sprints planned : {len(backlog)}")
    print(f"  Max retries     : {args.max_retries}")
    print(f"  Data migration  : {'enabled (script-only)' if args.migrate_data else 'disabled'}")
    print(f"{'=' * 70}\n")

    ledger = load_ledger(str(output_dir))
    t0 = time.monotonic()
    results = {}

    for idx, sprint in enumerate(backlog, start=1):
        name = sprint["name"]
        existing = ledger.get(name, {}).get("status")
        if existing in ("PASSED", "FAILED_BLOCKED"):
            print(dim(f"\n[Sprint {idx}/{len(backlog)}] '{name}' — already {existing}, skipping."))
            results[name] = existing
            continue

        _banner(idx, len(backlog), name)
        status = _run_one_sprint(sprint, input_dir, str(output_dir), args.migrate_data, args.max_retries)
        results[name] = status

    total = time.monotonic() - t0
    passed = sum(1 for s in results.values() if s == "PASSED")
    blocked = sum(1 for s in results.values() if s == "FAILED_BLOCKED")

    print(f"\n{'=' * 70}")
    print(bold(green("BATCH 2 — RUN COMPLETE")))
    print("=" * 70)
    for name, status in results.items():
        icon = green("PASSED") if status == "PASSED" else red("FAILED_BLOCKED")
        print(f"  {icon:<20} {name}")
    print(f"\n  {passed} passed, {blocked} blocked, out of {len(results)} sprints")
    print(f"  Total time: {int(total // 60)}m {int(total % 60)}s")
    print(f"  Ledger    : {output_dir / 'sprint_ledger.json'}")
    print(f"  Learnings : {output_dir / 'LEARNINGS.md'}")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
