"""
Forward Engineering — Step 1: Stack Selection
Establishes the target technology stack before any design or development work.

Two ways to resolve it:
  a) --target-stack "Java 17, Spring Boot, React, Oracle Database" → recorded
     immediately, no Claude call.
  b) omitted → Claude proposes 2-3 candidate stacks (frontend/backend/database each
     named separately) grounded in the original Technology Blueprint + NFR doc. In an
     interactive terminal, a numbered menu is shown — pick one, or choose "0" to enter
     your own frontend/backend/database combination. In a non-interactive terminal
     (CI, piped input), falls back to writing STACK_SELECTION_OPTIONS.md and pausing
     (clean exit, not an error) until the user re-runs with --target-stack set.

Resumable: if target_stack.json already exists, this step is a no-op.
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, save_output, load_target_stack, save_target_stack)

OPTIONS_PROMPT = """\
You are the Stack Selection agent for a forward-engineering (modernization) project.

Below is the ORIGINAL system's technology blueprint and non-functional requirements,
extracted from the legacy application. Propose 2-3 candidate target technology stacks
for the REBUILT system.

Rules:
- Do NOT use any file-editing, write, or save tools, and do not attempt to create
  or write to STACK_SELECTION_OPTIONS.md or any other file yourself. Return the
  complete document as plain text in your response — the calling script saves it
  to disk on your behalf.
- Each candidate MUST separately name: a frontend framework, a backend language +
  web framework, and a database engine. Never leave any of the three out.
- Justify each candidate against the NFRs below (scale, latency, team familiarity if stated).
- Do NOT pick for the user — present options with tradeoffs, plainly, and stop there.
- If the original blueprint is empty/unavailable, propose based on the NFRs alone and
  say so explicitly.

Output format — BOTH parts, in this order:
1. Plain markdown, one "## Option N" section per candidate. Inside each, state
   Frontend / Backend / Database on their own lines, then a short rationale.
2. Then, as the LAST thing in your response with nothing after it, a single fenced
   ```json code block containing a JSON array, one object per option, in exactly
   this shape (no extra keys, no trailing comments):
   [
     {{"id": 1, "frontend": "React", "backend": "Java 17, Spring Boot", "database": "Oracle Database (existing schema retained)"}},
     {{"id": 2, "frontend": "...", "backend": "...", "database": "..."}}
   ]

--- ORIGINAL TECHNOLOGY BLUEPRINT ---
{blueprint}

--- NFR SPECIFICATION ---
{nfr}
"""

_JSON_BLOCK_RE = re.compile(r"```json\s*(\[.*?\])\s*```", re.DOTALL)


def _parse_options(raw_text: str) -> list:
    """
    Pull the trailing JSON options array out of Claude's markdown response.
    Returns [] if it's missing, malformed, or any entry lacks one of the
    three required fields — callers must fall back to free-text entry in
    that case rather than build a menu from partial data.
    """
    m = _JSON_BLOCK_RE.search(raw_text)
    if not m:
        return []
    try:
        data = json.loads(m.group(1))
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    options = []
    for item in data:
        if isinstance(item, dict) and all(k in item and item[k] for k in ("id", "frontend", "backend", "database")):
            options.append(item)
    return options


def _format_stack(option: dict) -> str:
    return f"Backend: {option['backend']} | Frontend: {option['frontend']} | Database: {option['database']}"


def _prompt_custom_stack() -> str:
    print("\nEnter your own combination — one field at a time (all three are required):")
    frontend = input("  Frontend (e.g. React, Angular): ").strip()
    backend = input("  Backend — language + framework (e.g. Java 17, Spring Boot): ").strip()
    database = input("  Database (e.g. Oracle Database, PostgreSQL): ").strip()
    while not frontend:
        frontend = input("  Frontend (required): ").strip()
    while not backend:
        backend = input("  Backend (required): ").strip()
    while not database:
        database = input("  Database (required): ").strip()
    return f"Backend: {backend} | Frontend: {frontend} | Database: {database}"


def run(input_dir: str, output_dir: str, target_stack: str = None) -> dict:
    if load_target_stack(output_dir):
        confirmed = load_target_stack(output_dir)
        print(f"\n[Stack Selection] Already decided — skipping (target_stack = {confirmed!r})")
        return {"status": "confirmed", "target_stack": confirmed}

    if target_stack:
        save_target_stack(output_dir, target_stack)
        print(f"\n[Stack Selection] Recorded target stack: {target_stack!r}")
        return {"status": "confirmed", "target_stack": target_stack}

    print("\n[Stack Selection] No --target-stack given — asking Claude to propose options...")
    base = Path(input_dir) / "ForwardEngineering_Docs"
    blueprint = (base / "12_TECHNOLOGY_BLUEPRINT.md").read_text(encoding="utf-8") \
        if (base / "12_TECHNOLOGY_BLUEPRINT.md").exists() else "(not available)"
    nfr = (base / "14_NFR_SPECIFICATION.md").read_text(encoding="utf-8") \
        if (base / "14_NFR_SPECIFICATION.md").exists() else "(not available)"

    prompt = OPTIONS_PROMPT.format(blueprint=blueprint, nfr=nfr)
    output = call_claude(prompt, label="Stack Selection — propose options", timeout=600, allow_tools=False)
    save_output(output_dir, "STACK_SELECTION_OPTIONS.md", output)

    if not sys.stdin.isatty():
        # Not an interactive terminal (e.g. CI, piped input) — can't safely
        # block on input(). Fall back to write-and-pause.
        print(
            "\n[Stack Selection] PAUSED — options written to "
            f"{Path(output_dir) / 'STACK_SELECTION_OPTIONS.md'}\n"
            "  Not running in an interactive terminal. Review them, then re-run with:\n"
            '    --target-stack "<your chosen option>"\n'
        )
        return {"status": "paused"}

    print("\n" + "=" * 64)
    print(output)
    print("=" * 64)

    options = _parse_options(output)

    if options:
        custom_id = 0
        print("\nChoose a target stack:")
        for opt in options:
            print(f"  {opt['id']}) {_format_stack(opt)}")
        print(f"  {custom_id}) Enter my own custom combination")

        valid_ids = {opt["id"] for opt in options} | {custom_id}
        choice = None
        while choice not in valid_ids:
            raw = input(f"\nEnter a number ({', '.join(str(i) for i in sorted(valid_ids))}): ").strip()
            if raw.isdigit() and int(raw) in valid_ids:
                choice = int(raw)
            else:
                print("  Not a valid choice, try again.")

        if choice == custom_id:
            chosen = _prompt_custom_stack()
        else:
            chosen = _format_stack(next(o for o in options if o["id"] == choice))
    else:
        print(
            "\n[Stack Selection] Could not parse structured options from Claude's response "
            "— falling back to free text."
        )
        chosen = input(
            "\nEnter your target stack — name a language, backend framework, and "
            "database (copy one of the options above, or write your own): "
        ).strip()
        while not chosen:
            chosen = input("Target stack cannot be empty. Enter your choice: ").strip()

    save_target_stack(output_dir, chosen)
    print(f"\n[Stack Selection] Recorded target stack: {chosen!r}")
    return {"status": "confirmed", "target_stack": chosen}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--target-stack", default=None)
    args = p.parse_args()
    result = run(args.input, args.output, args.target_stack)
    sys.exit(0 if result["status"] == "confirmed" else 3)
