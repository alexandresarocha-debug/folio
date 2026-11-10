#!/usr/bin/env python3
"""Turn headed sections of plain prose into a summary HTML file."""
from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "summaries"


def words(text: str) -> int:
    return len(re.sub(r"\s+", " ", text).split())


def article(sections: list[tuple[str, list[str]]]) -> str:
    parts = ['<article class="work-doc">']
    body = []
    for heading, paras in sections:
        parts.append(f"<h2>{html.escape(heading)}</h2>")
        body.append(heading)
        for para in paras:
            clean = " ".join(para.split())
            if not clean:
                continue
            parts.append(f"<p>{html.escape(clean)}</p>")
            body.append(clean)
    parts.append("</article>")
    doc = "\n".join(parts)
    n = words(" ".join(body))
    if n < 1000:
        raise SystemExit(f"short essay ({n} words)")
    return doc


def save(wid: str, sections: list[tuple[str, list[str]]]) -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    doc = article(sections)
    (OUT / f"{wid}.html").write_text(doc + "\n", encoding="utf-8")
    return words(re.sub(r"<[^>]+>", " ", doc))
