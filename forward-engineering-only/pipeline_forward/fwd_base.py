"""
Forward Engineering — shared helpers.
Reuses call_claude / save_output / save_json / output_already_exists from the
existing reverse-engineering pipeline's base_runner.py — no duplication.
"""

import json
import re
import sys
from pathlib import Path

# Make the existing reverse-engineering pipeline's base_runner importable.
sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from base_runner import (  # noqa: E402
    call_claude,
    save_output,
    save_json,
    load_prior_output,
    output_already_exists,
)

import os
import tempfile

__all__ = [
    "call_claude", "save_output", "save_json", "load_prior_output", "output_already_exists",
    "load_reverse_engineering_docs", "has_reverse_engineering_docs",
    "write_file_bundle", "read_files_bundle", "load_target_stack", "save_target_stack",
    "atomic_write_json", "load_ledger", "update_ledger_entry",
    "append_learning", "load_learnings_text",
    "sprint_slug", "load_sprint_manifest", "save_sprint_manifest",
    "cleanup_sprint_output",
]


# ── Load the reverse-engineering pipeline's output (if present) ───────────────

def has_reverse_engineering_docs(input_dir: str) -> bool:
    """True if the reverse-engineering pipeline already produced usable docs."""
    base = Path(input_dir)
    fwd_docs = base / "ForwardEngineering_Docs"
    return fwd_docs.exists() and any(fwd_docs.glob("*.md"))


def load_reverse_engineering_docs(input_dir: str) -> dict:
    """
    Load whatever the reverse-engineering pipeline produced.
    Tolerant of gaps — e.g. Foundation_KnowledgeGraph may be incomplete;
    callers must handle missing keys rather than assume every doc exists.
    """
    base = Path(input_dir)
    fwd_dir = base / "ForwardEngineering_Docs"
    kg_dir = base / "Foundation_KnowledgeGraph"

    def read_text(path: Path) -> str:
        return path.read_text(encoding="utf-8") if path.exists() else ""

    docs = {}
    if fwd_dir.exists():
        for p in sorted(fwd_dir.glob("*.md")):
            docs[p.name] = read_text(p)
        for p in sorted(fwd_dir.glob("*.json")):
            docs[p.name] = read_text(p)

    kg = {}
    if kg_dir.exists():
        for p in sorted(kg_dir.glob("*")):
            kg[p.name] = read_text(p)

    return {"forward_docs": docs, "knowledge_graph": kg}


# ── Target stack state (produced by Stack Selection, read by everything after) ─

def load_target_stack(output_dir: str):
    """Return the confirmed target stack string, or None if not yet decided."""
    path = Path(output_dir) / "target_stack.json"
    if not path.exists():
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    return data.get("target_stack")


def save_target_stack(output_dir: str, target_stack: str) -> None:
    save_json(output_dir, "target_stack.json", {"target_stack": target_stack})


# ── File-bundle writer (Scaffolder writes many real files from one response) ──

_FILE_BLOCK_RE = re.compile(
    r"===\s*FILE:\s*(.+?)\s*===\s*\n(.*?)(?=\n===\s*FILE:|\Z)",
    re.DOTALL,
)


def _winlong(path: Path) -> str:
    """
    On Windows, prefix an absolute path with \\\\?\\ to opt out of the 260-char
    MAX_PATH limit for this call — harmless no-op on other platforms. Needed
    because generated Java/Maven package trees (src/main/java/com/.../SomeClass.java)
    and per-sprint state paths (forward_results/sprints/<slug>/manifest.json, plus
    tempfile.mkstemp()'s own generated name on top of that) routinely push an
    absolute path past 260 chars once the project sits inside any reasonably long
    parent folder — which raises WinError 206/ENOENT from plain mkdir()/
    write_text()/tempfile.mkstemp() with no such workaround applied. Resolves the
    path itself, so it's safe to call on a path the caller hasn't resolved yet.
    """
    if sys.platform != "win32":
        return str(path)
    s = str(Path(path).resolve())
    if s.startswith("\\\\?\\"):
        return s
    if s.startswith("\\\\"):  # UNC path
        return "\\\\?\\UNC\\" + s.lstrip("\\")
    return "\\\\?\\" + s


