#!/usr/bin/env python3
"""Download redistributable full texts and attach them to cards.

Only Project Gutenberg ebooks whose own license grants copying, and Europe PMC
full texts whose XML states a CC BY, CC BY-SA, or CC0 license. Anything else
stays in further reading.
"""
from __future__ import annotations

import html
import json
import re
import time
import urllib.request
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
CARDS = ROOT / "data" / "cards.json"
TEXTS = ROOT / "texts"
MEDIA = TEXTS / "media"
UA = {"User-Agent": "Mozilla/5.0 (compatible; FolioBot/1.0; educational archive)"}

# Gutenberg ebook id, stable bibliographic facts checked against the file header.
PG = {
    "gibbon-v1": (731, "Edward Gibbon", 1776, "The History of the Decline and Fall of the Roman Empire, Volume 1", "London: W. Strahan and T. Cadell"),
    "augustine-confessions": (3296, "Augustine of Hippo, translated by E. B. Pusey", 397, "The Confessions of St. Augustine", "Translation by E. B. Pusey"),
    "ammianus": (28587, "Ammianus Marcellinus, translated by C. D. Yonge", 390, "The Roman History of Ammianus Marcellinus", "Translation by Charles Duke Yonge"),
    "columbus-letters": (77820, "Christopher Columbus, edited by R. H. Major", 1493, "Select Letters of Christopher Columbus", "Hakluyt Society edition, edited by Richard Henry Major"),
    "rousseau-inequality": (11136, "Jean-Jacques Rousseau", 1755, "A Discourse Upon the Origin and the Foundation of the Inequality Among Mankind", "Eighteenth-century English translation"),
    "decameron": (23700, "Giovanni Boccaccio, translated by John Payne", 1353, "The Decameron", "Translation by John Payne"),
    "tocqueville-democracy-1": (815, "Alexis de Tocqueville, translated by Henry Reeve", 1835, "Democracy in America, Volume 1", "Translation by Henry Reeve"),
    "smith-wealth": (3300, "Adam Smith", 1776, "An Inquiry into the Nature and Causes of the Wealth of Nations", "London: W. Strahan and T. Cadell"),
    "aristotle-poetics": (1974, "Aristotle, translated by S. H. Butcher", -335, "The Poetics", "Translation by S. H. Butcher"),
    "freytag-technik": (50616, "Gustav Freytag", 1863, "Die Technik des Dramas", "German original"),
    "homer-odyssey": (1727, "Homer, translated by Samuel Butler", -700, "The Odyssey", "Translation by Samuel Butler"),
    "grimm-tales": (2591, "Jacob Grimm and Wilhelm Grimm, translated by Edgar Taylor and Marian Edwardes", 1812, "Grimms' Fairy Tales", "Translations by Edgar Taylor and Marian Edwardes"),
    "austen-emma": (158, "Jane Austen", 1815, "Emma", "London: John Murray"),
    "chekhov-seagull": (1754, "Anton Chekhov", 1896, "The Sea-Gull", "English translation, Project Gutenberg ebook 1754"),
    "james-screw": (209, "Henry James", 1898, "The Turn of the Screw", "London: William Heinemann"),
    "dostoevsky-underground": (600, "Fyodor Dostoevsky", 1864, "Notes from the Underground", "English translation, Project Gutenberg ebook 600"),
    "dickens-copperfield": (766, "Charles Dickens", 1850, "David Copperfield", "London: Bradbury & Evans"),
    "defoe-crusoe": (521, "Daniel Defoe", 1719, "The Life and Adventures of Robinson Crusoe", "London: W. Taylor"),
    "james-principles": (57628, "William James", 1890, "The Principles of Psychology, Volume 1", "New York: Henry Holt"),
    "woolf-dalloway": (71865, "Virginia Woolf", 1925, "Mrs. Dalloway", "London: Hogarth Press"),
    "joyce-ulysses": (4300, "James Joyce", 1922, "Ulysses", "Paris: Shakespeare and Company"),
    "shakespeare-hamlet": (1524, "William Shakespeare", 1603, "Hamlet", "First Quarto era text, Project Gutenberg ebook 1524"),
}

# Europe PMC full texts. Included only if the XML license is CC BY, CC BY-SA, or CC0.
PMC = {
    "kaniewski-2013": "PMC3743901",
    "ioannidis-2005": "PMC1182327",
    "yeager-2019": "PMC6786290",
    "saposnik-2016": "PMC5093937",
    "ml3-ego-2018": "PMC6124090",
    "plos-ego-2016": "PMC4749338",
}

