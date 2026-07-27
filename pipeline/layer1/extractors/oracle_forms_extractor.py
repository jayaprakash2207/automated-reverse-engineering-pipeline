import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Dict, List, Optional

from .base_extractor import BaseExtractor
from .plsql_extractor import PlsqlExtractor, scan_to_unit_end

# ─────────────────────────────────────────────────────────────────────────────
# NOTE ON APPROACH — READ BEFORE TRUSTING THIS AT SCALE
# ─────────────────────────────────────────────────────────────────────────────
# Oracle Forms (.fmb/.mmb/.pll) is a proprietary binary format. This extractor
# does NOT read those binaries — it can't, and no open-source library does
# either. It reads whatever Oracle's own tooling exports as text/XML:
#
#   - JDAPI or `frmf2xml`/`frmcmp` (bundled with Forms Builder, not open
#     source, but free with an existing Forms licence) → XML export.
#     Recommended naming convention so this doesn't collide with ordinary
#     config XML: name form exports "<name>.frmxml", menu exports
#     "<name>.mmxml", library exports "<name>.pllxml".
#   - Forms Builder's "Save Module As Text" menu action → a plain-text
#     export, conventionally ".fmt" (form), ".mmt" (menu), ".pld" (library).
#
# The exact XML tag names Oracle emits vary across Forms versions (6i / 10g /
# 11g / 12c) and I don't have a live export to verify against, so XML parsing
# below uses FUZZY, KEYWORD-BASED tag matching (e.g. "contains TRIGGER") deliberately,
# instead of hardcoded exact tag names — it is more likely to survive version
# differences, but you should inspect one real exported file and adjust
# _TAG_CLASSIFIERS below if it misses things.
# ─────────────────────────────────────────────────────────────────────────────

FORMS_XML_EXTENSIONS = {".frmxml", ".mmxml", ".pllxml"}
FORMS_TEXT_EXTENSIONS = {".fmt", ".mmt", ".pld"}

# In practice, real exports frequently keep the plain ".xml" extension rather
# than following the .frmxml/.mmxml/.pllxml convention above — a JDAPI/
# frmf2xml export doesn't rename itself. Content-sniffing the root element
# lets a bare ".xml" file still be recognised as a Forms/Menu/Library export
# (and only that — ordinary config XML like web.config/app.config never
# starts with one of these root tags, so this doesn't steal files from
# ConfigExtractor).
_FORMS_XML_ROOT_RE = re.compile(
    r"<\s*(FormModule|MenuModule|LibraryModule|PLLModule|MMBModule)\b",
    re.IGNORECASE,
)


