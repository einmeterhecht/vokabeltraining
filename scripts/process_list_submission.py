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
DEFAULT_HINTS = ["Beispiele", "Lernhilfe"]

SAFE_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+$")
OUTPUT_FILE_RE = re.compile(r"^abfragen/listen/[A-Za-z0-9._-]+/[A-Za-z0-9._-]+\.js$")
CODE_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.IGNORECASE | re.DOTALL)


def _truncate_errors(errors: list[str], limit: int = 10) -> list[str]:
    if len(errors) <= limit:
        return errors
    hidden = len(errors) - limit
    return errors[:limit] + [f"... und {hidden} weitere Fehler"]


def _slugify_title(title: str) -> str:
    s = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    s = re.sub(r"\s+", "_", s.strip())
    s = re.sub(r"[^A-Za-z0-9._-]", "_", s)
    s = re.sub(r"_+", "_", s).strip("._-")
    return s or "liste"


def _extract_first_string(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list) and value and isinstance(value[0], str):
        return value[0].strip()
    return ""


def _extract_issue_body(args: argparse.Namespace) -> tuple[int, str]:
    if args.event_file:
        issue = json.loads(Path(args.event_file).read_text(encoding="utf-8")).get("issue") or {}
        return int(issue.get("number") or 0), str(issue.get("body") or "")
    return int(args.issue_number or 0), Path(args.body_file).read_text(encoding="utf-8")


def _extract_payload_json(issue_body: str) -> tuple[dict[str, Any] | None, str, str]:
    start = issue_body.find(START_MARKER)
    if start < 0:
        return None, "", "Start-Markierung fehlt: <!-- LIST_SUBMISSION_START -->"
    end = issue_body.find(END_MARKER, start + len(START_MARKER))
    if end < 0:
        return None, "", "End-Markierung fehlt: <!-- LIST_SUBMISSION_END -->"

    block = issue_body[start + len(START_MARKER):end].strip()
    if not block:
        return None, "", "Zwischen den Markierungen wurde kein Inhalt gefunden."

    m = CODE_FENCE_RE.search(block)
    payload_text = m.group(1).strip() if m else block
    if not payload_text:
        return None, "", "Zwischen den Markierungen wurde kein JSON-Inhalt gefunden."

    try:
        payload = json.loads(payload_text)
    except json.JSONDecodeError as exc:
        return None, payload_text, f"JSON konnte nicht gelesen werden (Zeile {exc.lineno}, Spalte {exc.colno}): {exc.msg}"

    if not isinstance(payload, dict):
        return None, payload_text, "Das JSON muss ein Objekt sein."
    return payload, payload_text, ""


def _collect_targets(listen_root: Path) -> set[str]:
    if not listen_root.is_dir():
        return set()
    return {p.name for p in listen_root.iterdir() if p.is_dir()}


def _validate_submission(payload: dict[str, Any], repo_root: Path, issue_body: str) -> dict[str, Any]:
    errors: list[str] = []

    if len(issue_body) > MAX_ISSUE_BODY_CHARS:
        errors.append(f"Issue-Text ist zu gross ({len(issue_body)} Zeichen, erlaubt: {MAX_ISSUE_BODY_CHARS}).")

    title_raw = str(payload.get("title") or "").strip()
    target_raw = str(payload.get("target") or "").strip()
    frage_attribut = str(payload.get("frage_attribut") or "").strip()
    antwort_attribut = str(payload.get("antwort_attribut") or "").strip()

    for field, value in [("title", title_raw), ("target", target_raw),
                          ("frage_attribut", frage_attribut), ("antwort_attribut", antwort_attribut)]:
        if not value:
            errors.append(f"Feld '{field}' fehlt oder ist leer.")

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
        hinweis_attribute = DEFAULT_HINTS
    if not isinstance(hinweis_attribute, list) or not hinweis_attribute:
        errors.append("'hinweis_attribute' muss ein nicht-leeres Array aus Texten sein.")
        hinweis_attribute = DEFAULT_HINTS

    cleaned_hinweise: list[str] = []
    for idx, value in enumerate(hinweis_attribute):
        if not isinstance(value, str) or not value.strip():
            errors.append(f"hinweis_attribute[{idx}] muss ein nicht-leerer Text sein.")
        else:
            cleaned_hinweise.append(value.strip())

    fragen_raw = payload.get("fragen")
    if not isinstance(fragen_raw, list):
        errors.append("'fragen' muss ein Array sein.")
        fragen_raw = []
    elif not fragen_raw:
        errors.append("'fragen' muss mindestens einen Eintrag enthalten.")
    elif len(fragen_raw) > MAX_QUESTIONS:
        errors.append(f"'fragen' ist zu gross (maximal {MAX_QUESTIONS} Eintraege).")

    normalized_questions: list[dict[str, list[str]]] = []
    for index, row in enumerate(fragen_raw[:MAX_QUESTIONS]):
        if not isinstance(row, dict):
            errors.append(f"fragen[{index}] muss ein Objekt sein.")
            continue
        q = _extract_first_string(row.get(frage_attribut))
        a = _extract_first_string(row.get(antwort_attribut))
        if not q:
            errors.append(f"fragen[{index}] hat keinen gueltigen Wert fuer '{frage_attribut}'.")
        if not a:
            errors.append(f"fragen[{index}] hat keinen gueltigen Wert fuer '{antwort_attribut}'.")
        if len(q) > MAX_ENTRY_LENGTH:
            errors.append(f"fragen[{index}] '{frage_attribut}' ist zu lang (maximal {MAX_ENTRY_LENGTH} Zeichen).")
        if len(a) > MAX_ENTRY_LENGTH:
            errors.append(f"fragen[{index}] '{antwort_attribut}' ist zu lang (maximal {MAX_ENTRY_LENGTH} Zeichen).")
        if q and a:
            normalized_questions.append({frage_attribut: [q], antwort_attribut: [a]})

    listen_root = repo_root / "abfragen" / "listen"
    allowed_targets = _collect_targets(listen_root)
    if target_raw and target_raw not in allowed_targets:
        errors.append(f"'target' ist ungueltig. Erlaubte Werte sind: {', '.join(sorted(allowed_targets))}")

    output_file = ""
    if target_raw and slug:
        target_dir = (listen_root / target_raw).resolve()
        output_abs = (target_dir / f"{slug}.js").resolve()
        if target_dir not in output_abs.parents:
            errors.append("Ungueltiger Ausgabepfad erkannt (Pfadmanipulation).")
        else:
            try:
                rel = output_abs.relative_to(repo_root.resolve()).as_posix()
                if not OUTPUT_FILE_RE.fullmatch(rel):
                    errors.append("Ausgabedatei hat ein ungueltiges Format.")
                else:
                    output_file = rel
            except ValueError:
                errors.append("Ausgabedatei liegt ausserhalb des Repository-Roots.")

    js_content = (
        "var liste = "
        + json.dumps({
            "fragen": normalized_questions,
            "hinweis_attribute": cleaned_hinweise or DEFAULT_HINTS,
            "titel": slug,
            "frage_attribut": frage_attribut,
        }, indent=4, ensure_ascii=True)
        + ";\n\nerste_aufgabe();\n"
    )

    return {
        "valid": not errors,
        "errors": _truncate_errors(errors),
        "slug": slug,
        "target": target_raw,
        "frage_attribut": frage_attribut,
        "antwort_attribut": antwort_attribut,
        "question_count": len(normalized_questions),
        "output_file": output_file,
        "js_content": js_content,
    }


