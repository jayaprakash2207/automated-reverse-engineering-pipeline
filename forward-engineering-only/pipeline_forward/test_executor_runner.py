"""
Forward Engineering — Batch 2, Step 11: Test Executor
NOT an LLM call. Actually installs dependencies (best-effort) and runs the real
test suite for this sprint's project, via subprocess. Produces a factual
pass/fail result — this step never asks Claude anything.

Runs per sub-project rather than assuming one flat project root: the Scaffolder
commonly generates a split backend/ + frontend/ layout (different stack per
tier), so stack-family detection here is done by inspecting what's actually on
disk in each sub-directory (pom.xml, package.json, etc.) rather than parsing
the combined target-stack string, which would only ever match one tier.
"""

import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from fwd_base import save_output

NEW_APP_DIRNAME = "new_app"

# ---------------------------------------------------------------------------
# Portable tool resolution — no admin / no PATH changes required.
# If a tool isn't on PATH, look in these well-known portable install dirs.
# Add JAVA_HOME / MAVEN_HOME env vars to override at runtime.
# ---------------------------------------------------------------------------
_PORTABLE_JAVA  = Path(os.environ.get("JAVA_HOME",  r"C:\tools\jdk21\jdk-21.0.11+10"))
_PORTABLE_MAVEN = Path(os.environ.get("MAVEN_HOME", r"C:\tools\apache-maven-3.9.6"))

_JAVA_EXE  = str(_PORTABLE_JAVA  / "bin" / "java.exe")
_MVN_BAT   = str(_PORTABLE_MAVEN / "bin" / "mvn.cmd")


def _tool(name: str) -> str:
    """Return the best-available path for a CLI tool.

    Preference order:
      1. Already on PATH (shutil.which)
      2. Portable install under C:\\tools  (Java / Maven)
      3. Fall back to bare name so the existing FileNotFoundError → 'blocked'
         path still fires correctly for genuinely missing tools.
    """
    found = shutil.which(name)
    if found:
        return found
    if name in ("java",):
        if Path(_JAVA_EXE).exists():
            return _JAVA_EXE
    if name in ("mvn", "mvn.cmd"):
        if Path(_MVN_BAT).exists():
            return _MVN_BAT
    return name

# Generated Java integration tests (named *IntegrationTest, by this pipeline's
# own convention) use Testcontainers to boot a real Postgres via Docker — not
# available/wanted on every dev machine. Default to skipping them so `mvn test`
# doesn't require Docker; set PIPELINE_SKIP_INTEGRATION_TESTS=0 once Docker is
# installed and you want full integration coverage again.
_SKIP_INTEGRATION_TESTS = os.environ.get("PIPELINE_SKIP_INTEGRATION_TESTS", "1") != "0"


def _resolve(cmd: list) -> list:
    """
    On Windows, tools like npm/mvn/gradle are .cmd/.bat shims — subprocess.run()
    with a bare command list (no shell=True) fails to find them with WinError 2
    even when they're genuinely on PATH, because PATHEXT resolution only
    happens through cmd.exe/shell lookup, not plain CreateProcess. shutil.which()
    does apply PATHEXT and returns the real resolved path (e.g. "npm.CMD"),
    which subprocess.run() can then execute directly. Falls back to the
    original bare command if not found, so the existing FileNotFoundError ->
    "blocked" handling still triggers correctly for tools that are genuinely
    missing.
    """
    resolved = shutil.which(cmd[0])
    return [resolved] + cmd[1:] if resolved else cmd


def _detect_family_from_dir(project_dir: Path) -> str:
    """Detect stack family from files actually present in this directory."""
    if (project_dir / "pom.xml").exists() or (project_dir / "build.gradle").exists() \
            or (project_dir / "build.gradle.kts").exists():
        return "java"
    if (project_dir / "package.json").exists():
        return "node"
    if (project_dir / "pyproject.toml").exists() or (project_dir / "requirements.txt").exists():
        return "python"
    if list(project_dir.glob("*.csproj")) or list(project_dir.glob("*.sln")):
        return "dotnet"
    return "unknown"


def _install_and_test_commands(family: str, project_dir: Path):
    if family == "python":
        return (
            [sys.executable, "-m", "pip", "install", "-e", ".[dev]"],
            [sys.executable, "-m", "pytest", "-v"],
        )
    if family == "node":
        return ([_tool("npm"), "install"], [_tool("npm"), "test"])
    if family == "java":
        if (project_dir / "pom.xml").exists():
            test_cmd = [_tool("mvn"), "test"] + (["-Dtest=!*IntegrationTest"] if _SKIP_INTEGRATION_TESTS else [])
            return (None, test_cmd)
        return (None, [_tool("gradle"), "test"])
    if family == "dotnet":
        return ([_tool("dotnet"), "restore"], [_tool("dotnet"), "test"])
    return (None, None)


