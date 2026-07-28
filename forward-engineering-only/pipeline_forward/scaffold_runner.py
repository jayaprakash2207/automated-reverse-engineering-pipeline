"""
Forward Engineering — Step 4: Environment Scaffolding
Creates an empty, buildable project skeleton in the target stack, following
the Stack Mapping contract. Writes REAL files to <output>/new_app/.

Requires: STACK_MAPPING_CONTRACT.md (Step 3) and target_stack.json (Step 1).
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import (call_claude, save_output, load_target_stack, write_file_bundle,
                       load_prior_output, output_already_exists)

NEW_APP_DIRNAME = "new_app"
MANIFEST_FILE = "SCAFFOLD_MANIFEST.md"

SCAFFOLD_PROMPT = """\
You are the Environment Scaffolding agent. Create an EMPTY, buildable project skeleton
for the target stack below, following the stack mapping contract exactly — folder
layout, build/dependency file, and minimal starter config. No feature code yet —
this is scaffolding only (no domain logic, no endpoints beyond a health-check).

Target stack: {target_stack}

Stack Mapping Contract (follow its folder structure and conventions exactly):
{contract}

Do NOT use any file-editing, write, or save tools yourself — do not create any files
directly. Output EVERY file as plain text in your response using this exact marker
format, nothing else outside the markers; the calling script parses these markers and
writes the real files to disk on your behalf:

=== FILE: <relative/path/from/project/root> ===
<full file content>

Include at minimum: the dependency/build manifest (e.g. pyproject.toml / package.json
/ pom.xml — whichever fits the target stack), a minimal entrypoint file with a single
health-check route, a .gitignore, and a README.md explaining how to install
dependencies and run it locally.

MANDATORY for React/TypeScript frontend — the frontend/package.json MUST include
these packages (they are always needed across all sprints):
  dependencies: axios
  devDependencies: @testing-library/user-event, @testing-library/react,
                   @testing-library/jest-dom, ts-jest, jest, jest-environment-jsdom

MANDATORY for React/TypeScript frontend — create these two files:
1. frontend/jest.config.cjs with content:
   module.exports = {
     preset: 'ts-jest',
     testEnvironment: 'jsdom',
     setupFilesAfterFramework: ['<rootDir>/src/setupTests.ts'],
     testMatch: ['**/*.test.ts', '**/*.test.tsx'],
     moduleNameMapper: { '\\\\.(css|less|scss)$': '<rootDir>/jest.styleMock.cjs' },
     globals: { 'ts-jest': { tsconfig: { module: 'CommonJS', target: 'ES2020' }, diagnostics: false } },
     setupFiles: ['<rootDir>/jest.importMetaSetup.cjs'],
   };
2. frontend/jest.importMetaSetup.cjs with content:
   if (typeof globalThis.importMeta === 'undefined') {
     Object.defineProperty(globalThis, 'importMeta', { value: { env: {} } });
   }
3. frontend/jest.styleMock.cjs with content:
   module.exports = {};
Do NOT generate jest.config.js or jest.config.ts — only jest.config.cjs.
"""


def run(input_dir: str, output_dir: str) -> dict:
    new_app_dir = Path(output_dir) / NEW_APP_DIRNAME

    if output_already_exists(output_dir, MANIFEST_FILE):
        print(f"\n[Scaffolder] Already done — skipping (found {MANIFEST_FILE})")
        return {"status": "done"}

    target_stack = load_target_stack(output_dir)
    if not target_stack:
        print("\n[Scaffolder] BLOCKED — target stack not yet confirmed. Run Stack Selection first.")
        return {"status": "blocked", "reason": "target_stack_not_confirmed"}

    contract = load_prior_output(output_dir, "STACK_MAPPING_CONTRACT.md")
    if not contract:
        print("\n[Scaffolder] BLOCKED — STACK_MAPPING_CONTRACT.md not found. Run Stack Mapping first.")
        return {"status": "blocked", "reason": "stack_mapping_missing"}

    print(f"\n[Scaffolder] Generating project skeleton for: {target_stack!r}")
    prompt = SCAFFOLD_PROMPT.format(target_stack=target_stack, contract=contract)
    output = call_claude(prompt, label="Scaffolder", timeout=900, allow_tools=False)

    written = write_file_bundle(output, str(new_app_dir))
    if not written:
        print("  [Warning] No '=== FILE: ... ===' blocks parsed. Saving raw output for review.")
        save_output(output_dir, "Scaffold_Raw_Output.md", output)
        return {"status": "failed", "reason": "no_files_parsed"}

    manifest_lines = ["# Scaffold Manifest", "", f"Target stack: {target_stack}", "", "## Files created", ""]
    manifest_lines += [f"- `{f}`" for f in written]
    save_output(output_dir, MANIFEST_FILE, "\n".join(manifest_lines))

    print(f"  {len(written)} files written under {new_app_dir}")
    return {"status": "done", "files": written}


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--output", required=True)
    args = p.parse_args()
    result = run(args.input, args.output)
    sys.exit(0 if result["status"] == "done" else 3)