CARD_WORKS = {
    "gibbon-decline": ["gibbon-v1"],
    "brown-late-antiquity": ["augustine-confessions"],
    "heather-huns": ["ammianus"],
    "columbian-exchange": ["columbus-letters"],
    "scheidel-leveler": ["rousseau-inequality", "decameron"],
    "tocqueville-paradox": ["tocqueville-democracy-1"],
    "acemoglu-institutions": ["smith-wealth"],
    "pomeranz-divergence": ["smith-wealth"],
    "aristotle-poetics": ["aristotle-poetics"],
    "freytag-shapes": ["freytag-technik"],
    "hero-journey": ["homer-odyssey"],
    "propp-functions": ["grimm-tales"],
    "free-indirect": ["austen-emma"],
    "chekhov-gun": ["chekhov-seagull"],
    "unreliable-narrator": ["james-screw"],
    "bakhtin-polyphony": ["dostoevsky-underground"],
    "flat-round": ["dickens-copperfield"],
    "rise-novel": ["defoe-crusoe"],
    "stream-of-consciousness": ["james-principles", "woolf-dalloway", "joyce-ulysses"],
    "objective-correlative": ["shakespeare-hamlet"],
    "bronze-age-collapse": ["kaniewski-2013"],
    "replication-crisis": ["ioannidis-2005"],
    "growth-mindset": ["yeager-2019"],
    "anchoring": ["saposnik-2016"],
    "availability": ["saposnik-2016"],
    "ego-depletion": ["ml3-ego-2018", "plos-ego-2016"],
}

ALLOWED_CC = ("creativecommons.org/licenses/by/", "creativecommons.org/licenses/by-sa/", "creativecommons.org/publicdomain/zero/")


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=90) as res:
        return res.read()


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def pg_to_html(raw: str) -> str:
    raw = raw.lstrip("\ufeff")
    start = re.search(r"\*\*\* START OF THE PROJECT GUTENBERG EBOOK .*?\*\*\*", raw)
    end = re.search(r"\*\*\* END OF THE PROJECT GUTENBERG EBOOK .*?\*\*\*", raw)
    if not start or not end:
        raise SystemExit("Project Gutenberg markers missing")
    body = raw[start.end():end.start()].strip()
    license_txt = raw[end.end():].strip()
    parts = ['<article class="work-doc">']
    buf: list[str] = []

    def flush():
        text = " ".join(x.strip() for x in buf if x.strip())
        buf.clear()
        if not text:
            return
        if text.startswith("[") and text.endswith("]") and len(text) < 80:
            return
        parts.append(f"<p>{esc(text)}</p>")

    for line in body.splitlines():
        s = line.strip()
        if not s:
            flush()
            continue
        if re.fullmatch(r"\d{1,4}", s):
            continue
        if re.match(r"^(CHAPTER|BOOK|PART|ACT|SCENE|VOLUME|STAVE|CANTO|LETTER|PREFACE|INTRODUCTION|CONTENTS)\b", s, re.I) or (s.isupper() and 3 < len(s) < 70 and not s.endswith(".")):
            flush()
            parts.append(f"<h2>{esc(s.title() if s.isupper() and len(s) > 12 else s)}</h2>")
            continue
        buf.append(s)
    flush()
    if license_txt:
        parts.append('<section class="work-license"><h2>Project Gutenberg license</h2>')
        for para in re.split(r"\n\s*\n", license_txt):
            t = " ".join(para.split())
            if t:
                parts.append(f"<p>{esc(t)}</p>")
        parts.append("</section>")
    parts.append("</article>")
    html_doc = "\n".join(parts)
    if html_doc.count("<p>") < 8:
        raise SystemExit("too little prose extracted")
    return html_doc


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def xml_text(el) -> str:
    chunks = []
    if el.text:
        chunks.append(el.text)
    for child in el:
        name = local(child.tag)
        if name in {"xref", "ext-link"}:
            if child.text:
                chunks.append(child.text)
        elif name == "italic":
            chunks.append(child.text or "")
        else:
            chunks.append(xml_text(child))
        if child.tail:
            chunks.append(child.tail)
    return re.sub(r"\s+", " ", "".join(chunks)).strip()


