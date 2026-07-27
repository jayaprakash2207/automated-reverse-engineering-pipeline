"""
Forward Engineering — Batch 2, Step 6: Backend Developer agent
Implements domain entities, business rules, and API endpoints for ONE sprint
(bounded context). Domain/Rules/API are merged into a single agent — they are
one continuous line of work; Security stays separate (see security_review_runner.py)
specifically because access-control requirements are easy to silently drop when
bundled with feature work.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, load_target_stack, load_prior_output, load_learnings_text,
                       load_reverse_engineering_docs, has_reverse_engineering_docs,
                       write_file_bundle, load_sprint_manifest, save_sprint_manifest)

NEW_APP_DIRNAME = "new_app"

PROMPT = """\
You are the Backend Developer agent, working on ONE sprint (bounded context) of a
larger system. Implement ONLY what this sprint covers — domain entities, business
rules, and API endpoints — do not touch unrelated areas of the codebase.

Sprint: {sprint_name}
Why this sprint, and its place in the build order: {rationale}

Target stack: {target_stack}

Stack Mapping Contract — follow this exactly for conventions (persistence, routing,
DI, validation, naming, folder layout, error handling):
{contract}

{learnings}

{feedback_block}

Relevant requirements and design documents for this sprint (may include material
outside this sprint's scope — implement only what belongs to "{sprint_name}"):

--- DOMAIN MODEL ---
{domain_model}

--- DATA MODEL / SCHEMA ---
{data_model}

--- BUSINESS REQUIREMENTS ---
{brd}

--- API CONTRACT SPECIFICATION ---
{api_contract}

Output EVERY file as plain text using this exact marker format, nothing else outside
the markers. Paths are relative to the project root the Scaffolder already created —
place new files alongside the existing structure, don't recreate config files that
already exist unless you are intentionally changing them. Do NOT prefix paths with
"new_app/" or "forward_results/" — those directories are the root itself, already
implied; repeating them creates a wrong, duplicated nested path. If a backend/
subfolder already exists (check the existing structure), your paths should start
with "backend/", e.g. "backend/src/main/java/.../Foo.java" — not just "src/...".

=== FILE: <relative/path/from/project/root> ===
<full file content>
"""


def run(sprint: dict, input_dir: str, output_dir: str, feedback: str = None) -> dict:
    sprint_name = sprint["name"]
    print(f"\n[Backend Dev] Sprint '{sprint_name}' — implementing domain, rules, and API...")

    target_stack = load_target_stack(output_dir)
    contract = load_prior_output(output_dir, "STACK_MAPPING_CONTRACT.md") or "(not available)"
    learnings_text = load_learnings_text(output_dir)
    learnings_block = f"\n{learnings_text}\n" if learnings_text else ""

    if has_reverse_engineering_docs(input_dir):
        docs = load_reverse_engineering_docs(input_dir).get("forward_docs", {})
        domain_model = docs.get("05_DOMAIN_MODEL.md", "(not available)")
        data_model = docs.get("07_DATA_MODEL_SPECIFICATION.md", "(not available)")
        brd = docs.get("01_BRD.md", "(not available)")
        api_contract = docs.get("11_API_CONTRACT_SPECIFICATION.md", "(not available)")
    else:
        lw = Path(output_dir) / "Lightweight_Docs"
        domain_model = (lw / "02_DOMAIN_DATA_MODEL_SKETCH.md").read_text(encoding="utf-8") \
            if (lw / "02_DOMAIN_DATA_MODEL_SKETCH.md").exists() else "(not available)"
        data_model = domain_model  # lightweight scenario folds these together
        brd = (lw / "01_FEATURE_REQUIREMENTS_BRIEF.md").read_text(encoding="utf-8") \
            if (lw / "01_FEATURE_REQUIREMENTS_BRIEF.md").exists() else "(not available)"
        api_contract = (lw / "03_API_SERVICE_SKETCH.md").read_text(encoding="utf-8") \
            if (lw / "03_API_SERVICE_SKETCH.md").exists() else "(not available)"

    feedback_block = ""
    if feedback:
        feedback_block = (
            "IMPORTANT — this is a CORRECTION pass, not the first attempt. A review found "
            f"a specific problem with your previous output:\n{feedback}\n"
            "Fix ONLY this specific issue — do not rewrite unrelated code."
        )

    prompt = PROMPT.format(
        sprint_name=sprint_name, rationale=sprint.get("rationale", ""),
        target_stack=target_stack, contract=contract, learnings=learnings_block,
        feedback_block=feedback_block, domain_model=domain_model, data_model=data_model,
        brd=brd, api_contract=api_contract,
    )

    output = call_claude(prompt, label=f"Backend Dev — {sprint_name}", timeout=1800, allow_tools=False)
    new_app_dir = Path(output_dir) / NEW_APP_DIRNAME
    written = write_file_bundle(output, str(new_app_dir))

    if not written:
        print("  [Warning] No files parsed from Backend Dev output.")
        return {"status": "failed", "reason": "no_files_parsed"}

    manifest = load_sprint_manifest(output_dir, sprint_name)
    manifest["backend_files"] = sorted(set(manifest.get("backend_files", [])) | set(written))
    save_sprint_manifest(output_dir, sprint_name, manifest)

    print(f"  {len(written)} backend files written/updated.")
    return {"status": "done", "files_written": written}
