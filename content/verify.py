#!/usr/bin/env python3
"""Check Go deeper summaries: length, metadata, files, and working links."""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "data" / "cards.json"
APP = ROOT / "app.js"
SW = ROOT / "sw.js"
MIN_WORDS = 1000
UA = {"User-Agent": "Mozilla/5.0 (compatible; FolioVerify/1.0)"}


class Extractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self.bad: list[str] = []
        self.h2 = 0
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "iframe", "object", "embed"}:
            self.bad.append(tag)
            self.skip += 1
        if tag == "h2":
            self.h2 += 1

    def handle_endtag(self, tag):
        if tag in {"script", "iframe", "object", "embed"} and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def words(html: str) -> tuple[int, int, list[str]]:
    parser = Extractor()
    parser.feed(html)
    text = re.sub(r"\s+", " ", " ".join(parser.parts)).strip()
    return len(text.split()), parser.h2, parser.bad


def check_link(url: str) -> str | None:
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            return None if res.status < 400 else f"HTTP {res.status}"
    except urllib.error.HTTPError as e:
        if "doi.org" in url and e.code in {301, 302, 303, 307, 308, 401, 403, 429}:
            return None
        if e.code in {301, 302, 303, 307, 308}:
            return None
        return f"HTTP {e.code}"
    except Exception as e:
        return type(e).__name__


def main() -> None:
    errors: list[str] = []
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    cards = data["cards"]
    if len(cards) != 62:
        errors.append(f"expected 62 cards, found {len(cards)}")
    app = APP.read_text(encoding="utf-8")
    sw = SW.read_text(encoding="utf-8")
    if "const KEY = 'folio.v1'" not in app:
        errors.append("localStorage key folio.v1 changed")
    if "folio-v1.3.0" not in sw:
        errors.append("service worker is not folio-v1.3.0")
    if "summaries/" in sw.split("SHELL", 1)[-1].split("];", 1)[0]:
        errors.append("summaries must be lazy-loaded, not precached")

    seen: dict[str, str] = {}
    lengths: list[int] = []
    links: list[tuple[str, str]] = []
    for card in cards:
        cid = card["id"]
        if "furtherReading" in card:
            errors.append(f"{cid}: furtherReading should be merged into goDeeper")
        works = card.get("goDeeper") or []
        if not works:
            errors.append(f"{cid}: Go deeper is empty")
        if len(works) > 5:
            errors.append(f"{cid}: more than 5 works")
        for w in works:
            for field in ("id", "title", "authors", "year", "type", "file", "sourceUrl"):
                if w.get(field) in (None, ""):
                    errors.append(f"{cid}/{w.get('id')}: missing {field}")
            if w.get("type") not in {"paper", "book"}:
                errors.append(f"{cid}/{w.get('id')}: type must be paper or book")
            wid = w.get("id", "")
            path = ROOT / w.get("file", "")
            if wid in seen and seen[wid] != w.get("file"):
                errors.append(f"{wid}: inconsistent file path")
            seen[wid] = w.get("file", "")
            if not path.exists():
                errors.append(f"{cid}/{wid}: missing {w.get('file')}")
                continue
            raw = path.read_text(encoding="utf-8")
            n, h2, bad = words(raw)
            if wid not in {x for x, _ in []} and path.name not in {p.name for p in []}:
                pass
            if n < MIN_WORDS:
                errors.append(f"{wid}: {n} words, minimum is {MIN_WORDS}")
            if h2 < 3:
                errors.append(f"{wid}: needs subheadings")
            if bad or "<script" in raw.lower():
                errors.append(f"{wid}: unsafe markup")
            lengths.append(n)
            url = w.get("sourceUrl") or ""
            if not url.startswith("http"):
                errors.append(f"{wid}: sourceUrl must be http(s)")
            else:
                links.append((wid, url))

    checked: dict[str, str | None] = {}
    print(f"Checking {len({u for _, u in links})} links...", flush=True)
    for wid, url in links:
        if url not in checked:
            checked[url] = check_link(url)
            print((" ok " if not checked[url] else "FAIL"), url[:90], flush=True)
        if checked[url]:
            errors.append(f"{wid}: {checked[url]} ({url})")

    # unique lengths
    by_file: dict[str, int] = {}
    for card in cards:
        for w in card.get("goDeeper") or []:
            path = ROOT / w["file"]
            if path.exists() and w["file"] not in by_file:
                n, _, _ = words(path.read_text(encoding="utf-8"))
                by_file[w["file"]] = n
    avg = round(sum(by_file.values()) / len(by_file), 1) if by_file else 0
    print(f"works listed: {len(seen)}")
    print(f"summary files: {len(by_file)}")
    print(f"average words: {avg}")
    if errors:
        print(f"\n{len(errors)} problems", file=sys.stderr)
        for e in errors[:60]:
            print(" -", e, file=sys.stderr)
        sys.exit(1)
    print("verify ok")


if __name__ == "__main__":
    main()
