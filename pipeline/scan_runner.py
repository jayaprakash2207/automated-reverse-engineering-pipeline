"""
Scan Once Runner — Step 2
Reads every file in the repo once, stores full content (no truncation) into file_cache.json.
Disk is never read again after this step — all agents load from the cache.
"""

import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SKIP_DIRS = {
    "bin", "obj", "node_modules", ".git", ".svn", "wwwroot",
    "packages", "TestResults", ".vs", ".idea", "__pycache__",
    "dist", "build", "vendor",
}

INCLUDE_EXTENSIONS = {
    ".cs", ".vb", ".java", ".py", ".js", ".ts", ".jsx", ".tsx",
    ".json", ".yml", ".yaml", ".xml", ".csproj", ".vbproj",
    ".sln", ".props", ".targets", ".bicep", ".tf",
    ".dockerfile", ".sh", ".bat", ".ps1", ".sql",
    ".md", ".txt", ".env", ".config",
}


def run(repo_root: str, output_dir: str) -> dict:
    root = Path(repo_root)
    cache = {}
    skipped = 0

    print(f"\n[Scan Once] Walking {root} ...")

    for p in sorted(root.rglob("*")):
        if not p.is_file():
            continue
        # skip excluded dirs
        if any(part in SKIP_DIRS for part in p.parts):
            continue
        if p.suffix.lower() not in INCLUDE_EXTENSIONS:
            skipped += 1
            continue
        try:
            content = p.read_text(encoding="utf-8", errors="replace")
            rel = str(p.relative_to(root)).replace("\\", "/")
            cache[rel] = content
        except Exception:
            continue

    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)
    cache_file = out_path / "file_cache.json"
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)

    print(f"  [Scan Once] {len(cache)} files cached → {cache_file}")
    print(f"  [Scan Once] {skipped} files skipped (excluded extensions)")
    return {"file_count": len(cache), "cache_path": str(cache_file)}


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--repo-root", required=True)
    p.add_argument("--output",    required=True)
    args = p.parse_args()
    run(args.repo_root, args.output)