def pmc_license(root) -> tuple[str, str] | None:
    blobs = []
    for el in root.iter():
        if local(el.tag) not in {"license", "license-p"}:
            continue
        hrefs = " ".join(v for k, v in el.attrib.items() if k.endswith("href"))
        blobs.append(hrefs + " " + xml_text(el))
    blob = " ".join(blobs)
    low = blob.lower()
    if not low.strip():
        return None
    if any(s in low for s in ("noncommercial", "non-commercial", "noderivative", "no derivative", "-nc", "-nd", "/by-nc", "/by-nd")):
        return None
    href = ""
    m = re.search(r"https?://creativecommons.org/licenses/[a-z0-9./-]+", blob, re.I)
    if m:
        href = m.group(0).rstrip(").,")
    if "licenses/by-sa" in low or "attribution-sharealike" in low:
        m = re.search(r"https?://creativecommons.org/licenses/by-sa/[0-9.]+/?", blob, re.I)
        return "cc-by-sa", (m.group(0) if m else "https://creativecommons.org/licenses/by-sa/4.0/")
    if "licenses/by/" in low or "creative commons attribution" in low:
        m = re.search(r"https?://creativecommons.org/licenses/by/[0-9.]+/?", blob, re.I)
        version = "4.0" if "4.0" in low else "3.0"
        return "cc-by", (m.group(0) if m else f"https://creativecommons.org/licenses/by/{version}/")
    if "publicdomain/zero" in low or re.search(r"\bcc0\b", low):
        return "cc0", href or "https://creativecommons.org/publicdomain/zero/1.0/"
    return None


def pmc_to_html(pmcid: str, xml: bytes) -> tuple[str, dict]:
    root = ET.fromstring(xml)
    parsed = pmc_license(root)
    if not parsed:
        raise SystemExit(f"{pmcid} license not redistributable")
    lic, license_url = parsed
    title = ""
    journal = ""
    year = None
    authors = []
    for el in root.iter():
        name = local(el.tag)
        if name == "article-title" and not title:
            title = xml_text(el)
        elif name == "journal-title" and not journal:
            journal = xml_text(el)
        elif name == "year" and year is None and el.text and el.text.strip().isdigit():
            year = int(el.text.strip())
        elif name == "contrib":
            ctype = el.attrib.get("contrib-type", "")
            if ctype and ctype != "author":
                continue
            surname = given = ""
            for ch in el.iter():
                if local(ch.tag) == "surname" and not surname:
                    surname = (ch.text or "").strip()
                elif local(ch.tag) == "given-names" and not given:
                    given = (ch.text or "").strip()
            if surname:
                authors.append((given + " " + surname).strip())
    if len(authors) > 6:
        author_s = ", ".join(authors[:6]) + " et al."
    elif authors:
        author_s = ", ".join(authors)
    else:
        author_s = "Unknown"
    pass
    parts = ['<article class="work-doc">']
    body = None
    for el in root.iter():
        if local(el.tag) == "body":
            body = el
            break
    if body is None:
        raise SystemExit(f"{pmcid} has no body")
    fig_n = 0

    def walk(el, depth=2):
        nonlocal fig_n
        name = local(el.tag)
        if name in {"sec", "abstract"}:
            heading = ""
            for ch in list(el):
                if local(ch.tag) == "title":
                    heading = xml_text(ch)
                    break
            if heading and name == "sec":
                tag = "h2" if depth <= 2 else "h3"
                parts.append(f"<{tag}>{esc(heading)}</{tag}>")
            for ch in list(el):
                if local(ch.tag) != "title":
                    walk(ch, depth + 1)
            return
        if name == "p":
            t = xml_text(el)
            if t:
                parts.append(f"<p>{esc(t)}</p>")
            return
        if name == "title":
            return
        if name in {"fig", "fig-group"}:
            if fig_n >= 6:
                return
            caption = ""
            href = ""
            for ch in el.iter():
                if local(ch.tag) == "caption" and not caption:
                    caption = xml_text(ch)
                if local(ch.tag) == "graphic" and not href:
                    for k, v in ch.attrib.items():
                        if k.endswith("href"):
                            href = v
            fig_n += 1
            parts.append("<figure>")
            if href:
                src = save_fig(pmcid, href, fig_n)
                if src:
                    parts.append(f'<img src="{esc(src)}" alt="">')
            if caption:
                parts.append(f"<figcaption>{esc(caption)}</figcaption>")
            parts.append("</figure>")
            return
        if name in {"list", "def-list"}:
            parts.append("<ul>")
            for ch in el.iter():
                if local(ch.tag) in {"list-item", "def-item"}:
                    t = xml_text(ch)
                    if t:
                        parts.append(f"<li>{esc(t)}</li>")
            parts.append("</ul>")
            return
        for ch in list(el):
            walk(ch, depth)

    # Abstract first, if outside body.
    for el in root.iter():
        if local(el.tag) == "abstract":
            parts.append("<h2>Abstract</h2>")
            walk(el)
            break
    walk(body)
    parts.append("</article>")
    doc = "\n".join(parts)
    if doc.count("<p>") < 4:
        raise SystemExit(f"{pmcid} extracted too little prose")
    meta = {
        "title": title,
        "authors": author_s,
        "year": year or 0,
        "venue": journal or "Open-access journal",
        "license": lic,
        "licenseUrl": license_url,
        "sourceUrl": f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/",
    }
    return doc, meta


