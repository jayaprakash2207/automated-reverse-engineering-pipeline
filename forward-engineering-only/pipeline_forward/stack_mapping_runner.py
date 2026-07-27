"""
Forward Engineering — Step 3: Stack Mapping
Writes ONE shared old-pattern -> new-pattern translation contract that every
later development agent (Backend, Security, Frontend) must follow — so
conventions stay consistent across every sprint instead of being reinvented
sprint by sprint.

Requires: target_stack.json (from Step 1 — Stack Selection) to already exist.
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, save_output, load_target_stack, output_already_exists)

OUTPUT_FILE = "STACK_MAPPING_CONTRACT.md"

MAPPING_PROMPT = """\
You are the Stack Mapping agent for a forward-engineering (modernization) project.
Your job is to make ONE set of decisions, now, that every later development agent
(Backend, Security, Frontend) must follow for the rest of the project — so
conventions stay consistent across every feature instead of drifting sprint to
sprint.

Target stack (confirmed): {target_stack}

Original technology blueprint (from the legacy system, if available):
{blueprint}

Do NOT use any file-editing, write, or save tools — do not attempt to create or
write a file yourself. Return the complete document as plain text in your response;
the calling script will save it to disk as STACK_MAPPING_CONTRACT.md on your behalf.

Produce the reference document's content as a table mapping each of the following
pattern categories from the ORIGINAL stack to a single, specific convention in the
TARGET stack. If the original blueprint is unavailable, base the target-side
convention on common best practice for the target stack and say so.

Cover at minimum:
- Persistence / ORM pattern
- API routing / controller convention
- Dependency injection approach
- Input validation approach
- Authentication / access-control pattern
- Testing framework and test-naming convention
- Naming convention (casing, file layout)
- Project / folder structure
- Error handling / exception convention

Be specific and prescriptive — this is a contract, not a discussion of options.
"""


def run(input_dir: str, output_dir: str) -> dict:
    if output_already_exists(output_dir, OUTPUT_FILE):
        print(f"\n[Stack Mapping] Already done — skipping (found {OUTPUT_FILE})")
        return {"status": "done"}

    target_stack = load_target_stack(output_dir)
    if not target_stack:
        print("\n[Stack Mapping] BLOCKED — target stack not yet confirmed. Run Stack Selection first.")
        return {"status": "blocked", "reason": "target_stack_not_confirmed"}

    print(f"\n[Stack Mapping] Building translation contract for target stack: {target_stack!r}")
    blueprint_path = Path(input_dir) / "ForwardEngineering_Docs" / "12_TECHNOLOGY_BLUEPRINT.md"
    blueprint = blueprint_path.read_text(encoding="utf-8") if blueprint_path.exists() else "(not available)"

    prompt = MAPPING_PROMPT.format(target_stack=target_stack, blueprint=blueprint)
    output = call_claude(prompt, label="Stack Mapping", timeout=900, allow_tools=False)
    save_output(output_dir, OUTPUT_FILE, output)

    return {"status": "done"}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    result = run(args.input, args.output)
    sys.exit(0 if result["status"] == "done" else 3)