def _run_subproject(name: str, project_dir: Path, timeout: int) -> dict:
    """Install + test one sub-project directory. Returns a result dict scoped
    to this sub-project; 'log' is popped off by the caller before aggregation."""
    family = _detect_family_from_dir(project_dir)
    log_lines = [f"Sub-project: {name}", f"Stack family detected: {family}", f"Project dir: {project_dir}", ""]

    if family == "unknown":
        msg = f"Could not determine test tooling for '{name}' from files in {project_dir}."
        print(f"  [{name}] [Blocked] {msg}")
        return {"name": name, "status": "blocked", "reason": "unknown_stack_family", "message": msg,
                "log": "\n".join(log_lines)}

    install_cmd, test_cmd = _install_and_test_commands(family, project_dir)

    # Build a subprocess env that includes JAVA_HOME so Maven can find the JDK
    # even when it wasn't set at the system level (portable install).
    sub_env = os.environ.copy()
    if Path(_JAVA_EXE).exists():
        sub_env["JAVA_HOME"] = str(_PORTABLE_JAVA)
        # Also prepend java/mvn bin dirs to PATH inside the subprocess
        extra = os.pathsep.join([str(_PORTABLE_JAVA / "bin"), str(_PORTABLE_MAVEN / "bin")])
        sub_env["PATH"] = extra + os.pathsep + sub_env.get("PATH", "")

    if install_cmd:
        print(f"  [{name}] Installing dependencies: {' '.join(install_cmd)}")
        try:
            proc = subprocess.run(install_cmd, cwd=str(project_dir), capture_output=True,
                                   text=True, encoding="utf-8", errors="replace", timeout=timeout,
                                   env=sub_env)
            log_lines += ["=== DEPENDENCY INSTALL ===", proc.stdout or "", proc.stderr or ""]
            if proc.returncode != 0:
                print(f"  [{name}] [Failed] Dependency install failed — see saved log.")
                return {"name": name, "status": "failed", "reason": "dependency_install_failed",
                        "returncode": proc.returncode, "log": "\n".join(log_lines)}
        except FileNotFoundError as exc:
            print(f"  [{name}] [Blocked] Required tool not found on this machine: {exc}")
            return {"name": name, "status": "blocked", "reason": "tool_not_found", "message": str(exc),
                     "log": "\n".join(log_lines)}
        except subprocess.TimeoutExpired:
            print(f"  [{name}] [Failed] Dependency install timed out.")
            return {"name": name, "status": "failed", "reason": "install_timeout", "log": "\n".join(log_lines)}

    print(f"  [{name}] Running: {' '.join(test_cmd)}")
    try:
        proc = subprocess.run(test_cmd, cwd=str(project_dir), capture_output=True,
                               text=True, encoding="utf-8", errors="replace", timeout=timeout,
                               env=sub_env)
    except FileNotFoundError as exc:
        print(f"  [{name}] [Blocked] Required tool not found on this machine: {exc}")
        return {"name": name, "status": "blocked", "reason": "tool_not_found", "message": str(exc),
                 "log": "\n".join(log_lines)}
    except subprocess.TimeoutExpired:
        print(f"  [{name}] [Failed] Test run timed out.")
        return {"name": name, "status": "failed", "reason": "test_timeout", "log": "\n".join(log_lines)}

    stdout = proc.stdout or ""
    stderr = proc.stderr or ""
    log_lines += ["=== TEST RUN ===", stdout, stderr]
    passed = proc.returncode == 0
    print(f"  [{name}] Real result: {'PASS' if passed else 'FAIL'} (exit code {proc.returncode})")
    return {
        "name": name, "status": "done", "passed": passed, "returncode": proc.returncode,
        "stdout_tail": stdout[-3000:], "stderr_tail": stderr[-3000:],
        "log": "\n".join(log_lines),
    }


def run(sprint: dict, output_dir: str, timeout: int = 900) -> dict:
    sprint_name = sprint["name"]
    print(f"\n[Test Executor] Sprint '{sprint_name}' — building and running the real test suite...")

    project_root = Path(output_dir) / NEW_APP_DIRNAME

    # Prefer a split backend/ + frontend/ layout if present — this pipeline's
    # Scaffolder commonly generates one project per tier, each with its own
    # stack. Fall back to treating project_root itself as a single flat
    # project for stacks that don't split (e.g. a Python-only backend).
    subprojects = [(name, project_root / name) for name in ("backend", "frontend")
                    if (project_root / name).is_dir()]
    if not subprojects:
        subprojects = [("app", project_root)]

    results = []
    log_sections = []
    for name, d in subprojects:
        r = _run_subproject(name, d, timeout)
        log_sections.append(r.pop("log", ""))
        results.append(r)

    log_path = f"sprints/{sprint_name}".replace(" ", "_") + "/test_log.txt"
    save_output(output_dir, log_path, "\n\n".join(log_sections))

    blocked = [r for r in results if r["status"] == "blocked"]
    if blocked:
        msg = "; ".join(f"{r['name']}: {r.get('message', r.get('reason'))}" for r in blocked)
        return {"status": "blocked", "reason": "tool_not_found", "message": msg}

    failed = [r for r in results if r["status"] == "failed"]
    if failed:
        msg = "; ".join(f"{r['name']}: {r.get('reason')}" for r in failed)
        return {"status": "failed", "reason": "subproject_failed", "message": msg}

    all_passed = all(r.get("passed") for r in results)
    stdout_tail = "\n".join(f"[{r['name']}] {r.get('stdout_tail', '')[-1000:]}" for r in results)
    stderr_tail = "\n".join(f"[{r['name']}] {r.get('stderr_tail', '')[-1000:]}" for r in results)
    print(f"  Overall: {'PASS' if all_passed else 'FAIL'} across {len(results)} sub-project(s)")
    return {
        "status": "done", "passed": all_passed,
        "returncode": 0 if all_passed else 1,
        "stdout_tail": stdout_tail[-3000:], "stderr_tail": stderr_tail[-3000:],
    }