def write_file_bundle(raw_text: str, target_root: str) -> list:
    """
    Parse '=== FILE: path ===\\n<content>' blocks out of raw_text and write
    each as a real file under target_root. Returns the list of paths written.
    Skips any path that tries to escape target_root (defense in depth).
    """
    root = Path(target_root).resolve()
    Path(_winlong(root)).mkdir(parents=True, exist_ok=True)
    written = []

    for m in _FILE_BLOCK_RE.finditer(raw_text):
        rel_path = m.group(1).strip().strip("`").replace("\\", "/")
        content = m.group(2).strip("\n")

        candidate = (root / rel_path).resolve()
        if root not in candidate.parents and candidate != root:
            print(f"  [write_file_bundle] Skipped suspicious path outside target: {rel_path}")
            continue

        try:
            Path(_winlong(candidate.parent)).mkdir(parents=True, exist_ok=True)
            Path(_winlong(candidate)).write_text(content + "\n", encoding="utf-8")
        except OSError as exc:
            print(f"  [write_file_bundle] Failed to write {rel_path!r} ({len(str(candidate))} char "
                  f"full path): {exc}")
            continue
        written.append(str(candidate.relative_to(root)))

    return written


def read_files_bundle(target_root: str, relative_paths: list) -> str:
    """
    Inverse of write_file_bundle: read the CURRENT content of real files on disk
    and format them the same '=== FILE: path ===' way, so a later agent can be
    shown "here is what exists right now" and asked to modify it.
    Missing files are noted, not fatal.
    """
    root = Path(target_root).resolve()
    parts = []
    for rel_path in relative_paths:
        p = (root / rel_path).resolve()
        if root not in p.parents and p != root:
            continue
        if p.exists():
            parts.append(f"=== FILE: {rel_path} ===\n{p.read_text(encoding='utf-8')}")
        else:
            parts.append(f"=== FILE: {rel_path} ===\n[File does not exist yet]")
    return "\n\n".join(parts)


# ── Atomic JSON state (ledger) ─────────────────────────────────────────────────
# Same discipline as the note in orchestrator.json elsewhere in this project:
# JSON writes MUST overwrite the whole file via a temp-file + rename, never be
# partially written — a crash mid-write must never leave a corrupt/half file
# that a resume step could mistake for valid state.

def atomic_write_json(path: str, data) -> None:
    path = Path(path)
    Path(_winlong(path.parent)).mkdir(parents=True, exist_ok=True)
    # dir= must also be long-path-safe: tempfile.mkstemp() appends its own
    # random name + suffix on top of it, which is exactly what pushed this
    # over 260 chars in the first place.
    fd, tmp_path = tempfile.mkstemp(dir=_winlong(path.parent), prefix=".tmp_", suffix=".json")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        os.replace(tmp_path, _winlong(path))  # atomic on POSIX and Windows
    except Exception:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise


LEDGER_FILE = "sprint_ledger.json"