def save_fig(pmcid: str, href: str, n: int) -> str | None:
    if href.startswith("http"):
        url = href
    else:
        url = f"https://europepmc.org/articles/{pmcid}/bin/{href.split('/')[-1]}"
    ext = ".jpg"
    for cand in (".jpg", ".jpeg", ".png", ".gif", ".tif"):
        if href.lower().endswith(cand):
            ext = ".jpg" if cand == ".jpeg" else cand
            break
    dest_dir = MEDIA / pmcid
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / f"fig{n}{ext if ext != '.tif' else '.jpg'}"
    try:
        data = fetch(url)
    except Exception:
        try:
            data = fetch(f"https://www.ncbi.nlm.nih.gov/pmc/articles/{pmcid}/bin/{href.split('/')[-1]}")
        except Exception:
            return None
    if len(data) < 500 or len(data) > 4_000_000:
        return None
    if data[:4] == b"\x89PNG":
        dest = dest.with_suffix(".png")
    elif data[:2] == b"\xff\xd8":
        dest = dest.with_suffix(".jpg")
    elif data[:4] == b"GIF8":
        dest = dest.with_suffix(".gif")
    else:
        return None
    dest.write_bytes(data)
    return f"media/{pmcid}/{dest.name}"


def sentences(text: str) -> list[str]:
    bits = re.findall(r"[^.!?]+[.!?]+(?:\s|$)", text.replace("\n", " "))
    return [b.strip() for b in bits if b.strip()]


def note_for(card: dict, author: str, title: str, is_source: bool) -> str:
    blob = card["summary"] + " " + card.get("deepDive", "")
    author_keys = []
    for part in re.split(r",|&| and ", author):
        words = [w.strip(".") for w in part.split() if w.strip(".").lower() not in {"the", "al", "et", "a", "of"}]
        if words:
            author_keys.append(words[-1])
    hits = []
    for s in sentences(blob):
        low = s.lower()
        if any(re.search(rf"\b{re.escape(k.lower())}\b", low) for k in author_keys if len(k) > 2):
            hits.append(s)
    if hits:
        return hits[0].strip()
    if is_source:
        first = sentences(card["summary"])
        return (first[0] if first else card["summary"][:240]).strip()
    return f"Takes up the same question as this idea."


def tokens(s: str) -> set[str]:
    return {t for t in re.sub(r"[^a-z0-9]+", " ", s.lower()).split() if len(t) > 3}


def same_work(a: str, b: str) -> bool:
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb:
        return False
    small, big = (ta, tb) if len(ta) <= len(tb) else (tb, ta)
    return len(small & big) / len(small) >= 0.8


def further_items(card: dict, works: list[dict]) -> list[dict]:
    deeper_urls = set()
    for w in works:
        deeper_urls.add(w["sourceUrl"])
        gid = w["sourceUrl"].rstrip("/").split("/")[-1]
        if gid.isdigit():
            deeper_urls.add(f"https://www.gutenberg.org/ebooks/{gid}")
    items = []
    seen = set()

    def add(title, author, year, url, is_source, allow_wiki=False):
        if not url:
            return
        if "wikipedia.org" in url and not allow_wiki:
            return
        if url in deeper_urls or url in seen or any(same_work(title, w["title"]) for w in works):
            return
        seen.add(url)
        items.append({
            "title": title,
            "author": author,
            "year": year,
            "note": note_for(card, author, title, is_source),
            "url": url,
        })

    src = card["source"]
    add(src["title"], src["author"], src["year"], src["url"], True, allow_wiki=True)
    for r in card.get("readings") or []:
        add(r["title"], r["author"], r["year"], r["url"], False, allow_wiki=True)
    return items


