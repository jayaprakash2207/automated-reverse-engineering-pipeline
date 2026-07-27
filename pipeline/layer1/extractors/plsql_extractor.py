import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

from .base_extractor import BaseExtractor

# ─────────────────────────────────────────────────────────────────────────────
# NOTE ON APPROACH
# ─────────────────────────────────────────────────────────────────────────────
# This mirrors the style already used by DotNetExtractor/JavaExtractor in this
# package: pragmatic regex + a hand-rolled block-balance scanner, not a real
# PL/SQL parser (an ANTLR grammar would be more accurate but is a much bigger
# dependency — see project notes). It does not exclude string literals or
# comments when counting BEGIN/CASE/IF/LOOP/END keywords, so a keyword sitting
# inside a quoted string or a comment can (rarely) throw off block boundaries.
# Good enough to recover full trigger/procedure bodies for downstream LLM
# analysis; not good enough to be a compiler.
# ─────────────────────────────────────────────────────────────────────────────

# Recognised Oracle PL/SQL source extensions.
PLSQL_EXTENSIONS = {".sql", ".pks", ".pkb", ".pkg", ".trg", ".prc", ".fnc", ".vw"}

_PACKAGE_SPEC_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?PACKAGE\s+(?!BODY\b)"
    r"(?:(\w+)\.)?(\w+)\s+(?:IS|AS)\b",
    re.IGNORECASE,
)

_PACKAGE_BODY_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?PACKAGE\s+BODY\s+"
    r"(?:(\w+)\.)?(\w+)\s+(?:IS|AS)\b",
    re.IGNORECASE,
)

_PROCEDURE_RE = re.compile(
    r"(?:CREATE\s+(?:OR\s+REPLACE\s+)?)?PROCEDURE\s+"
    r"(?:(\w+)\.)?(\w+)\s*(\([^;]*?\))?\s*(?:IS|AS)\b",
    re.IGNORECASE | re.DOTALL,
)

_FUNCTION_RE = re.compile(
    r"(?:CREATE\s+(?:OR\s+REPLACE\s+)?)?FUNCTION\s+"
    r"(?:(\w+)\.)?(\w+)\s*(\([^;]*?\))?\s*RETURN\s+([\w%.]+)\s*(?:IS|AS)\b",
    re.IGNORECASE | re.DOTALL,
)

_TRIGGER_RE = re.compile(
    r"CREATE\s+(?:OR\s+REPLACE\s+)?TRIGGER\s+"
    r"(?:(\w+)\.)?(\w+)\s+"
    r"(BEFORE|AFTER|INSTEAD\s+OF)\s+"
    r"([\w\s,]+?)\s+"
    r"ON\s+(?:(\w+)\.)?(\w+)"
    r"(?P<for_each_row>\s+FOR\s+EACH\s+ROW)?"
    r"(?:\s+WHEN\s*\((?P<when_clause>[^)]*)\))?",
    re.IGNORECASE,
)

# Tokens that open/close a nested PL/SQL block, used by the balance scanner.
_BLOCK_TOKEN_RE = re.compile(
    r"\bBEGIN\b|\bCASE\b|\bIF\b|\bLOOP\b|\bEND\s+IF\b|\bEND\s+CASE\b|\bEND\s+LOOP\b|\bEND\b",
    re.IGNORECASE,
)


