#!/usr/bin/env python3
"""Generate static GitHub Pages output (replaces Jekyll)."""

from __future__ import annotations

import argparse
import html
import re
import shutil
import sys
from pathlib import Path
from urllib.parse import quote

try:
    import markdown
except ImportError as exc:
    raise SystemExit(
        "Missing dependency: pip install markdown"
    ) from exc

SECTION_SPECS: list[tuple[str, str]] = [
    ("g2025b", "Für g2025b"),
    ("g2025ae", "Für g2025ae"),
    ("latein", "Für Latein"),
    ("ital", "Für Italienisch"),
    ("g2020c", "Für g2020c"),
    ("g2023k", "Für g2023k"),
]

DEPLOY_COPY_DIRS = ("abfragen", "erstellen", "fonts")
DEPLOY_COPY_FILES = ("shared.css", "CNAME")

INDEX_PLACEHOLDER = "%%LIST_SECTIONS%%"

TEMPLATE_RE = re.compile(
    r"<!--\s*template:(\w+)\s*\n(.*?)-->",
    re.DOTALL,
)

DEFAULT_LAYOUT_HEAD = """<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{title}</title>
    <link rel="stylesheet" href="shared.css">
    <link rel="stylesheet" href="fonts/cmu-serif.css">
    <style>
        .content {{
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            font-size: large;
        }}

        li {{
            margin: 4px;
        }}
    </style>
</head>
<body>
<div class="content">
"""

DEFAULT_LAYOUT_FOOT = """
</div>
</body>
</html>
"""

FRONT_MATTER_RE = re.compile(r"^---\s*\n.*?\n---\s*\n", re.DOTALL)


def _load_index_source(path: Path) -> tuple[str, dict[str, str]]:
    text = path.read_text(encoding="utf-8")
    templates = {
        name: body.strip()
        for name, body in TEMPLATE_RE.findall(text)
    }
    page = TEMPLATE_RE.sub("", text).strip()
    if INDEX_PLACEHOLDER not in page:
        raise ValueError(f"{path} must contain {INDEX_PLACEHOLDER}")
    for name in ("section", "list_item"):
        if name not in templates:
            raise ValueError(f"{path} missing <!-- template:{name} --> block")
    return page, templates


def _replace(template: str, **values: str) -> str:
    result = template
    for key, value in values.items():
        result = result.replace(f"%%{key}%%", value)
    return result


def _list_js_files(listen_dir: Path) -> list[str]:
    if not listen_dir.is_dir():
        return []
    files: list[tuple[str, float]] = []
    for path in listen_dir.glob("*.js"):
        files.append((path.stem, path.stat().st_mtime))
    files.sort(key=lambda item: item[1], reverse=True)
    return [stem for stem, _ in files]


def _quiz_href(folder: str, file_stem: str) -> str:
    return (
        f"/abfragen?folder={quote(folder, safe='')}"
        f"&file={quote(file_stem, safe='')}"
    )


def build_index_html(repo_root: Path) -> str:
    page, templates = _load_index_source(repo_root / "index.html")
    listen_root = repo_root / "abfragen" / "listen"
    sections: list[str] = []

    for folder, section_title in SECTION_SPECS:
        files = _list_js_files(listen_root / folder)
        items: list[str] = []
        for file_stem in files:
            items.append(
                _replace(
                    templates["list_item"],
                    HREF=html.escape(_quiz_href(folder, file_stem), quote=True),
                    LABEL=html.escape(file_stem.replace("_", " ")),
                )
            )
        list_items = ""
        if items:
            list_items = "<ul>\n" + "\n".join(items) + "\n</ul>\n"
        sections.append(
            _replace(
                templates["section"],
                SECTION_TITLE=html.escape(section_title),
                LIST_ITEMS=list_items,
            )
        )

    return page.replace(INDEX_PLACEHOLDER, "\n".join(sections))


def _strip_front_matter(text: str) -> str:
    return FRONT_MATTER_RE.sub("", text, count=1)


def _fix_quiz_links(text: str) -> str:
    return text.replace("](/vokabeltraining/abfragen", "](/abfragen")


def build_readme_html(repo_root: Path) -> str:
    readme_path = repo_root / "README.md"
    raw = readme_path.read_text(encoding="utf-8")
    body = _fix_quiz_links(_strip_front_matter(raw))
    md = markdown.Markdown(extensions=["extra", "smarty"])
    content = md.convert(body)
    return (
        DEFAULT_LAYOUT_HEAD.format(title=html.escape("Anleitung"))
        + content
        + DEFAULT_LAYOUT_FOOT
    )


def prepare_deploy(repo_root: Path, output_dir: Path) -> None:
    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    (output_dir / "index.html").write_text(
        build_index_html(repo_root), encoding="utf-8", newline="\n"
    )
    (output_dir / "README.html").write_text(
        build_readme_html(repo_root), encoding="utf-8", newline="\n"
    )
    (output_dir / ".nojekyll").touch()

    for name in DEPLOY_COPY_DIRS:
        src = repo_root / name
        if src.exists():
            shutil.copytree(src, output_dir / name)

    for name in DEPLOY_COPY_FILES:
        src = repo_root / name
        if src.is_file():
            shutil.copy2(src, output_dir / name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--repo-root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Repository root (default: parent of scripts/)",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=None,
        help="Write deploy artifact here (default: write README.html only in repo root)",
    )
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()

    if args.output_dir:
        prepare_deploy(repo_root, args.output_dir.resolve())
        print(f"Deploy artifact written to {args.output_dir}")
        return 0

    (repo_root / "README.html").write_text(
        build_readme_html(repo_root), encoding="utf-8", newline="\n"
    )
    print("Wrote README.html (index.html is the source template in the repo)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