def main():
    TEXTS.mkdir(parents=True, exist_ok=True)
    catalog = {}
    for wid, (gid, authors, year, title, venue) in PG.items():
        print("PG", wid, gid, flush=True)
        dest = TEXTS / f"{wid}.html"
        if dest.exists() and "you may copy it" in dest.read_text(encoding="utf-8").lower():
            catalog[wid] = {
                "id": wid,
                "title": title,
                "authors": authors,
                "year": year,
                "venue": venue,
                "license": "public-domain",
                "licenseName": "Public domain",
                "licenseUrl": "https://www.gutenberg.org/policy/license.html",
                "attribution": f"{authors}. {title}. Project Gutenberg ebook {gid}. The Project Gutenberg license in the text permits copying.",
                "sourceUrl": f"https://www.gutenberg.org/ebooks/{gid}",
                "file": f"texts/{wid}.html",
            }
            continue
        raw = fetch(f"https://www.gutenberg.org/cache/epub/{gid}/pg{gid}.txt").decode("utf-8", "replace")
        if "PROJECT GUTENBERG" not in raw.upper():
            raise SystemExit(f"{wid} is not a Project Gutenberg file")
        if "you may copy it" not in raw.lower():
            raise SystemExit(f"{wid} missing Gutenberg copy permission")
        doc = pg_to_html(raw)
        (TEXTS / f"{wid}.html").write_text(doc, encoding="utf-8")
        catalog[wid] = {
            "id": wid,
            "title": title,
            "authors": authors,
            "year": year,
            "venue": venue,
            "license": "public-domain",
            "licenseName": "Public domain",
            "licenseUrl": "https://www.gutenberg.org/policy/license.html",
            "attribution": f"{authors}. {title}. Project Gutenberg ebook {gid}. The Project Gutenberg license in the text permits copying.",
            "sourceUrl": f"https://www.gutenberg.org/ebooks/{gid}",
            "file": f"texts/{wid}.html",
        }
        time.sleep(0.4)

    for wid, pmcid in PMC.items():
        print("PMC", wid, pmcid, flush=True)
        dest = TEXTS / f"{wid}.html"
        if dest.exists() and dest.stat().st_size > 2000 and wid in catalog:
            continue
        if dest.exists() and dest.stat().st_size > 2000:
            # Metadata is filled below from the XML; reuse the file but still read the license.
            pass
        xml = fetch(f"https://www.ebi.ac.uk/europepmc/webservices/rest/{pmcid}/fullTextXML")
        doc, meta = pmc_to_html(pmcid, xml)
        (TEXTS / f"{wid}.html").write_text(doc, encoding="utf-8")
        names = {
            "cc-by": "Creative Commons Attribution 4.0",
            "cc-by-sa": "Creative Commons Attribution-ShareAlike 4.0",
            "cc0": "CC0 1.0",
        }
        catalog[wid] = {
            "id": wid,
            "title": meta["title"],
            "authors": meta["authors"],
            "year": meta["year"],
            "venue": meta["venue"],
            "license": meta["license"],
            "licenseName": names[meta["license"]],
            "licenseUrl": meta["licenseUrl"],
            "attribution": f"{meta['authors']} ({meta['year']}). {meta['title']}. {meta['venue']}. {names[meta['license']]}.",
            "sourceUrl": meta["sourceUrl"],
            "file": f"texts/{wid}.html",
        }
        time.sleep(0.4)

    # Drop ego-depletion extras if a download failed; CARD_WORKS only lists ids we attempted.
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    for card in data["cards"]:
        works = []
        for wid in CARD_WORKS.get(card["id"], []):
            if wid not in catalog:
                raise SystemExit(f"missing work {wid}")
            works.append(catalog[wid])
        card["goDeeper"] = works
        card["furtherReading"] = further_items(card, works)
        card.pop("readings", None)
    CARDS.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    (ROOT / "content" / "works.json").write_text(json.dumps(list(catalog.values()), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    n_cards = sum(1 for c in data["cards"] if c["goDeeper"])
    n_works = len({w["id"] for c in data["cards"] for w in c["goDeeper"]})
    n_further = sum(len(c["furtherReading"]) for c in data["cards"])
    none = [c["id"] for c in data["cards"] if not c["goDeeper"]]
    print(f"cards with go deeper: {n_cards}")
    print(f"works: {n_works}")
    print(f"further: {n_further}")
    print("no go deeper:", ", ".join(none))


if __name__ == "__main__":
    main()