class PlsqlExtractor(BaseExtractor):
    """
    Extracts Oracle PL/SQL business artefacts: packages, package bodies,
    standalone procedures/functions, and triggers — full source body
    captured (not just the object name), tagged as business artefacts the
    same way DotNetExtractor tags service methods.

    Intended input: exported PL/SQL DDL text files (.sql/.pks/.pkb/.trg/...)
    produced from the database via DBMS_METADATA.GET_DDL or a schema export —
    NOT the .fmb/.pll Forms binaries themselves (see OracleFormsExtractor for
    those, once converted to text/XML by Oracle's own tooling).
    """

    def extract(self, file_path: str) -> List[Dict]:
        ext = Path(file_path).suffix.lower()
        if ext not in PLSQL_EXTENSIONS:
            return []

        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            return []

        artifacts: List[Dict] = []
        artifacts.extend(self._extract_package_specs(content, file_path))

        body_artifacts, body_spans = self._extract_package_bodies(content, file_path)
        artifacts.extend(body_artifacts)

        # Procedures/functions *inside* a package body were already captured
        # above (with parent_package set) — exclude those spans here so they
        # don't also get picked up as bare top-level matches.
        artifacts.extend(
            self._extract_standalone_procs_and_funcs(
                content, file_path, exclude_spans=body_spans
            )
        )
        artifacts.extend(self._extract_triggers(content, file_path))
        return artifacts

    # ── packages ──────────────────────────────────────────────────────────────

    def _extract_package_specs(self, content: str, file_path: str) -> List[Dict]:
        artifacts = []
        for m in _PACKAGE_SPEC_RE.finditer(content):
            name = m.group(2)
            end = _scan_to_unit_end(content, m.end())
            body = content[m.start():end]
            artifacts.append(self.make_artifact(
                language="plsql",
                source_file=file_path,
                type="package_spec",
                name=name,
                content=body[:4000],
                metadata={"schema": m.group(1) or "", "line_number": _line_of(content, m.start())},
                is_business_artifact=False,   # spec = interface only, no logic to review here
                business_category="contract_definition",
            ))
        return artifacts

    def _extract_package_bodies(
        self, content: str, file_path: str
    ) -> Tuple[List[Dict], List[Tuple[int, int]]]:
        artifacts = []
        spans: List[Tuple[int, int]] = []
        for m in _PACKAGE_BODY_RE.finditer(content):
            pkg_name = m.group(2)
            body_start = m.end()
            body_end = _scan_to_unit_end(content, body_start)
            package_body_text = content[m.start():body_end]
            spans.append((m.start(), body_end))

            # Whole-package artifact (useful as a single unit for the BA/AA agents).
            artifacts.append(self.make_artifact(
                language="plsql",
                source_file=file_path,
                type="package_body",
                name=pkg_name,
                content=package_body_text[:6000],
                metadata={"schema": m.group(1) or "", "line_number": _line_of(content, m.start())},
                is_business_artifact=True,
                business_category="process",
            ))

            # Individual procedures/functions nested inside the body, so each
            # gets its own business-category tag instead of being buried in
            # one giant package blob.
            artifacts.extend(
                self._extract_standalone_procs_and_funcs(
                    package_body_text, file_path, parent_package=pkg_name
                )
            )
        return artifacts, spans

    # ── standalone / nested procedures & functions ───────────────────────────

    def _extract_standalone_procs_and_funcs(
        self,
        content: str,
        file_path: str,
        parent_package: Optional[str] = None,
        exclude_spans: Optional[List[Tuple[int, int]]] = None,
    ) -> List[Dict]:
        artifacts = []
        exclude_spans = exclude_spans or []

        def _excluded(pos: int) -> bool:
            return any(start <= pos < end for start, end in exclude_spans)

        for m in _PROCEDURE_RE.finditer(content):
            if _excluded(m.start()):
                continue
            name = m.group(2)
            end = _scan_to_unit_end(content, m.end())
            body = content[m.start():end]
            is_business = self.is_business_method(name)
            artifacts.append(self.make_artifact(
                language="plsql",
                source_file=file_path,
                type="procedure",
                name=name,
                content=body[:4000],
                metadata={
                    "schema": m.group(1) or "",
                    "parent_package": parent_package or "",
                    "params_raw": (m.group(3) or "").strip()[:500],
                    "line_number": _line_of(content, m.start()),
                },
                is_business_artifact=is_business or bool(parent_package),
                business_category=self.get_business_category(name),
            ))

        for m in _FUNCTION_RE.finditer(content):
            if _excluded(m.start()):
                continue
            name = m.group(2)
            end = _scan_to_unit_end(content, m.end())
            body = content[m.start():end]
            is_business = self.is_business_method(name)
            artifacts.append(self.make_artifact(
                language="plsql",
                source_file=file_path,
                type="function",
                name=name,
                content=body[:4000],
                metadata={
                    "schema": m.group(1) or "",
                    "parent_package": parent_package or "",
                    "params_raw": (m.group(3) or "").strip()[:500],
                    "return_type": m.group(4),
                    "line_number": _line_of(content, m.start()),
                },
                is_business_artifact=is_business or bool(parent_package),
                business_category=self.get_business_category(name),
            ))

        return artifacts

    # ── triggers ──────────────────────────────────────────────────────────────

    def _extract_triggers(self, content: str, file_path: str) -> List[Dict]:
        artifacts = []
        for m in _TRIGGER_RE.finditer(content):
            name = m.group(2)
            table = m.group(6)
            end = _scan_to_unit_end(content, m.end())
            body = content[m.start():end]

            events = [e.strip().upper() for e in m.group(4).split(",") if e.strip()]
            timing = m.group(3).upper().replace("  ", " ")
            for_each_row = bool(m.group("for_each_row"))
            when_clause = (m.group("when_clause") or "").strip()

            new_old_refs = len(re.findall(r":(?:NEW|OLD)\.\w+", body, re.IGNORECASE))

            # DB triggers are almost never boilerplate — always surface them
            # as business logic for the discovery phase to review.
            artifacts.append(self.make_artifact(
                language="plsql",
                source_file=file_path,
                type="trigger",
                name=name,
                content=body[:4000],
                metadata={
                    "schema": m.group(5) or "",
                    "table": table,
                    "timing": timing,
                    "events": events,
                    "for_each_row": for_each_row,
                    "when_clause": when_clause,
                    "new_old_reference_count": new_old_refs,
                    "line_number": _line_of(content, m.start()),
                },
                is_business_artifact=True,
                business_category="trigger_logic",
            ))
        return artifacts


