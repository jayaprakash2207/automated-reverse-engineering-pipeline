"""
Forward Engineering — Batch 2, Step 7: Security & Access Control Review
Kept as its OWN agent, deliberately not folded into Backend Dev — access-control
requirements are the thing most commonly and silently dropped when bundled with
general feature work. Reads the files Backend Dev just wrote and applies
authentication/authorization on top of them.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, load_target_stack, load_prior_output, load_learnings_text,
                       load_reverse_engineering_docs, has_reverse_engineering_docs,
                       write_file_bundle, read_files_bundle,
                       load_sprint_manifest, save_sprint_manifest)

NEW_APP_DIRNAME = "new_app"

PROMPT = """\
You are the Security & Access Control Reviewer agent for ONE sprint (bounded context).
Your ONLY job is to apply authentication, authorization, and data-protection controls
to the code below — do not change business logic, do not add features.

Sprint: {sprint_name}
Target stack: {target_stack}

Stack Mapping Contract (follow its authentication/access-control convention exactly):
{contract}

{learnings}

{feedback_block}

Security requirements for this sprint:
--- SECURITY ARCHITECTURE ---
{security_doc}

Current files as written by the Backend Developer agent for this sprint — modify
ONLY where a security or access-control gap exists; re-emit the file in full even
if you only add a few lines:

{current_files}

Output EVERY file you modify (only the ones you change) using this exact marker
format, nothing else outside the markers:

=== FILE: <relative/path/from/project/root> ===
<full file content>

If no security changes are needed, output nothing (no file blocks at all).
"""


def run(sprint: dict, input_dir: str, output_dir: str, feedback: str = None) -> dict:
    sprint_name = sprint["name"]
    print(f"\n[Security Review] Sprint '{sprint_name}' — applying access control...")

    manifest = load_sprint_manifest(output_dir, sprint_name)
    backend_files = manifest.get("backend_files", [])
    if not backend_files:
        print("  [Skip] No backend files recorded for this sprint yet.")
        return {"status": "skipped", "reason": "no_backend_files"}

    target_stack = load_target_stack(output_dir)
    contract = load_prior_output(output_dir, "STACK_MAPPING_CONTRACT.md") or "(not available)"
    learnings_text = load_learnings_text(output_dir)
    learnings_block = f"\n{learnings_text}\n" if learnings_text else ""

    if has_reverse_engineering_docs(input_dir):
        docs = load_reverse_engineering_docs(input_dir).get("forward_docs", {})
        security_doc = docs.get("13_SECURITY_ARCHITECTURE.md", "(not available)")
    else:
        lw = Path(output_dir) / "Lightweight_Docs"
        security_doc = (lw / "05_SECURITY_ACCESS_NOTES.md").read_text(encoding="utf-8") \
            if (lw / "05_SECURITY_ACCESS_NOTES.md").exists() else "(not available)"

    feedback_block = ""
    if feedback:
        feedback_block = (
            "IMPORTANT — this is a CORRECTION pass. A review found a specific security "
            f"problem with your previous output:\n{feedback}\nFix ONLY this specific issue."
        )

    new_app_dir = Path(output_dir) / NEW_APP_DIRNAME
    current_files = read_files_bundle(str(new_app_dir), backend_files)

    prompt = PROMPT.format(
        sprint_name=sprint_name, target_stack=target_stack, contract=contract,
        learnings=learnings_block, feedback_block=feedback_block,
        security_doc=security_doc, current_files=current_files,
    )

    output = call_claude(prompt, label=f"Security Review — {sprint_name}", timeout=1200, allow_tools=False)
    written = write_file_bundle(output, str(new_app_dir))

    manifest["security_files"] = sorted(set(manifest.get("security_files", [])) | set(written))
    save_sprint_manifest(output_dir, sprint_name, manifest)

    print(f"  {len(written)} files updated with security controls." if written
          else "  No security changes required.")
    return {"status": "done", "files_written": written}