def looks_like_oracle_forms_xml(file_path: str) -> bool:
    """Cheap peek at the first ~2KB — avoids a full parse just to route files."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            head = fh.read(2048)
    except OSError:
        return False
    return bool(_FORMS_XML_ROOT_RE.search(head))

# Ordered (first match wins) substring classifiers for XML tag names.
# Checked against the tag with namespace stripped and upper-cased.
_TAG_CLASSIFIERS = [
    ("MENUITEM", "menu_item"),
    ("TRIGGER", "trigger"),
    ("PROGRAMUNIT", "program_unit"),
    ("PROGRAM_UNIT", "program_unit"),
    ("LIBRARYUNIT", "program_unit"),
    ("RECORDGROUP", "record_group"),
    ("BLOCK", "block"),
    ("CANVAS", "canvas"),
    ("WINDOW", "window"),
    ("LOV", "lov"),
    ("ALERT", "alert"),
    ("PARAMETER", "parameter"),
    ("MENU", "menu"),
    ("ITEM", "item"),
]

_NAME_ATTR_CANDIDATES = ("Name", "NAME", "name", "id", "ID")
_TEXT_TAG_HINTS = ("TRIGGERTEXT", "PLSQLTEXT", "TEXT", "SOURCE", "BODY")

# Forms trigger names always start with one of these prefixes by convention
# (WHEN-VALIDATE-ITEM, PRE-INSERT, KEY-NEXT-ITEM, ON-ERROR, POST-QUERY, ...).
_TRIGGER_NAME_RE = re.compile(
    r"^(WHEN|PRE|POST|KEY|ON)-[A-Z0-9\-]+$"
)

_STRUCTURAL_MARKER_RE = re.compile(
    r"^\s*(MODULE|FORM|BLOCK|ITEM|CANVAS|WINDOW|ALERT|LOV|RECORD\s*GROUP|"
    r"PARAMETER|MENU\s*ITEM|MENU)\s*[:=]?\s*([\w\-\.]+)\s*$",
    re.IGNORECASE,
)


class OracleFormsExtractor(BaseExtractor):
    """
    Extracts business artefacts (mainly triggers and program units — the two
    places Oracle Forms logic actually lives) plus a lightweight screen/block
    /item structural inventory, from exported Forms/Menu/Library text or XML.

    Routing:
        .frmxml / .mmxml / .pllxml  -> _extract_from_xml()
        .fmt / .mmt / .pld          -> _extract_from_text()
    """

    def __init__(self):
        self._plsql = PlsqlExtractor()

    def extract(self, file_path: str) -> List[Dict]:
        ext = Path(file_path).suffix.lower()

        if ext in FORMS_XML_EXTENSIONS:
            return self._extract_from_xml(file_path)
        if ext in FORMS_TEXT_EXTENSIONS:
            return self._extract_from_text(file_path)
        if ext == ".xml" and looks_like_oracle_forms_xml(file_path):
            return self._extract_from_xml(file_path)
        return []

    # ── XML export (JDAPI / frmf2xml) ────────────────────────────────────────

    def _extract_from_xml(self, file_path: str) -> List[Dict]:
        try:
            tree = ET.parse(file_path)
        except (ET.ParseError, OSError):
            return []

        artifacts: List[Dict] = []
        self._walk_xml(tree.getroot(), file_path, context={"block": "", "item": ""}, out=artifacts)
        return artifacts

    def _walk_xml(self, elem: ET.Element, file_path: str, context: Dict, out: List[Dict]):
        tag = self._classify_tag(elem.tag)
        name = self._get_name(elem)
        child_context = dict(context)

        if tag == "block":
            child_context["block"] = name or context.get("block", "")
            child_context["item"] = ""
            out.append(self._structural_artifact(file_path, "block", name, child_context))

        elif tag == "item" and name:
            child_context["item"] = name
            out.append(self._structural_artifact(file_path, "item", name, child_context))

        elif tag in ("canvas", "window", "lov", "record_group", "alert", "menu", "menu_item", "parameter"):
            out.append(self._structural_artifact(file_path, tag, name, child_context))

        elif tag == "trigger" and name:
            body = self._get_body_text(elem)
            out.append(self._trigger_artifact(file_path, name, body, child_context))

        elif tag == "program_unit" and name:
            body = self._get_body_text(elem)
            out.append(self._program_unit_artifact(file_path, name, body, child_context))

        for child in elem:
            self._walk_xml(child, file_path, child_context, out)

    @staticmethod
    def _classify_tag(tag: str) -> Optional[str]:
        local = tag.split("}")[-1].upper()   # strip XML namespace if present
        for needle, label in _TAG_CLASSIFIERS:
            if needle in local:
                return label
        return None

    @staticmethod
    def _get_name(elem: ET.Element) -> str:
        for attr in _NAME_ATTR_CANDIDATES:
            if attr in elem.attrib and elem.attrib[attr]:
                return elem.attrib[attr]
        for child in elem:
            local = child.tag.split("}")[-1].upper()
            if "NAME" in local and child.text:
                return child.text.strip()
        return ""

    @staticmethod
    def _get_body_text(elem: ET.Element) -> str:
        for child in elem.iter():
            local = child.tag.split("}")[-1].upper()
            if any(hint in local for hint in _TEXT_TAG_HINTS) and child.text and child.text.strip():
                return child.text
        # Fallback: everything under this element, concatenated.
        return "".join(elem.itertext())

    # ── plain text export ("Save Module As Text") ────────────────────────────

    def _extract_from_text(self, file_path: str) -> List[Dict]:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
                content = fh.read()
        except OSError:
            return []

        artifacts: List[Dict] = []

        # Library ".pld" text export is just PL/SQL PROCEDURE/FUNCTION units
        # with no CREATE wrapper — the plsql extractor's scanner handles that
        # grammar directly, no need to reinvent it.
        artifacts.extend(self._plsql._extract_standalone_procs_and_funcs(content, file_path))

        # Structural markers (BLOCK/ITEM/CANVAS/...) + triggers, tracked
        # top-to-bottom so a trigger picks up whichever block/item it
        # currently sits under.
        lines = content.split("\n")
        current_block, current_item = "", ""
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()

            marker = _STRUCTURAL_MARKER_RE.match(line)
            if marker:
                kind_raw, name = marker.group(1).upper().replace(" ", ""), marker.group(2)
                kind_map = {
                    "MODULE": "module", "FORM": "module", "BLOCK": "block",
                    "ITEM": "item", "CANVAS": "canvas", "WINDOW": "window",
                    "ALERT": "alert", "LOV": "lov", "RECORDGROUP": "record_group",
                    "PARAMETER": "parameter", "MENUITEM": "menu_item", "MENU": "menu",
                }
                kind = kind_map.get(kind_raw, "structural")
                if kind == "block":
                    current_block, current_item = name, ""
                elif kind == "item":
                    current_item = name
                context = {"block": current_block, "item": current_item}
                artifacts.append(self._structural_artifact(file_path, kind, name, context))
                i += 1
                continue

            # A bare trigger-name line (WHEN-*, PRE-*, POST-*, KEY-*, ON-*)
            # marks the start of a trigger body below it.
            if _TRIGGER_NAME_RE.match(stripped):
                trigger_name = stripped
                body_start_pos = sum(len(l) + 1 for l in lines[:i + 1])
                end_pos = scan_to_unit_end(content, body_start_pos)
                body = content[body_start_pos:end_pos]
                context = {"block": current_block, "item": current_item}
                artifacts.append(self._trigger_artifact(file_path, trigger_name, body, context))
                # Skip past the consumed body so we don't rescan its lines.
                consumed_lines = content.count("\n", 0, end_pos) - i
                i += max(consumed_lines, 1)
                continue

            i += 1

        return artifacts

    # ── artifact builders ────────────────────────────────────────────────────

    def _structural_artifact(self, file_path: str, kind: str, name: str, context: Dict) -> Dict:
        return self.make_artifact(
            language="oracle_forms",
            source_file=file_path,
            type=kind,
            name=name or f"unnamed_{kind}",
            content=f"{kind}: {name}",
            metadata={"block": context.get("block", ""), "item": context.get("item", "")},
            is_business_artifact=False,
            business_category="ui_structure",
        )

    def _trigger_artifact(self, file_path: str, name: str, body: str, context: Dict) -> Dict:
        return self.make_artifact(
            language="oracle_forms",
            source_file=file_path,
            type="forms_trigger",
            name=name,
            content=body[:4000],
            metadata={
                "block": context.get("block", ""),
                "item": context.get("item", ""),
                "trigger_event": name,
            },
            is_business_artifact=True,
            business_category="trigger_logic",
        )

    def _program_unit_artifact(self, file_path: str, name: str, body: str, context: Dict) -> Dict:
        is_business = self.is_business_method(name)
        return self.make_artifact(
            language="oracle_forms",
            source_file=file_path,
            type="program_unit",
            name=name,
            content=body[:4000],
            metadata={"block": context.get("block", ""), "item": context.get("item", "")},
            is_business_artifact=is_business,
            business_category=self.get_business_category(name),
        )