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

TITLE_PAGE_HEAD = """<link rel="stylesheet" href="shared.css" />
<style>
    body {
        margin-top: 0;
    }
    h1, h2 {
        font-size: 1.8rem;
        text-align: center;
        margin-top: 0rem;
        margin-bottom: 1rem;
    }

    .section {
        border: 2px solid var(--color-outer);
        border-radius: 15px;
        padding: 20px;
    }

    .section ul {
        list-style-type: none;
        padding: 0;
        text-align: center;
    }

    .section p {
        margin: 6px;
        font-size: 1.3rem;
    }

    .section a {
        text-transform: capitalize;
    }

    .section a:hover {
        text-decoration: none;
    }

    .anleitung-link {
        position: absolute;
        top: 20px;
        right: 20px;
        font-size: 1rem;
    }
</style>

<div class="anleitung-link">
<a href="README.html">Anleitung</a>
</div>

<h1>Listen</h1>

<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
"""

TITLE_PAGE_FOOT = """
</div>

<link rel="stylesheet" href="../fonts/cmu-serif.css" />
"""

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
    parts = [TITLE_PAGE_HEAD]
    listen_root = repo_root / "abfragen" / "listen"

    for folder, section_title in SECTION_SPECS:
        files = _list_js_files(listen_root / folder)
        parts.append('<div class="section">\n')
        parts.append(f"<h2>{html.escape(section_title)}:</h2>\n")
        if files:
            parts.append("<ul>\n")
            for file_stem in files:
                label = html.escape(file_stem.replace("_", " "))
                href = html.escape(_quiz_href(folder, file_stem), quote=True)
                parts.append('  <li class="button_style">\n')
                parts.append(f'    <p><a href="{href}">{label}</a></p>\n')
                parts.append("  </li>\n")
            parts.append("</ul>\n")
        parts.append("</div>\n")

    parts.append(TITLE_PAGE_FOOT)
    return "".join(parts)


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
        help="Write deploy artifact here (default: only index.html and README.html in repo root)",
    )
    args = parser.parse_args()
    repo_root = args.repo_root.resolve()

    if args.output_dir:
        prepare_deploy(repo_root, args.output_dir.resolve())
        print(f"Deploy artifact written to {args.output_dir}")
        return 0

    (repo_root / "index.html").write_text(
        build_index_html(repo_root), encoding="utf-8", newline="\n"
    )
    (repo_root / "README.html").write_text(
        build_readme_html(repo_root), encoding="utf-8", newline="\n"
    )
    print("Wrote index.html and README.html")
    return 0


if __name__ == "__main__":
    sys.exit(main())
