#!/usr/bin/env python3
"""Attach Go deeper works whose summaries clear 1000 words. Drop the rest."""
from __future__ import annotations

import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "data" / "cards.json"
OUT = ROOT / "summaries"
MIN_WORDS = 1000


class Extractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data):
        self.parts.append(data)


def nwords(path: Path) -> int:
    parser = Extractor()
    parser.feed(path.read_text(encoding="utf-8"))
    return len(re.sub(r"\s+", " ", " ".join(parser.parts)).split())


def norm(s: str) -> str:
    s = s.lower()
    for junk in ("volume 1", "vol. 1", "(free e-text)", "free e-text"):
        s = s.replace(junk, "")
    s = re.sub(r"[^a-z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def slug(title: str, year) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", norm(title)).strip("-")[:50].strip("-")
    return f"{s}-{year}"


def wiki(author: str, title: str) -> bool:
    return author == "Wikipedia" or str(title).startswith("Wikipedia")


def main() -> None:
    ready = {}
    if OUT.exists():
        for path in OUT.glob("*.html"):
            n = nwords(path)
            if n >= MIN_WORDS:
                ready[path.stem] = n
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    for card in data["cards"]:
        pool = []
        src = card["source"]
        pool.append({
            "title": src["title"], "authors": src["author"], "year": src["year"],
            "url": src["url"], "type": "paper" if "doi.org" in src["url"] else "book",
        })
        for r in card.get("furtherReading") or []:
            if wiki(r["author"], r["title"]):
                continue
            pool.append({
                "title": r["title"], "authors": r["author"], "year": r["year"],
                "url": r["url"], "type": "paper" if "doi.org" in r["url"] else "book",
            })
        for w in card.get("goDeeper") or []:
            if w.get("id") == "saposnik-2016" or w.get("license") == "public-domain":
                continue
            if w.get("file", "").startswith("summaries/"):
                pool.append({
                    "title": w["title"], "authors": w["authors"], "year": w["year"],
                    "url": w["sourceUrl"], "type": w.get("type", "paper"),
                })
            elif w.get("license") not in (None, "public-domain"):
                pool.append({
                    "title": w["title"], "authors": w["authors"], "year": w["year"],
                    "url": w.get("sourceUrl") or w.get("url"),
                    "type": "paper",
                })
        if card["id"] == "stream-of-consciousness":
            pool += [
                {"title": "Mrs Dalloway", "authors": "Virginia Woolf", "year": 1925,
                 "url": "https://en.wikipedia.org/wiki/Mrs_Dalloway", "type": "book"},
                {"title": "Ulysses", "authors": "James Joyce", "year": 1922,
                 "url": "https://www.gutenberg.org/ebooks/4300", "type": "book"},
            ]
        seen = set()
        chosen = []
        for item in pool:
            wid = slug(item["title"], item["year"])
            if wid in seen or wid not in ready:
                continue
            title_key = norm(item["title"])
            if any(norm(x["title"]) == title_key for x in chosen):
                continue
            seen.add(wid)
            chosen.append({
                "id": wid,
                "title": item["title"],
                "authors": item["authors"],
                "year": item["year"],
                "type": item["type"],
                "file": f"summaries/{wid}.html",
                "sourceUrl": item["url"],
            })
            if len(chosen) == 5:
                break
        card["goDeeper"] = chosen
        card.pop("furtherReading", None)
    CARDS.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    n_cards = sum(1 for c in data["cards"] if c["goDeeper"])
    ids = {w["id"] for c in data["cards"] for w in c["goDeeper"]}
    print(f"ready files {len(ready)}; cards with works {n_cards}; listed works {len(ids)}")
    empty = [c["id"] for c in data["cards"] if not c["goDeeper"]]
    if empty:
        print("empty:", ", ".join(empty))


if __name__ == "__main__":
    main()
