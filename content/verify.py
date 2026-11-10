#!/usr/bin/env python3
"""Validate Folio cards, Go deeper licenses, bundled texts, and further-reading links."""
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
ALLOWED = {"public-domain", "cc-by", "cc-by-sa", "cc0"}
UA = {"User-Agent": "Mozilla/5.0 (compatible; FolioVerify/1.0)"}


class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
        self.bad = []

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "iframe", "object", "embed"}:
            self.bad.append(tag)
            self.skip += 1
        if tag == "p":
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "iframe", "object", "embed"} and self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)


def check_html(path: Path, errors: list[str], label: str):
    if not path.exists():
        errors.append(f"{label}: missing file {path.relative_to(ROOT)}")
        return
    raw = path.read_text(encoding="utf-8")
    if "<script" in raw.lower() or "<iframe" in raw.lower():
        errors.append(f"{label}: text file contains script or iframe")
    parser = TextExtractor()
    parser.feed(raw)
    if parser.bad:
        errors.append(f"{label}: disallowed tags {parser.bad}")
    text = " ".join(parser.parts)
    if raw.count("<p>") < 4:
        errors.append(f"{label}: too few paragraphs to read")
    if len(text.split()) < 80:
        errors.append(f"{label}: extracted text is too short to be a full work")


def check_link(url: str) -> str | None:
    req = urllib.request.Request(url, headers=UA, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=25) as res:
            if res.status >= 400:
                return f"HTTP {res.status}"
            return None
    except urllib.error.HTTPError as e:
        # A DOI that redirects is a working link even if the publisher blocks the final fetch.
        if "doi.org" in url and e.code in {301, 302, 303, 307, 308, 401, 403, 429}:
            return None
        if e.code in {301, 302, 303, 307, 308}:
            return None
        return f"HTTP {e.code}"
    except Exception as e:
        return type(e).__name__


def main():
    errors = []
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    cards = data["cards"]
    if len(cards) != 62:
        errors.append(f"expected 62 cards, found {len(cards)}")
    app = APP.read_text(encoding="utf-8")
    sw = SW.read_text(encoding="utf-8")
    if "const KEY = 'folio.v1'" not in app:
        errors.append("localStorage key folio.v1 was changed")
    if "folio-v1.2.0" not in sw:
        errors.append("service worker cache was not bumped to folio-v1.2.0")
    if "texts/" in sw.split("SHELL", 1)[-1].split("];", 1)[0]:
        errors.append("full texts must not be precached; they are lazy-loaded")

    seen_files = {}
    link_jobs = []
    for card in cards:
        cid = card["id"]
        if "readings" in card:
            errors.append(f"{cid}: old readings field should be replaced")
        if "goDeeper" not in card or "furtherReading" not in card:
            errors.append(f"{cid}: missing goDeeper or furtherReading")
            continue
        if not card["furtherReading"]:
            errors.append(f"{cid}: further reading is empty")
        for w in card["goDeeper"]:
            for field in ("id", "title", "authors", "year", "venue", "license", "licenseName", "licenseUrl", "attribution", "sourceUrl", "file"):
                if not w.get(field) and w.get(field) != 0:
                    errors.append(f"{cid}/{w.get('id')}: missing {field}")
            if w.get("license") not in ALLOWED:
                errors.append(f"{cid}/{w.get('id')}: license {w.get('license')} is not allowed")
            if w.get("license") != "public-domain" and not str(w.get("licenseUrl", "")).startswith("https://creativecommons.org/"):
                errors.append(f"{cid}/{w.get('id')}: CC work needs a creativecommons.org license URL")
            if "gutenberg.org" in w.get("sourceUrl", "") and w.get("license") != "public-domain":
                errors.append(f"{cid}/{w.get('id')}: Gutenberg text should be public-domain")
            path = ROOT / w["file"]
            if w["id"] in seen_files and seen_files[w["id"]] != w["file"]:
                errors.append(f"{w['id']}: file path changed between cards")
            seen_files[w["id"]] = w["file"]
            check_html(path, errors, f"{cid}/{w['id']}")
            if w["authors"].split()[-1].lower() not in w["attribution"].lower() and w["authors"].split()[0].lower() not in w["attribution"].lower():
                errors.append(f"{cid}/{w['id']}: attribution does not name the author")
            link_jobs.append((f"{cid} goDeeper {w['id']}", w["sourceUrl"]))
            link_jobs.append((f"{cid} license {w['id']}", w["licenseUrl"]))
        for i, r in enumerate(card["furtherReading"]):
            for field in ("title", "author", "year", "note", "url"):
                if not r.get(field) and r.get(field) != 0:
                    errors.append(f"{cid} further[{i}]: missing {field}")
            note = r.get("note") or ""
            if len(note) < 20:
                errors.append(f"{cid} further[{i}]: note too short")
            if not str(r.get("url", "")).startswith("http"):
                errors.append(f"{cid} further[{i}]: url must be http(s)")
            link_jobs.append((f"{cid} further {r.get('title','')[:40]}", r.get("url", "")))

    # Unique link checks.
    checked = {}
    print(f"Checking {len({u for _, u in link_jobs})} unique links...", flush=True)
    for label, url in link_jobs:
        if not url or url in checked:
            if url in checked and checked[url]:
                errors.append(f"{label}: {checked[url]} ({url})")
            continue
        problem = check_link(url)
        checked[url] = problem
        if problem:
            errors.append(f"{label}: {problem} ({url})")
            print(" FAIL", url, problem, flush=True)
        else:
            print(" ok", url[:80], flush=True)

    works = len(seen_files)
    with_deeper = sum(1 for c in cards if c.get("goDeeper"))
    further_n = sum(len(c.get("furtherReading") or []) for c in cards)
    print(f"cards with Go deeper: {with_deeper}/{len(cards)}")
    print(f"readable works: {works}")
    print(f"further reading entries: {further_n}")
    print("no Go deeper:", ", ".join(c["id"] for c in cards if not c.get("goDeeper")))
    if errors:
        print(f"\n{len(errors)} problems", file=sys.stderr)
        for e in errors[:80]:
            print(" -", e, file=sys.stderr)
        sys.exit(1)
    print("verify ok")


if __name__ == "__main__":
    main()