# ── shared helpers (also used by OracleFormsExtractor for embedded PL/SQL) ────

def _line_of(content: str, pos: int) -> int:
    return content.count("\n", 0, pos) + 1


def scan_to_unit_end(content: str, start_pos: int) -> int:
    """Public entry point — see _scan_to_unit_end for behaviour."""
    return _scan_to_unit_end(content, start_pos)


def _scan_to_unit_end(content: str, start_pos: int) -> int:
    """
    Starting just after a unit's IS/AS (or a trigger's ON-clause), scan
    forward tracking BEGIN/CASE/IF/LOOP nesting depth. Returns the index just
    past the bare END/END-name/; that closes the outermost block — i.e. the
    end of the whole package/procedure/function/trigger.

    A "bare" END (not immediately followed by IF/CASE/LOOP) closes either a
    nested BEGIN or, when the stack is empty, the outer unit itself.
    """
    depth = 0
    pos = start_pos
    length = len(content)

    for tok in _BLOCK_TOKEN_RE.finditer(content, start_pos):
        word = tok.group(0).upper().strip()
        word = re.sub(r"\s+", " ", word)

        if word in ("BEGIN", "CASE", "IF", "LOOP"):
            depth += 1
        elif word in ("END IF", "END CASE", "END LOOP"):
            depth = max(0, depth - 1)
        elif word == "END":
            if depth > 0:
                depth -= 1
            else:
                # Outer unit terminator — consume up to the trailing ';'
                # (covers "END;", "END pkg_name;", "END proc_name ;").
                semi = content.find(";", tok.end())
                return (semi + 1) if semi != -1 else min(tok.end() + 200, length)

    # No balanced END found (truncated file, or extraction glitch) — cap
    # the artifact instead of running to end-of-file.
    return min(start_pos + 6000, length)