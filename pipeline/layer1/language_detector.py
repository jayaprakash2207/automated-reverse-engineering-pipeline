import os
from collections import Counter
from pathlib import Path
from typing import Dict, List

from .extractors.oracle_forms_extractor import looks_like_oracle_forms_xml


class LanguageDetector:

    # Maps file extension → logical language name used by extractor map
    EXTENSION_MAP: Dict[str, str] = {
        ".cs": "dotnet",
        ".vb": "dotnet",
        ".csproj": "dotnet",
        ".vbproj": "dotnet",
        ".sln": "dotnet",
        ".java": "java",
        ".py": "python",
        ".js": "javascript",
        ".ts": "javascript",
        ".jsx": "javascript",
        ".tsx": "javascript",
        ".cbl": "cobol",
        ".cob": "cobol",
        ".cpy": "cobol",
        ".php": "php",
        ".rb": "ruby",
        ".go": "go",
        ".kt": "kotlin",
        ".swift": "swift",
        ".rs": "rust",
        # Oracle PL/SQL — exported package/procedure/function/trigger DDL
        # (e.g. via DBMS_METADATA.GET_DDL or a schema export), NOT the Forms
        # binaries themselves.
        ".sql": "plsql",
        ".pks": "plsql",
        ".pkb": "plsql",
        ".pkg": "plsql",
        ".trg": "plsql",
        ".prc": "plsql",
        ".fnc": "plsql",
        # Oracle Forms/Menu/Library — text or XML exported via Forms
        # Builder's "Save As Text" or JDAPI/frmf2xml (see
        # oracle_forms_extractor.py header for the naming convention and
        # why raw .fmb/.mmb/.pll binaries can't be read directly).
        ".fmt": "oracle_forms",
        ".mmt": "oracle_forms",
        ".pld": "oracle_forms",
        ".frmxml": "oracle_forms",
        ".mmxml": "oracle_forms",
        ".pllxml": "oracle_forms",
    }

    # A language must account for at least this % of code files to be included
    THRESHOLD_PERCENT = 5

    # Directories to skip during detection scan
    _SKIP_DIRS = {
        "node_modules", "vendor", "__pycache__", "dist", "build",
        "bin", "obj", ".git", ".svn", ".idea", ".vs",
    }

    def detect(self, local_path: str) -> dict:
        """
        Walk the directory, count files per language, return:
            primary_language   – the dominant language
            languages          – {lang: percentage} for all detected
            extractors_to_use  – languages above THRESHOLD_PERCENT
            total_code_files   – raw count of recognised source files
        """
        lang_counts: Counter = Counter()
        total = 0

        for root, dirs, files in os.walk(local_path):
            dirs[:] = [d for d in dirs if d not in self._SKIP_DIRS and not d.startswith(".")]
            for fname in files:
                ext = Path(fname).suffix.lower()
                lang = self.EXTENSION_MAP.get(ext)

                # Real Forms/Menu/Library XML exports very often keep the
                # plain ".xml" extension rather than following the
                # .frmxml/.mmxml/.pllxml convention — sniff the root element
                # instead of requiring a rename. Cheap (peeks ~2KB) and only
                # matches Forms-shaped roots, so ordinary config XML is
                # unaffected.
                if not lang and ext == ".xml":
                    full_path = os.path.join(root, fname)
                    if looks_like_oracle_forms_xml(full_path):
                        lang = "oracle_forms"

                if lang:
                    lang_counts[lang] += 1
                    total += 1

        if total == 0:
            return {
                "primary_language": "unknown",
                "languages": {},
                "extractors_to_use": [],
                "total_code_files": 0,
            }

        percentages = {
            lang: round(count / total * 100, 1)
            for lang, count in lang_counts.items()
        }

        primary = lang_counts.most_common(1)[0][0]

        extractors = [
            lang for lang, pct in percentages.items()
            if pct >= self.THRESHOLD_PERCENT
        ]
        if not extractors:
            extractors = [primary]

        return {
            "primary_language": primary,
            "languages": percentages,
            "extractors_to_use": extractors,
            "total_code_files": total,
        }
