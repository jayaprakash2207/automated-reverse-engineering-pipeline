"""
Forward Engineering — Step 2: Requirements Elaboration (CONDITIONAL)
Only runs when no reverse-engineered documentation exists — i.e. the project
is starting from an epic / user story / UX design instead of a legacy codebase.

Produces the six lightweight documents described in the Forward Engineering
Plan (Section 3.2):
  1. Feature Requirements Brief
  2. Domain & Data Model Sketch
  3. API & Service Sketch
  4. UI/UX Reference Notes
  5. Security & Access Notes
  6. Assumptions & Evidence Log   ← every claim tagged: stated / inferred / assumed

If reverse-engineered docs ARE present, this step is skipped automatically —
nothing to elaborate, the full 25-document set already exists.
"""

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, has_reverse_engineering_docs, output_already_exists)

OUTPUT_DIRNAME = "Lightweight_Docs"
MARKER_FILE = "ELABORATION_COMPLETE.marker"

ELABORATION_PROMPT = """\
You are the Requirements Elaboration agent. There is no existing legacy codebase for
this project — the only input is the epic / UX material below. Produce the six
lightweight documents that substitute for a full reverse-engineering documentation set.

CRITICAL RULE: tag every single requirement, entity, field, or rule you write with its
evidentiary basis, inline, using one of:
  [STATED]   — explicitly present in the source material below
  [INFERRED] — a reasonable deduction from the source material (e.g. a UI field implies a
               data field)
  [ASSUMED]  — not present or implied at all; you filled a gap using a common convention

Do not silently invent facts without tagging them ASSUMED. This is the single most
important rule in this task.

Produce ALL six documents, in order, separated by markers exactly like this:

=== DOCUMENT: 01_FEATURE_REQUIREMENTS_BRIEF.md ===
(problem statement, scope, acceptance criteria)

=== DOCUMENT: 02_DOMAIN_DATA_MODEL_SKETCH.md ===
(entities, fields, relationships needed for this feature only)

=== DOCUMENT: 03_API_SERVICE_SKETCH.md ===
(endpoints and service interfaces this feature needs)

=== DOCUMENT: 04_UIUX_REFERENCE_NOTES.md ===
(screens and interaction behaviour, derived directly from the supplied design)

=== DOCUMENT: 05_SECURITY_ACCESS_NOTES.md ===
(authentication / access-control requirements scoped to this feature)

=== DOCUMENT: 06_ASSUMPTIONS_EVIDENCE_LOG.md ===
(one row per [ASSUMED] or [INFERRED] item above, so it can be reviewed before development)

--- SOURCE MATERIAL (epic / user story / UX description) ---
{source}
"""


def _split_documents(text: str) -> dict:
    docs = {}
    pattern = re.compile(r"=== DOCUMENT:\s*(.+?)\s*===", re.IGNORECASE)
    parts = pattern.split(text)
    i = 1
    while i < len(parts) - 1:
        docs[parts[i].strip()] = parts[i + 1].strip()
        i += 2
    return docs


def run(input_dir: str, output_dir: str, epic_path: str = None, ux_path: str = None) -> dict:
    out = Path(output_dir)
    docs_dir = out / OUTPUT_DIRNAME

    if has_reverse_engineering_docs(input_dir):
        print("\n[Elaboration] Existing reverse-engineered documentation found — skipping "
              "(full 25-document set already covers this).")
        return {"status": "skipped", "reason": "reverse_engineering_docs_present"}

    if output_already_exists(str(docs_dir), "06_ASSUMPTIONS_EVIDENCE_LOG.md"):
        print("\n[Elaboration] Already done — skipping (lightweight docs exist).")
        return {"status": "done"}

    source_parts = []
    for label, p in (("EPIC", epic_path), ("UX DESIGN", ux_path)):
        if p and Path(p).exists():
            source_parts.append(f"## {label}\n\n{Path(p).read_text(encoding='utf-8')}")

    if not source_parts:
        print(
            "\n[Elaboration] BLOCKED — no reverse-engineered docs found, and no --epic / "
            "--ux file was provided either. Nothing to build from.\n"
            "  Re-run with --epic <file> and/or --ux <file>.\n"
        )
        return {"status": "blocked", "reason": "no_input_material"}

    print("\n[Elaboration] No legacy docs found — elaborating from epic/UX material...")
    prompt = ELABORATION_PROMPT.format(source="\n\n".join(source_parts))
    output = call_claude(prompt, label="Elaboration", timeout=1800, allow_tools=False)

    docs = _split_documents(output)
    docs_dir.mkdir(parents=True, exist_ok=True)
    for filename, content in docs.items():
        (docs_dir / filename).write_text(content, encoding="utf-8")
        print(f"  Saved → {docs_dir / filename}")

    if len(docs) < 6:
        print(f"  [Warning] Expected 6 documents, parsed {len(docs)}. Saving raw output for review.")
        (docs_dir / "Elaboration_Raw_Output.md").write_text(output, encoding="utf-8")

    return {"status": "done", "documents": list(docs.keys())}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    p.add_argument("--epic", default=None)
    p.add_argument("--ux", default=None)
    args = p.parse_args()
    result = run(args.input, args.output, args.epic, args.ux)
    sys.exit(0 if result["status"] in ("skipped", "done") else 3)