def load_ledger(output_dir: str) -> dict:
    """{ sprint_name: {status, attempts, last_updated, notes} }"""
    path = Path(output_dir) / LEDGER_FILE
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def update_ledger_entry(output_dir: str, sprint_name: str, **fields) -> dict:
    """Read-modify-write the WHOLE ledger atomically. Never append-only."""
    import datetime
    ledger = load_ledger(output_dir)
    entry = ledger.get(sprint_name, {"status": "NOT_STARTED", "attempts": 0, "notes": []})
    entry.update(fields)
    entry["last_updated"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    ledger[sprint_name] = entry
    atomic_write_json(str(Path(output_dir) / LEDGER_FILE), ledger)
    return entry


# ── Learnings memory ───────────────────────────────────────────────────────────
# Accumulates root causes across sprints so a later sprint's agents can avoid
# repeating a mistake an earlier sprint already paid to fix.

LEARNINGS_JSON = "LEARNINGS.json"
LEARNINGS_MD = "LEARNINGS.md"


def append_learning(output_dir: str, sprint_name: str, issue: str, root_cause: str,
                     fix_applied: str, outcome: str) -> None:
    import datetime
    path = Path(output_dir) / LEARNINGS_JSON
    learnings = []
    if path.exists():
        with open(path, encoding="utf-8") as f:
            learnings = json.load(f)

    learnings.append({
        "sprint": sprint_name,
        "issue": issue,
        "root_cause": root_cause,
        "fix_applied": fix_applied,
        "outcome": outcome,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    })
    atomic_write_json(str(path), learnings)

    # Human-readable mirror — full rewrite each time, not appended, so it can
    # never be left half-written either.
    md_lines = ["# Learnings Log", ""]
    for entry in learnings:
        md_lines += [
            f"## {entry['sprint']} — {entry['outcome']}",
            f"- **Issue:** {entry['issue']}",
            f"- **Root cause:** {entry['root_cause']}",
            f"- **Fix applied:** {entry['fix_applied']}",
            "",
        ]
    (Path(output_dir) / LEARNINGS_MD).write_text("\n".join(md_lines), encoding="utf-8")


def load_learnings_text(output_dir: str) -> str:
    """Formatted for inclusion in a later agent's prompt. Empty string if none yet."""
    path = Path(output_dir) / LEARNINGS_JSON
    if not path.exists():
        return ""
    with open(path, encoding="utf-8") as f:
        learnings = json.load(f)
    if not learnings:
        return ""
    lines = ["Known issues from earlier sprints — do not repeat these mistakes:"]
    for entry in learnings:
        lines.append(f"- [{entry['sprint']}] {entry['root_cause']} → fix: {entry['fix_applied']}")
    return "\n".join(lines)


# ── Post-sprint cleanup — removes AI generation artifacts before tests run ──────
# Fixes known issues that occur every sprint regardless of sprint content.
# Safe to run after every frontend generation — only removes artifacts, never
# touches Java backend, Spring Boot services, Flyway SQL, or React business logic.

def cleanup_sprint_output(new_app_dir: str) -> None:
    """
    Run after frontend_dev_runner completes, before test_executor_runner.
    Silently removes all known AI generation artifacts so tests run clean.
    """
    frontend = Path(new_app_dir) / "frontend"
    if not frontend.exists():
        return

    _fix_jest_config_duplicates(frontend)
    _fix_import_meta(frontend)
    _fix_app_tsx_export(frontend)
    _strip_code_fence_artifacts(frontend)
    _strip_end_file_markers(frontend)
    _delete_orphan_audit_folders(frontend)
    _fix_stale_node_modules(frontend)
    print("  [Cleanup] Done — AI generation artifacts removed.")


def _fix_jest_config_duplicates(frontend: Path) -> None:
    """Fix 2 — keep only jest.config.cjs, delete .js and .ts variants."""
    for name in ("jest.config.js", "jest.config.ts"):
        p = frontend / name
        if p.exists():
            p.unlink()
            print(f"  [Cleanup] Deleted duplicate jest config: {name}")


def _fix_import_meta(frontend: Path) -> None:
    """Fix 3 — replace import.meta.env.* with process.env fallback pattern."""
    src = frontend / "src"
    if not src.exists():
        return
    import_meta_re = re.compile(r'import\.meta\.env\.(\w+)')
    for p in list(src.rglob("*.ts")) + list(src.rglob("*.tsx")):
        try:
            text = p.read_text(encoding="utf-8")
            if "import.meta" not in text:
                continue
            # Replace import.meta.env.SOME_VAR with process.env['SOME_VAR'] ?? ''
            new_text = import_meta_re.sub(
                lambda m: f"(typeof process !== 'undefined' ? process.env['{m.group(1)}'] : undefined) ?? ''",
                text,
            )
            if new_text != text:
                p.write_text(new_text, encoding="utf-8")
                print(f"  [Cleanup] Fixed import.meta in: {p.name}")
        except Exception:
            pass

    # Ensure jest.importMetaSetup.cjs exists
    setup_file = frontend / "jest.importMetaSetup.cjs"
    if not setup_file.exists():
        setup_file.write_text(
            "if (typeof globalThis.importMeta === 'undefined') {\n"
            "  Object.defineProperty(globalThis, 'importMeta', { value: { env: {} } });\n"
            "}\n",
            encoding="utf-8",
        )
        print("  [Cleanup] Created jest.importMetaSetup.cjs")

    # Ensure jest.config.cjs references the setup file and has diagnostics: false
    jest_cjs = frontend / "jest.config.cjs"
    if jest_cjs.exists():
        text = jest_cjs.read_text(encoding="utf-8")
        changed = False
        if "jest.importMetaSetup.cjs" not in text:
            text = text.rstrip().rstrip("}")
            text += "\n  setupFiles: ['<rootDir>/jest.importMetaSetup.cjs'],\n};\n"
            changed = True
        if "diagnostics: false" not in text and "diagnostics:false" not in text:
            text = text.replace("'ts-jest': {", "'ts-jest': { diagnostics: false,", 1)
            changed = True
        if changed:
            jest_cjs.write_text(text, encoding="utf-8")
            print("  [Cleanup] Patched jest.config.cjs (importMeta setup + diagnostics:false)")


def _fix_app_tsx_export(frontend: Path) -> None:
    """Fix 4 — ensure App.tsx uses default export."""
    app = frontend / "src" / "App.tsx"
    if not app.exists():
        return
    text = app.read_text(encoding="utf-8")
    if "export function App(" in text or "export const App " in text:
        new_text = text.replace("export function App(", "export default function App(")
        new_text = re.sub(r"export const App\s*=", "const App =", new_text)
        if "export default" not in new_text:
            new_text = new_text.rstrip() + "\nexport default App;\n"
        if new_text != text:
            app.write_text(new_text, encoding="utf-8")
            print("  [Cleanup] Fixed App.tsx — changed to default export")


def _strip_code_fence_artifacts(frontend: Path) -> None:
    """Fix 5 — strip ``` code fence markers from first/last line of .ts/.tsx files."""
    src = frontend / "src"
    if not src.exists():
        return
    for p in list(src.rglob("*.ts")) + list(src.rglob("*.tsx")):
        try:
            lines = p.read_text(encoding="utf-8").splitlines(keepends=True)
            changed = False
            if lines and lines[0].strip().startswith("```"):
                lines = lines[1:]
                changed = True
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
                changed = True
            if changed:
                p.write_text("".join(lines), encoding="utf-8")
                print(f"  [Cleanup] Stripped code fence artifacts from: {p.name}")
        except Exception:
            pass


def _strip_end_file_markers(frontend: Path) -> None:
    """Fix 6 — remove '=== END FILE ===' artifact from generated files."""
    src = frontend / "src"
    if not src.exists():
        return
    marker = "=== END FILE ==="
    for p in list(src.rglob("*.ts")) + list(src.rglob("*.tsx")) + list(src.rglob("*.java")):
        try:
            text = p.read_text(encoding="utf-8")
            if marker in text:
                p.write_text(text.replace(marker, ""), encoding="utf-8")
                print(f"  [Cleanup] Stripped END FILE marker from: {p.name}")
        except Exception:
            pass


def _delete_orphan_audit_folders(frontend: Path) -> None:
    """Fix 7 — delete orphan audit test folders that reference non-existent source paths."""
    import shutil as _shutil
    src = frontend / "src"
    orphan_dirs = [
        src / "api",
        src / "components" / "audit",
        src / "features" / "auditLog",
        src / "features" / "audit",
    ]
    for d in orphan_dirs:
        if d.exists():
            _shutil.rmtree(str(d))
            print(f"  [Cleanup] Deleted orphan folder: {d.relative_to(frontend)}")


def _fix_stale_node_modules(frontend: Path) -> None:
    """Fix 9 — detect and remove stale node_modules with missing/incompatible binaries."""
    import shutil as _shutil
    nm = frontend / "node_modules"
    if not nm.exists():
        return
    # Check for esbuild binary — if missing it means node_modules is from a different machine
    esbuild_bin = nm / ".bin" / "esbuild"
    esbuild_exe = nm / ".bin" / "esbuild.exe"
    esbuild_exists = esbuild_bin.exists() or esbuild_exe.exists()
    if not esbuild_exists:
        print("  [Cleanup] Stale node_modules detected (esbuild missing) — deleting for fresh npm install")
        _shutil.rmtree(str(nm))


# ── Per-sprint file manifest ────────────────────────────────────────────────────
# Tracks which files (relative to new_app/) belong to each sprint, so later
# steps (Test-Writer, Reviewers, Fix loop) know exactly what's in scope.

def sprint_slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def load_sprint_manifest(output_dir: str, sprint_name: str) -> dict:
    path = Path(output_dir) / "sprints" / sprint_slug(sprint_name) / "manifest.json"
    if not path.exists():
        return {"backend_files": [], "security_files": [], "frontend_files": [],
                "migration_files": [], "test_files": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def save_sprint_manifest(output_dir: str, sprint_name: str, manifest: dict) -> None:
    path = Path(output_dir) / "sprints" / sprint_slug(sprint_name) / "manifest.json"
    atomic_write_json(str(path), manifest)