def _write_output(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def _write_github_output(path: Path, result: dict[str, Any]) -> None:
    fields = {
        "valid": "true" if result.get("valid") else "false",
        "issue_number": result.get("issue_number", ""),
        "branch": result.get("branch", ""),
        "output_file": result.get("output_file", ""),
        "question_count": result.get("question_count", 0),
        "target": result.get("target", ""),
        "slug": result.get("slug", ""),
    }
    with path.open("a", encoding="utf-8") as f:
        for key, value in fields.items():
            text = "" if value is None else str(value)
            if "\n" in text or "\r" in text:
                raise ValueError(f"Output field must be single-line: {key}")
            f.write(f"{key}={text}\n")


def process_submission(args: argparse.Namespace) -> dict[str, Any]:
    repo_root = Path(args.repo_root).resolve()
    issue_number, issue_body = _extract_issue_body(args)
    branch = f"submission/issue-{issue_number}" if issue_number else "submission/manual"

    def fail(message: str) -> dict[str, Any]:
        return {
            "valid": False, "errors": [message], "error_message": message,
            "issue_number": issue_number, "branch": branch,
            "output_file": "", "target": "", "slug": "", "question_count": 0,
        }

    payload, payload_text, parse_error = _extract_payload_json(issue_body)
    if parse_error:
        return fail(parse_error)
    if len(payload_text) > MAX_JSON_CHARS:
        return fail(f"JSON-Block ist zu gross ({len(payload_text)} Zeichen, erlaubt: {MAX_JSON_CHARS}).")

    v = _validate_submission(payload, repo_root=repo_root, issue_body=issue_body)

    result: dict[str, Any] = {
        "valid": v["valid"],
        "errors": v["errors"],
        "error_message": "\n".join(v["errors"]) if v["errors"] else "",
        "issue_number": issue_number,
        "branch": branch,
        "output_file": v["output_file"],
        "target": v["target"],
        "slug": v["slug"],
        "question_count": v["question_count"],
    }

    # Guard: output_file must still match the regex after all transformations
    if result["valid"] and not OUTPUT_FILE_RE.fullmatch(result["output_file"]):
        return fail("Interner Fehler: Ungueltiger Ausgabepfad erzeugt.")

    # Write using the validated relative path from result, not the validation intermediate
    if result["valid"] and args.write:
        _write_output(repo_root / result["output_file"], v["js_content"])

    return result


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".", help="Repository root path")
    parser.add_argument("--event-file", help="Path to GitHub issue event JSON")
    parser.add_argument("--body-file", help="Path to a plain text issue body file")
    parser.add_argument("--issue-number", type=int, default=0, help="Issue number for --body-file mode")
    parser.add_argument("--write", action="store_true", help="Write generated JS file when valid")
    parser.add_argument("--output-json", help="Write result JSON to this path")
    parser.add_argument("--github-output", help="Write workflow outputs to this file")
    parser.add_argument("--print-error", metavar="JSON_FILE", help="Print error_message from a result JSON and exit")
    return parser


def main() -> int:
    parser = _build_parser()
    args = parser.parse_args()

    if args.print_error:
        data = json.loads(Path(args.print_error).read_text(encoding="utf-8"))
        print(str(data.get("error_message") or "").strip())
        return 0

    if bool(args.event_file) == bool(args.body_file):
        parser.error("Exactly one of --event-file or --body-file is required.")

    result = process_submission(args)

    if args.github_output:
        _write_github_output(Path(args.github_output), result)

    output_text = json.dumps(result, indent=2, ensure_ascii=False)
    if args.output_json:
        Path(args.output_json).write_text(output_text + "\n", encoding="utf-8")
    else:
        print(output_text)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover
        print(f"Fatal error: {exc}", file=sys.stderr)
        raise