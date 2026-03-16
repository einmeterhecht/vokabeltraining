#!/usr/bin/env python3
"""Parse, validate and optionally materialize a list submission from an issue body."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

START_MARKER = "<!-- LIST_SUBMISSION_START -->"
END_MARKER = "<!-- LIST_SUBMISSION_END -->"

MAX_ISSUE_BODY_CHARS = 200_000
MAX_JSON_CHARS = 120_000
MAX_QUESTIONS = 1_500
MAX_ATTR_LENGTH = 120
MAX_ENTRY_LENGTH = 2_000
MAX_TITLE_LENGTH = 180

SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")
CODE_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.IGNORECASE | re.DOTALL)


def _truncate_errors(errors: list[str], limit: int = 10) -> list[str]:
    if len(errors) <= limit:
        return errors
    hidden = len(errors) - limit
    return errors[:limit] + [f"... und {hidden} weitere Fehler"]


def _slugify_title(title: str) -> str:
    normalized = unicodedata.normalize("NFKD", title)
    ascii_title = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_title = re.sub(r"\s+", "_", ascii_title.strip())
    ascii_title = re.sub(r"[^A-Za-z0-9._-]", "_", ascii_title)
    ascii_title = re.sub(r"_+", "_", ascii_title)
    ascii_title = ascii_title.strip("._-")
    return ascii_title or "liste"


def _extract_first_string(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list) and value:
        first = value[0]
        if isinstance(first, str):
            return first.strip()
    return ""


def _extract_issue_body(args: argparse.Namespace) -> tuple[int, str]:
    if args.event_file:
        event_data = json.loads(Path(args.event_file).read_text(encoding="utf-8"))
        issue = event_data.get("issue") or {}
        issue_number = int(issue.get("number") or 0)
        issue_body = issue.get("body") or ""
        return issue_number, str(issue_body)

    issue_number = int(args.issue_number or 0)
    issue_body = Path(args.body_file).read_text(encoding="utf-8")
    return issue_number, issue_body


def _extract_payload_json(issue_body: str) -> tuple[dict[str, Any] | None, str, str]:
    start = issue_body.find(START_MARKER)
    if start < 0:
        return None, "", "Start-Markierung fehlt: <!-- LIST_SUBMISSION_START -->"

    end = issue_body.find(END_MARKER, start + len(START_MARKER))
    if end < 0:
        return None, "", "End-Markierung fehlt: <!-- LIST_SUBMISSION_END -->"

    block = issue_body[start + len(START_MARKER) : end].strip()
    if not block:
        return None, "", "Zwischen den Markierungen wurde kein Inhalt gefunden."

    fence_match = CODE_FENCE_RE.search(block)
    payload_text = fence_match.group(1).strip() if fence_match else block.strip()
    if not payload_text:
        return None, "", "Zwischen den Markierungen wurde kein JSON-Inhalt gefunden."

    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError as exc:
        return (
            None,
            payload_text,
            f"JSON konnte nicht gelesen werden (Zeile {exc.lineno}, Spalte {exc.colno}): {exc.msg}",
        )

    if not isinstance(payload, dict):
        return None, payload_text, "Das JSON muss ein Objekt sein."

    return payload, payload_text, ""


def _collect_targets(listen_root: Path) -> set[str]:
    if not listen_root.is_dir():
        return set()
    return {item.name for item in listen_root.iterdir() if item.is_dir()}


def _validate_submission(payload: dict[str, Any], repo_root: Path, issue_body: str) -> dict[str, Any]:
    errors: list[str] = []

    if len(issue_body) > MAX_ISSUE_BODY_CHARS:
        errors.append(
            f"Issue-Text ist zu gross ({len(issue_body)} Zeichen, erlaubt: {MAX_ISSUE_BODY_CHARS})."
        )

    title_raw = str(payload.get("title") or "").strip()
    target_raw = str(payload.get("target") or "").strip()
    frage_attribut = str(payload.get("frage_attribut") or "").strip()
    antwort_attribut = str(payload.get("antwort_attribut") or "").strip()

    if not title_raw:
        errors.append("Feld 'title' fehlt oder ist leer.")
    if not target_raw:
        errors.append("Feld 'target' fehlt oder ist leer.")
    if not frage_attribut:
        errors.append("Feld 'frage_attribut' fehlt oder ist leer.")
    if not antwort_attribut:
        errors.append("Feld 'antwort_attribut' fehlt oder ist leer.")
    if frage_attribut and antwort_attribut and frage_attribut == antwort_attribut:
        errors.append("'frage_attribut' und 'antwort_attribut' muessen unterschiedlich sein.")

    if len(title_raw) > MAX_TITLE_LENGTH:
        errors.append(f"'title' ist zu lang (maximal {MAX_TITLE_LENGTH} Zeichen).")
    if len(frage_attribut) > MAX_ATTR_LENGTH:
        errors.append(f"'frage_attribut' ist zu lang (maximal {MAX_ATTR_LENGTH} Zeichen).")
    if len(antwort_attribut) > MAX_ATTR_LENGTH:
        errors.append(f"'antwort_attribut' ist zu lang (maximal {MAX_ATTR_LENGTH} Zeichen).")

    slug = _slugify_title(title_raw)
    if not SAFE_NAME_RE.fullmatch(slug):
        errors.append("'title' konnte nicht in einen gueltigen Dateinamen umgewandelt werden.")

    if not SAFE_NAME_RE.fullmatch(target_raw) or ".." in target_raw:
        errors.append("'target' enthaelt ungueltige Zeichen.")

    hinweis_attribute = payload.get("hinweis_attribute")
    if hinweis_attribute is None:
        hinweis_attribute = ["Beispiele", "Lernhilfe"]
    if not isinstance(hinweis_attribute, list) or not hinweis_attribute:
        errors.append("'hinweis_attribute' muss ein nicht-leeres Array aus Texten sein.")
        hinweis_attribute = ["Beispiele", "Lernhilfe"]

    cleaned_hinweise: list[str] = []
    for idx, value in enumerate(hinweis_attribute):
        if not isinstance(value, str) or not value.strip():
            errors.append(f"hinweis_attribute[{idx}] muss ein nicht-leerer Text sein.")
            continue
        cleaned_hinweise.append(value.strip())

    fragen_raw = payload.get("fragen")
    if not isinstance(fragen_raw, list):
        errors.append("'fragen' muss ein Array sein.")
        fragen_raw = []

    if len(fragen_raw) == 0:
        errors.append("'fragen' muss mindestens einen Eintrag enthalten.")
    if len(fragen_raw) > MAX_QUESTIONS:
        errors.append(f"'fragen' ist zu gross (maximal {MAX_QUESTIONS} Eintraege).")

    normalized_questions: list[dict[str, list[str]]] = []

    for index, row in enumerate(fragen_raw[: MAX_QUESTIONS + 1]):
        if not isinstance(row, dict):
            errors.append(f"fragen[{index}] muss ein Objekt sein.")
            continue

        question_value = _extract_first_string(row.get(frage_attribut))
        answer_value = _extract_first_string(row.get(antwort_attribut))

        if not question_value:
            errors.append(f"fragen[{index}] hat keinen gueltigen Wert fuer '{frage_attribut}'.")
        if not answer_value:
            errors.append(f"fragen[{index}] hat keinen gueltigen Wert fuer '{antwort_attribut}'.")

        if len(question_value) > MAX_ENTRY_LENGTH:
            errors.append(
                f"fragen[{index}] '{frage_attribut}' ist zu lang (maximal {MAX_ENTRY_LENGTH} Zeichen)."
            )
        if len(answer_value) > MAX_ENTRY_LENGTH:
            errors.append(
                f"fragen[{index}] '{antwort_attribut}' ist zu lang (maximal {MAX_ENTRY_LENGTH} Zeichen)."
            )

        if question_value and answer_value:
            normalized_questions.append(
                {
                    frage_attribut: [question_value],
                    antwort_attribut: [answer_value],
                }
            )

    listen_root = repo_root / "abfragen" / "listen"
    allowed_targets = _collect_targets(listen_root)

    if target_raw and target_raw not in allowed_targets:
        known_targets = ", ".join(sorted(allowed_targets))
        errors.append(
            f"'target' ist ungueltig. Erlaubte Werte sind: {known_targets}"
        )

    output_relative = ""
    output_absolute = None

    if target_raw and slug:
        target_dir = (listen_root / target_raw).resolve()
        output_absolute = (target_dir / f"{slug}.js").resolve()
        if target_dir not in output_absolute.parents:
            errors.append("Ungueltiger Ausgabepfad erkannt (Pfadmanipulation).")
        else:
            try:
                output_relative = output_absolute.relative_to(repo_root.resolve()).as_posix()
            except ValueError:
                errors.append("Ausgabedatei liegt ausserhalb des Repository-Roots.")

    list_object = {
        "fragen": normalized_questions,
        "hinweis_attribute": cleaned_hinweise or ["Beispiele", "Lernhilfe"],
        "titel": slug,
        "frage_attribut": frage_attribut,
    }

    js_content = "var liste = " + json.dumps(list_object, indent=4, ensure_ascii=True) + ";\n\nerste_aufgabe();\n"

    return {
        "valid": len(errors) == 0,
        "errors": _truncate_errors(errors),
        "slug": slug,
        "target": target_raw,
        "frage_attribut": frage_attribut,
        "antwort_attribut": antwort_attribut,
        "question_count": len(normalized_questions),
        "output_file": output_relative,
        "output_absolute": str(output_absolute) if output_absolute else "",
        "js_content": js_content,
    }


def _write_output(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def process_submission(args: argparse.Namespace) -> dict[str, Any]:
    repo_root = Path(args.repo_root).resolve()
    issue_number, issue_body = _extract_issue_body(args)

    branch_name = f"submission/issue-{issue_number}" if issue_number else "submission/manual"

    payload, payload_text, parse_error = _extract_payload_json(issue_body)
    if parse_error:
        return {
            "valid": False,
            "error_message": parse_error,
            "errors": [parse_error],
            "issue_number": issue_number,
            "branch": branch_name,
            "output_file": "",
            "target": "",
            "slug": "",
            "question_count": 0,
        }

    if len(payload_text) > MAX_JSON_CHARS:
        message = (
            f"JSON-Block ist zu gross ({len(payload_text)} Zeichen, erlaubt: {MAX_JSON_CHARS})."
        )
        return {
            "valid": False,
            "error_message": message,
            "errors": [message],
            "issue_number": issue_number,
            "branch": branch_name,
            "output_file": "",
            "target": "",
            "slug": "",
            "question_count": 0,
        }

    validation = _validate_submission(payload, repo_root=repo_root, issue_body=issue_body)

    result: dict[str, Any] = {
        "valid": validation["valid"],
        "errors": validation["errors"],
        "error_message": "\n".join(validation["errors"]) if validation["errors"] else "",
        "issue_number": issue_number,
        "branch": branch_name,
        "output_file": validation["output_file"],
        "target": validation["target"],
        "slug": validation["slug"],
        "question_count": validation["question_count"],
    }

    if validation["valid"] and args.write:
        output_file = Path(validation["output_absolute"])
        _write_output(output_file, validation["js_content"])

    return result


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="Repository root path")
    parser.add_argument("--event-file", help="Path to GitHub issue event JSON")
    parser.add_argument("--body-file", help="Path to a plain text issue body file")
    parser.add_argument("--issue-number", type=int, default=0, help="Issue number for --body-file mode")
    parser.add_argument("--write", action="store_true", help="Write generated JS file when valid")
    parser.add_argument("--output-json", help="Write result JSON to this path")
    return parser


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    if bool(args.event_file) == bool(args.body_file):
        parser.error("Exactly one of --event-file or --body-file is required.")

    result = process_submission(args)

    output_text = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output_json:
        Path(args.output_json).write_text(output_text + "\n", encoding="utf-8")
    else:
        print(output_text)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover - hard fail for unexpected runner issues
        print(f"Fatal error: {exc}", file=sys.stderr)
        raise
