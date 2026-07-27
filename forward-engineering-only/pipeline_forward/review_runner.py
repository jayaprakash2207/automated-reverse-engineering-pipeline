"""
Forward Engineering — Batch 2, Step 12: Independent Review
Three reviewers run BLIND and IN PARALLEL — none sees the others' verdict —
so agreement is real signal, not one opinion echoed three times:
  1. Correctness  — does the code match the original requirements/business rules?
  2. Code Quality — structure, maintainability, Stack Mapping compliance?
  3. Security/Performance — access control and NFR targets held up?

Findings are reconciled deterministically in Python (not by another LLM call)
into ONE consolidated set of corrections, so the Fix loop gets one clear
instruction rather than three possibly-conflicting reports.
"""

import concurrent.futures
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, load_reverse_engineering_docs, has_reverse_engineering_docs,
                       read_files_bundle, load_sprint_manifest)

NEW_APP_DIRNAME = "new_app"

_VERDICT_JSON_INSTRUCTION = """\
Reply with ONLY a JSON object, no markdown, no explanation, in this exact shape:
{{"verdict": "PASS" or "CORRECTIONS_REQUIRED", "findings": ["<specific, actionable finding>", ...]}}
An empty findings list is required if verdict is "PASS".
"""

CORRECTNESS_PROMPT = """\
You are an independent reviewer checking CORRECTNESS ONLY — does this sprint's code
actually implement the original requirements and business rules? You do not see any
other reviewer's opinion; give your own independent verdict.

Sprint: {sprint_name}

Original requirements:
{requirements}

Real test results from actually running the test suite:
{test_results}

Code under review:
{code}

{instruction}
"""

QUALITY_PROMPT = """\
You are an independent reviewer checking CODE QUALITY AND MAINTAINABILITY ONLY —
structure, readability, and compliance with the stack's conventions. You do not see
any other reviewer's opinion; give your own independent verdict.

Sprint: {sprint_name}

Stack Mapping Contract (the conventions this code must follow):
{contract}

Code under review:
{code}

{instruction}
"""

SECURITY_PERF_PROMPT = """\
You are an independent reviewer checking SECURITY AND PERFORMANCE ONLY — is access
control correctly enforced, and are there obvious performance red flags against the
stated NFRs? You do not see any other reviewer's opinion; give your own independent
verdict.

Sprint: {sprint_name}

Security requirements:
{security_doc}

NFR targets:
{nfr_doc}

Code under review:
{code}

{instruction}
"""


def _parse_verdict(text: str) -> dict:
    try:
        data = json.loads(text.strip())
    except Exception:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        try:
            data = json.loads(m.group()) if m else {}
        except Exception:
            data = {}
    return {
        "verdict": data.get("verdict", "CORRECTIONS_REQUIRED"),
        "findings": data.get("findings", ["Reviewer output could not be parsed — treating as unresolved."]),
    }


def _load_all_sprint_code(output_dir: str, sprint_name: str) -> str:
    manifest = load_sprint_manifest(output_dir, sprint_name)
    all_files = (
        manifest.get("backend_files", []) + manifest.get("security_files", [])
        + manifest.get("frontend_files", []) + manifest.get("test_files", [])
    )
    new_app_dir = Path(output_dir) / NEW_APP_DIRNAME
    return read_files_bundle(str(new_app_dir), all_files) if all_files else "(no files recorded)"


def run(sprint: dict, input_dir: str, output_dir: str, test_result: dict) -> dict:
    sprint_name = sprint["name"]
    print(f"\n[Review] Sprint '{sprint_name}' — dispatching 3 independent reviewers in parallel...")

    code = _load_all_sprint_code(output_dir, sprint_name)
    test_summary = (
        f"Exit code: {test_result.get('returncode')}, passed={test_result.get('passed')}\n"
        f"stdout (tail): {test_result.get('stdout_tail', '')[-1500:]}\n"
        f"stderr (tail): {test_result.get('stderr_tail', '')[-1500:]}"
    )

    docs = {}
    contract_text = "(not available)"
    if has_reverse_engineering_docs(input_dir):
        docs = load_reverse_engineering_docs(input_dir).get("forward_docs", {})
    requirements = docs.get("01_BRD.md", "(not available)")
    security_doc = docs.get("13_SECURITY_ARCHITECTURE.md", "(not available)")
    nfr_doc = docs.get("14_NFR_SPECIFICATION.md", "(not available)")

    from fwd_base import load_prior_output
    contract_text = load_prior_output(output_dir, "STACK_MAPPING_CONTRACT.md") or "(not available)"

    prompts = {
        "correctness": CORRECTNESS_PROMPT.format(
            sprint_name=sprint_name, requirements=requirements, test_results=test_summary,
            code=code, instruction=_VERDICT_JSON_INSTRUCTION,
        ),
        "quality": QUALITY_PROMPT.format(
            sprint_name=sprint_name, contract=contract_text, code=code,
            instruction=_VERDICT_JSON_INSTRUCTION,
        ),
        "security_performance": SECURITY_PERF_PROMPT.format(
            sprint_name=sprint_name, security_doc=security_doc, nfr_doc=nfr_doc, code=code,
            instruction=_VERDICT_JSON_INSTRUCTION,
        ),
    }

    results = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = {
            pool.submit(call_claude, prompt, f"Review[{name}] — {sprint_name}", 1200, False): name
            for name, prompt in prompts.items()
        }
        for future in concurrent.futures.as_completed(futures):
            name = futures[future]
            try:
                results[name] = _parse_verdict(future.result())
            except Exception as exc:
                results[name] = {"verdict": "CORRECTIONS_REQUIRED",
                                  "findings": [f"Reviewer call failed: {exc}"]}

    overall_pass = all(r["verdict"] == "PASS" for r in results.values())
    consolidated = []
    for name, r in results.items():
        if r["verdict"] != "PASS":
            consolidated += [f"[{name}] {f}" for f in r["findings"]]

    print(f"  Verdicts — correctness: {results['correctness']['verdict']}, "
          f"quality: {results['quality']['verdict']}, "
          f"security/performance: {results['security_performance']['verdict']}")

    return {
        "status": "done",
        "overall": "PASS" if overall_pass else "CORRECTIONS_REQUIRED",
        "raw_reviews": results,
        "consolidated_findings": consolidated,
    }
